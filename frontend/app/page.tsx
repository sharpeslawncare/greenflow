"use client";

import Link from "next/link";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";
import { useProgrammeStore } from "@/components/programme-store";
import { useTreatmentStore } from "@/components/treatment-store";

type StockProduct = {
  id: string;
  name: string;
  currentQuantity: number;
  reorderLevel: number;
  unit: string;
  active: boolean;
};

type StockData = {
  products: StockProduct[];
};

type CommunicationRecord = {
  id: string;
  status: "Queued" | "Sent" | "Failed" | "Cancelled";
};

type CommunicationsData = {
  records: CommunicationRecord[];
};

const STOCK_STORAGE_KEY = "greenflow-stock-v1";
const COMMUNICATIONS_STORAGE_KEY =
  "greenflow-communications-v1";

export default function DashboardPage() {
  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    programmes,
    ready: programmesReady,
  } = useProgrammeStore();

  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const [stockData, setStockData] =
    useState<StockData>({
      products: [],
    });

  const [
    communicationsData,
    setCommunicationsData,
  ] = useState<CommunicationsData>({
    records: [],
  });

  const [selectedDate, setSelectedDate] =
    useState("");

  useEffect(() => {
    loadLocalModules();

    function refreshLocalModules() {
      loadLocalModules();
    }

    window.addEventListener(
      "focus",
      refreshLocalModules,
    );

    window.addEventListener(
      "storage",
      refreshLocalModules,
    );

    return () => {
      window.removeEventListener(
        "focus",
        refreshLocalModules,
      );

      window.removeEventListener(
        "storage",
        refreshLocalModules,
      );
    };
  }, []);

  function loadLocalModules() {
    const savedStock =
      window.localStorage.getItem(
        STOCK_STORAGE_KEY,
      );

    if (savedStock) {
      try {
        const parsedStock = JSON.parse(
          savedStock,
        ) as StockData;

        if (
          Array.isArray(
            parsedStock.products,
          )
        ) {
          setStockData(parsedStock);
        }
      } catch {
        setStockData({
          products: [],
        });
      }
    }

    const savedCommunications =
      window.localStorage.getItem(
        COMMUNICATIONS_STORAGE_KEY,
      );

    if (savedCommunications) {
      try {
        const parsedCommunications =
          JSON.parse(
            savedCommunications,
          ) as CommunicationsData;

        if (
          Array.isArray(
            parsedCommunications.records,
          )
        ) {
          setCommunicationsData(
            parsedCommunications,
          );
        }
      } catch {
        setCommunicationsData({
          records: [],
        });
      }
    }
  }

  const activeCustomers = useMemo(
    () =>
      customers.filter(
        (customer) =>
          customer.status === "Active",
      ),
    [customers],
  );

  const availableDates = useMemo(() => {
    return Array.from(
      new Set(
        programmes.flatMap(
          (programme) =>
            programme.visits
              .filter(
                (visit) =>
                  visit.status ===
                    "Scheduled" ||
                  visit.status ===
                    "Planned",
              )
              .map(
                (visit) =>
                  visit.scheduledDate,
              ),
        ),
      ),
    ).sort();
  }, [programmes]);

  useEffect(() => {
    if (
      selectedDate ||
      availableDates.length === 0
    ) {
      return;
    }

    const today = toDateValue(
      new Date(),
    );

    const nextAvailableDate =
      availableDates.find(
        (date) => date >= today,
      ) ?? availableDates[0];

    setSelectedDate(
      nextAvailableDate,
    );
  }, [
    availableDates,
    selectedDate,
  ]);

  const scheduledVisits = useMemo(() => {
    if (!selectedDate) return [];

    return programmes.flatMap(
      (programme) =>
        programme.visits
          .filter(
            (visit) =>
              visit.scheduledDate ===
                selectedDate &&
              (visit.status ===
                "Scheduled" ||
                visit.status ===
                  "Planned"),
          )
          .map((visit) => ({
            programme,
            visit,
            customer:
              customers.find(
                (customer) =>
                  customer.customerNumber ===
                  programme.customerNumber,
              ),
          }))
          .filter(
            (item) =>
              item.customer?.status ===
              "Active",
          ),
    );
  }, [
    programmes,
    customers,
    selectedDate,
  ]);

  const selectedDateTreatments =
    useMemo(() => {
      if (!selectedDate) return [];

      return treatments.filter(
        (treatment) =>
          treatment.completedDate ===
            selectedDate ||
          treatment.scheduledDate ===
            selectedDate,
      );
    }, [
      treatments,
      selectedDate,
    ]);

  const completedOnSelectedDate =
    selectedDateTreatments.filter(
      (treatment) =>
        treatment.status ===
        "Completed",
    ).length;

  const reschedulingRecords =
    treatments.filter(
      (treatment) =>
        treatment.status ===
        "Needs Rescheduling",
    );

  const totalScheduledArea =
    scheduledVisits.reduce(
      (total, item) =>
        total +
        (item.customer?.lawnSize ??
          0),
      0,
    );

  const expectedIncome =
    scheduledVisits.reduce(
      (total, item) =>
        total +
        (item.customer
          ?.treatmentPrice ?? 0),
      0,
    );

  const lockedGateCount =
    scheduledVisits.filter(
      (item) =>
        item.customer?.lockedGate,
    ).length;

  const lowStockProducts =
    stockData.products.filter(
      (product) =>
        product.active !== false &&
        product.currentQuantity <=
          product.reorderLevel,
    );

  const queuedMessages =
    communicationsData.records.filter(
      (record) =>
        record.status === "Queued",
    );

  const customerNumbersWithProgramme =
    useMemo(
      () =>
        new Set(
          programmes.map(
            (programme) =>
              programme.customerNumber,
          ),
        ),
      [programmes],
    );

  const customersWithoutProgramme =
    activeCustomers.filter(
      (customer) =>
        !customerNumbersWithProgramme.has(
          customer.customerNumber,
        ),
    );

  const recentTreatments = useMemo(
    () =>
      [...treatments]
        .sort(
          (first, second) =>
            new Date(
              second.recordedDate,
            ).getTime() -
            new Date(
              first.recordedDate,
            ).getTime(),
        )
        .slice(0, 5),
    [treatments],
  );

  const upcomingVisits = useMemo(() => {
    const today = toDateValue(
      new Date(),
    );

    return programmes
      .flatMap((programme) =>
        programme.visits
          .filter(
            (visit) =>
              visit.scheduledDate >=
                today &&
              (visit.status ===
                "Scheduled" ||
                visit.status ===
                  "Planned"),
          )
          .map((visit) => ({
            customerNumber:
              programme.customerNumber,
            treatmentName:
              visit.treatmentName,
            scheduledDate:
              visit.scheduledDate,
          })),
      )
      .sort((first, second) =>
        first.scheduledDate.localeCompare(
          second.scheduledDate,
        ),
      )
      .slice(0, 6);
  }, [programmes]);

  const totalAttentionItems =
    reschedulingRecords.length +
    lowStockProducts.length +
    customersWithoutProgramme.length +
    queuedMessages.length;

  const ready =
    customersReady &&
    programmesReady &&
    treatmentsReady;

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading GreenFlow dashboard...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1600px]">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#176b37]">
                Sharpes Lawn Care
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                Operations Dashboard
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Welcome back, Rob. Here is
                GreenFlow&apos;s current
                operational picture.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Field label="Working date">
                <select
                  value={selectedDate}
                  onChange={(event) =>
                    setSelectedDate(
                      event.target.value,
                    )
                  }
                  className="min-w-[260px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-[#338b45] focus:ring-4 focus:ring-green-100"
                >
                  {availableDates.length ===
                  0 ? (
                    <option value="">
                      No scheduled dates
                    </option>
                  ) : (
                    availableDates.map(
                      (date) => (
                        <option
                          key={date}
                          value={date}
                        >
                          {formatDateWithDay(
                            date,
                          )}
                        </option>
                      ),
                    )
                  )}
                </select>
              </Field>

              <Link
                href="/jobs"
                className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#125b2f]"
              >
                Open Today&apos;s Jobs
              </Link>
            </div>
          </header>

          {availableDates.length === 0 && (
            <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              No scheduled programme dates
              are available. Create customer
              schedules in{" "}
              <Link
                href="/programmes"
                className="font-bold underline"
              >
                Annual Programmes
              </Link>
              .
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Scheduled jobs"
              value={String(
                scheduledVisits.length,
              )}
              detail={
                selectedDate
                  ? formatShortDate(
                      selectedDate,
                    )
                  : "No date selected"
              }
            />

            <MetricCard
              label="Completed"
              value={`${completedOnSelectedDate}/${scheduledVisits.length + completedOnSelectedDate}`}
              detail="Recorded on selected date"
            />

            <MetricCard
              label="Scheduled area"
              value={`${totalScheduledArea.toLocaleString(
                "en-GB",
              )} m²`}
              detail="Active customer lawns"
            />

            <MetricCard
              label="Expected income"
              value={`£${expectedIncome.toFixed(
                2,
              )}`}
              detail="Standard treatment prices"
            />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">
                    Scheduled work
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Customer programme visits
                    for the selected date.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <SummaryPill
                    label="Locked gates"
                    value={lockedGateCount}
                    warning={
                      lockedGateCount > 0
                    }
                  />

                  <SummaryPill
                    label="Vans"
                    value={
                      new Set(
                        scheduledVisits.map(
                          (item) =>
                            item.customer
                              ?.vanNumber,
                        ),
                      ).size
                    }
                  />
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[85px_1.2fr_1.6fr_1.2fr_85px_90px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>Number</span>
                  <span>Customer</span>
                  <span>Address</span>
                  <span>Treatment</span>
                  <span>Group</span>
                  <span>Price</span>
                </div>

                <div className="max-h-[340px] overflow-y-auto">
                  {scheduledVisits.length ===
                  0 ? (
                    <div className="p-10 text-center text-sm text-slate-500">
                      No active visits match
                      the selected date.
                    </div>
                  ) : (
                    scheduledVisits.map(
                      ({
                        programme,
                        visit,
                        customer,
                      }) => {
                        if (!customer) {
                          return null;
                        }

                        return (
                          <div
                            key={`${programme.id}-${visit.id}`}
                            className="grid grid-cols-[85px_1.2fr_1.6fr_1.2fr_85px_90px] items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm hover:bg-green-50/40"
                          >
                            <Link
                              href={`/customers/${customer.customerNumber}`}
                              className="font-bold text-[#176b37] hover:underline"
                            >
                              {
                                customer.customerNumber
                              }
                            </Link>

                            <div>
                              <div className="font-semibold">
                                {
                                  customer.fullName
                                }
                              </div>

                              <div className="mt-0.5 flex gap-2 text-xs">
                                {customer.lockedGate && (
                                  <span className="font-bold text-red-600">
                                    Locked gate
                                  </span>
                                )}

                                {customer.dogOnProperty && (
                                  <span className="font-bold text-amber-700">
                                    Dog
                                  </span>
                                )}
                              </div>
                            </div>

                            <span className="text-slate-600">
                              {customer.address},{" "}
                              {customer.postcode}
                            </span>

                            <span className="font-semibold">
                              {
                                visit.treatmentName
                              }
                            </span>

                            <span>
                              {
                                customer.groupNumber
                              }
                            </span>

                            <span className="font-bold">
                              £
                              {customer.treatmentPrice.toFixed(
                                2,
                              )}
                            </span>
                          </div>
                        );
                      },
                    )
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Link
                  href="/jobs"
                  className="rounded-xl border border-[#338b45] px-4 py-2.5 text-sm font-semibold text-[#176b37] hover:bg-green-50"
                >
                  Manage scheduled jobs
                </Link>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">
                    Requires attention
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Items GreenFlow has
                    identified for review.
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${
                    totalAttentionItems > 0
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {totalAttentionItems}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <AttentionItem
                  title="Visits need rescheduling"
                  count={
                    reschedulingRecords.length
                  }
                  href="/documents"
                  severity="warning"
                />

                <AttentionItem
                  title="Products at reorder level"
                  count={
                    lowStockProducts.length
                  }
                  href="/stock"
                  severity="danger"
                />

                <AttentionItem
                  title="Customers without programme"
                  count={
                    customersWithoutProgramme.length
                  }
                  href="/programmes"
                  severity="warning"
                />

                <AttentionItem
                  title="Queued reminders"
                  count={
                    queuedMessages.length
                  }
                  href="/communications"
                  severity="information"
                />
              </div>

              {totalAttentionItems === 0 && (
                <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                  There are currently no
                  outstanding operational
                  warnings.
                </div>
              )}
            </article>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-3">
            <DashboardPanel
              title="Upcoming visits"
              description="The next scheduled programme work."
              actionLabel="Annual programmes"
              actionHref="/programmes"
            >
              <div className="space-y-2">
                {upcomingVisits.length ===
                0 ? (
                  <EmptyState>
                    No upcoming visits are
                    currently scheduled.
                  </EmptyState>
                ) : (
                  upcomingVisits.map(
                    (item, index) => {
                      const customer =
                        customers.find(
                          (record) =>
                            record.customerNumber ===
                            item.customerNumber,
                        );

                      return (
                        <div
                          key={`${item.customerNumber}-${item.scheduledDate}-${index}`}
                          className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-3"
                        >
                          <div>
                            <div className="font-semibold">
                              {customer?.fullName ??
                                item.customerNumber}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {
                                item.treatmentName
                              }
                            </div>
                          </div>

                          <span className="whitespace-nowrap text-sm font-bold text-[#176b37]">
                            {formatShortDate(
                              item.scheduledDate,
                            )}
                          </span>
                        </div>
                      );
                    },
                  )
                )}
              </div>
            </DashboardPanel>

            <DashboardPanel
              title="Recent activity"
              description="Latest treatment records."
              actionLabel="View documents"
              actionHref="/documents"
            >
              <div className="space-y-2">
                {recentTreatments.length ===
                0 ? (
                  <EmptyState>
                    No treatment activity has
                    been recorded.
                  </EmptyState>
                ) : (
                  recentTreatments.map(
                    (treatment) => {
                      const customer =
                        customers.find(
                          (record) =>
                            record.customerNumber ===
                            treatment.customerNumber,
                        );

                      return (
                        <div
                          key={treatment.id}
                          className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-3"
                        >
                          <div>
                            <div className="font-semibold">
                              {customer?.fullName ??
                                treatment.customerNumber}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {
                                treatment.treatmentName
                              }
                            </div>
                          </div>

                          <TreatmentStatusBadge
                            status={
                              treatment.status
                            }
                          />
                        </div>
                      );
                    },
                  )
                )}
              </div>
            </DashboardPanel>

            <DashboardPanel
              title="Stock overview"
              description="Current products requiring attention."
              actionLabel="Open stock"
              actionHref="/stock"
            >
              <div className="space-y-2">
                {stockData.products.length ===
                0 ? (
                  <EmptyState>
                    Open Stock & Purchasing to
                    create or restore stock
                    records.
                  </EmptyState>
                ) : lowStockProducts.length ===
                  0 ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
                    All active products are
                    currently above their
                    reorder levels.
                  </div>
                ) : (
                  lowStockProducts.map(
                    (product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-3"
                      >
                        <div>
                          <div className="font-semibold text-red-900">
                            {product.name}
                          </div>

                          <div className="mt-1 text-xs text-red-700">
                            Reorder at{" "}
                            {
                              product.reorderLevel
                            }{" "}
                            {product.unit}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-red-900">
                            {
                              product.currentQuantity
                            }
                          </div>

                          <div className="text-xs text-red-700">
                            {product.unit}
                          </div>
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>
            </DashboardPanel>
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-bold">
                Quick actions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Open the GreenFlow workflows
                used most often.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <QuickAction
                label="Add customer"
                detail="Create a new record"
                href="/customers"
              />

              <QuickAction
                label="Today’s Jobs"
                detail="Complete scheduled work"
                href="/jobs"
              />

              <QuickAction
                label="Generate programme"
                detail="Create annual visits"
                href="/programmes"
              />

              <QuickAction
                label="Gate reminders"
                detail="Prepare communications"
                href="/communications"
              />

              <QuickAction
                label="Review stock"
                detail="Usage and purchasing"
                href="/stock"
              />

              <QuickAction
                label="Documents"
                detail="Invoices and reports"
                href="/documents"
              />
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function toDateValue(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
  );
}

function formatDateWithDay(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(parseDate(value));
}

function formatShortDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(parseDate(value));
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 h-1.5 w-10 rounded-full bg-[#338b45]" />

      <div className="text-sm font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </article>
  );
}

function SummaryPill({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
        warning
          ? "bg-red-100 text-red-700"
          : "bg-slate-100 text-slate-700"
      }`}
    >
      {label}: {value}
    </span>
  );
}

function AttentionItem({
  title,
  count,
  href,
  severity,
}: {
  title: string;
  count: number;
  href: string;
  severity:
    | "danger"
    | "warning"
    | "information";
}) {
  const styles =
    count === 0
      ? "border-slate-200 bg-slate-50 text-slate-500"
      : severity === "danger"
        ? "border-red-200 bg-red-50 text-red-900"
        : severity === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-blue-200 bg-blue-50 text-blue-900";

  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition hover:brightness-[0.98] ${styles}`}
    >
      <span className="text-sm font-semibold">
        {title}
      </span>

      <span className="text-xl font-bold">
        {count}
      </span>
    </Link>
  );
}

function DashboardPanel({
  title,
  description,
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>

        <Link
          href={actionHref}
          className="text-xs font-bold text-[#176b37] hover:underline"
        >
          {actionLabel}
        </Link>
      </div>

      <div className="mt-4">
        {children}
      </div>
    </article>
  );
}

function EmptyState({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

function TreatmentStatusBadge({
  status,
}: {
  status:
    | "Completed"
    | "Needs Rescheduling"
    | "Cancelled";
}) {
  const styles =
    status === "Completed"
      ? "bg-green-100 text-green-800"
      : status ===
          "Needs Rescheduling"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-700";

  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}
    >
      {status}
    </span>
  );
}

function QuickAction({
  label,
  detail,
  href,
}: {
  label: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 p-4 transition hover:border-[#338b45] hover:bg-green-50"
    >
      <div className="font-bold">
        {label}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </Link>
  );
}