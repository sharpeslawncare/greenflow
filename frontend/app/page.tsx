"use client";

import Link from "next/link";

import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  formatDateWithDay,
  getTodayDateValue,
  parseDate,
} from "@/lib/date-utils";

import { AppShell } from "@/components/app-shell";

import { useCustomerStore } from "@/components/customer-store";

import { useEnquiryStore } from "@/components/enquiry-store";

import { useProgrammeStore } from "@/components/programme-store";

import {
  type TreatmentStatus,
  useTreatmentStore,
} from "@/components/treatment-store";

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

  status:
    | "Queued"
    | "Sent"
    | "Failed"
    | "Cancelled";
};

type CommunicationsData = {
  records: CommunicationRecord[];
};

const STOCK_STORAGE_KEY =
  "greenflow-stock-v1";

const COMMUNICATIONS_STORAGE_KEY =
  "greenflow-communications-v1";

export default function DashboardPage() {
  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    enquiries,
    ready: enquiriesReady,
  } = useEnquiryStore();

  const {
    programmes,
    ready: programmesReady,
  } = useProgrammeStore();

  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const [
    stockData,
    setStockData,
  ] = useState<StockData>({
    products: [],
  });

  const [
    communicationsData,
    setCommunicationsData,
  ] = useState<CommunicationsData>({
    records: [],
  });

  const [
  selectedDate,
  setSelectedDate,
  ] = useState(() =>
  getTodayDateValue(),
  );

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
        const parsedStock =
          JSON.parse(
            savedStock,
          ) as StockData;

        if (
          Array.isArray(
            parsedStock.products,
          )
        ) {
          setStockData(
            parsedStock,
          );
        }
      } catch {
        setStockData({
          products: [],
        });
      }
    } else {
      setStockData({
        products: [],
      });
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
    } else {
      setCommunicationsData({
        records: [],
      });
    }
  }

  const activeCustomers =
    useMemo(
      () =>
        customers.filter(
          (customer) =>
            customer.status ===
            "Active",
        ),
      [customers],
    );

  const scheduledVisits =
    useMemo(() => {
      if (!selectedDate) {
        return [];
      }

      return programmes
        .flatMap((programme) =>
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
            })),
        )
        .filter(
          (item) =>
            item.customer?.status ===
            "Active",
        );
    }, [
      programmes,
      customers,
      selectedDate,
    ]);

  const selectedDateTreatments =
    useMemo(() => {
      if (!selectedDate) {
        return [];
      }

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

  const newEnquiries =
    enquiries.filter(
      (enquiry) =>
        enquiry.status ===
        "New Enquiry",
    );

  const arrangedSiteVisits =
    enquiries.filter(
      (enquiry) =>
        enquiry.status ===
        "Visit Arranged",
    );

  const outstandingQuotes =
    enquiries.filter(
      (enquiry) =>
        enquiry.quoteStatus ===
          "Draft" ||
        enquiry.quoteStatus ===
          "Presented",
    );

  const acceptedEnquiries =
    enquiries.filter(
      (enquiry) =>
        enquiry.status ===
          "Quote Accepted" &&
        !enquiry.convertedCustomerNumber,
    );

  const recentEnquiries =
    useMemo(
      () =>
        [...enquiries]
          .sort(
            (first, second) =>
              new Date(
                second.updatedAt,
              ).getTime() -
              new Date(
                first.updatedAt,
              ).getTime(),
          )
          .slice(0, 5),
      [enquiries],
    );

  const recentTreatments =
    useMemo(
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

  const upcomingVisits =
    useMemo(() => {
      const today =
        getTodayDateValue();

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

  const enquiryAttentionCount =
    newEnquiries.length +
    outstandingQuotes.length +
    acceptedEnquiries.length;

  const totalAttentionItems =
    reschedulingRecords.length +
    lowStockProducts.length +
    customersWithoutProgramme.length +
    queuedMessages.length +
    enquiryAttentionCount;

  const ready =
    customersReady &&
    enquiriesReady &&
    programmesReady &&
    treatmentsReady;

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading GreenFlow
            dashboard...
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
                Customers, enquiries,
                scheduled work and
                business activity in one
                place.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Field label="Working date">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) =>
                      setSelectedDate(
                        event.target.value,
                      )
                    }
                    className="min-w-[190px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-[#338b45] focus:ring-4 focus:ring-green-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDate(
                        getTodayDateValue(),
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Today
                  </button>
                </div>
              </Field>

              <Link
                href="/enquiries"
                className="rounded-xl border border-[#338b45] bg-white px-5 py-2.5 text-sm font-semibold text-[#176b37] transition hover:bg-green-50"
              >
                New Enquiry
              </Link>

              <Link
                href={`/jobs?date=${selectedDate}`}
                className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#125b2f]"
              >
                Open jobs for this date
              </Link>
            </div>
          </header>

          {scheduledVisits.length === 0 && (
            <section className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
              No jobs are scheduled for{" "}
              <strong>
                {formatDateWithDay(
                  selectedDate,
                )}
              </strong>
              . You can still review the rest of the
              dashboard or choose another calendar date.
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
              value={`${completedOnSelectedDate}/${
                scheduledVisits.length +
                completedOnSelectedDate
              }`}
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

          <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="New enquiries"
              value={String(
                newEnquiries.length,
              )}
              detail="Awaiting first action"
              accent="blue"
            />

            <MetricCard
              label="Site visits arranged"
              value={String(
                arrangedSiteVisits.length,
              )}
              detail="Measurements planned"
              accent="amber"
            />

            <MetricCard
              label="Quotes outstanding"
              value={String(
                outstandingQuotes.length,
              )}
              detail="Draft or presented"
              accent="blue"
            />

            <MetricCard
              label="Ready to convert"
              value={String(
                acceptedEnquiries.length,
              )}
              detail="Accepted enquiries"
              accent={
                acceptedEnquiries.length >
                0
                  ? "green"
                  : "default"
              }
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
                    Customer programme
                    visits for the selected
                    date.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <SummaryPill
                    label="Locked gates"
                    value={
                      lockedGateCount
                    }
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
                      No active visits
                      match the selected
                      date.
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
                              {
                                customer.address
                              }
                              ,{" "}
                              {
                                customer.postcode
                              }
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
                    totalAttentionItems >
                    0
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {totalAttentionItems}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <AttentionItem
                  title="New enquiries"
                  count={
                    newEnquiries.length
                  }
                  href="/enquiries"
                  severity="information"
                />

                <AttentionItem
                  title="Outstanding quotes"
                  count={
                    outstandingQuotes.length
                  }
                  href="/enquiries"
                  severity="warning"
                />

                <AttentionItem
                  title="Accepted quotes to convert"
                  count={
                    acceptedEnquiries.length
                  }
                  href="/enquiries"
                  severity="information"
                />

                <AttentionItem
                  title="Visits need rescheduling"
                  count={
                    reschedulingRecords.length
                  }
                  href="/jobs?view=reschedule"
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

              {totalAttentionItems ===
                0 && (
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
              title="Recent enquiries"
              description="Latest enquiry and quotation activity."
              actionLabel="Open enquiries"
              actionHref="/enquiries"
            >
              <div className="space-y-2">
                {recentEnquiries.length ===
                0 ? (
                  <EmptyState>
                    No enquiries have been
                    recorded.
                  </EmptyState>
                ) : (
                  recentEnquiries.map(
                    (enquiry) => (
                      <Link
                        key={enquiry.id}
                        href="/enquiries"
                        className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-3 transition hover:border-[#338b45] hover:bg-green-50"
                      >
                        <div>
                          <div className="font-semibold">
                            {enquiry.fullName ||
                              "Unnamed enquiry"}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {
                              enquiry.enquiryNumber
                            }{" "}
                            · {enquiry.source}
                          </div>
                        </div>

                        <EnquiryStatusBadge
                          status={
                            enquiry.status
                          }
                        />
                      </Link>
                    ),
                  )
                )}
              </div>
            </DashboardPanel>

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
              title="Recent treatment activity"
              description="Latest completed and changed visits."
              actionLabel="View documents"
              actionHref="/documents"
            >
              <div className="space-y-2">
                {recentTreatments.length ===
                0 ? (
                  <EmptyState>
                    No treatment activity
                    has been recorded.
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
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-2">
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
                    Open Stock &
                    Purchasing to create or
                    restore stock records.
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

            <DashboardPanel
              title="Enquiry pipeline"
              description="Current position of prospective customers."
              actionLabel="Manage pipeline"
              actionHref="/enquiries"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <PipelineCard
                  label="New"
                  value={
                    newEnquiries.length
                  }
                  detail="Awaiting action"
                />

                <PipelineCard
                  label="Site visits"
                  value={
                    arrangedSiteVisits.length
                  }
                  detail="Arranged"
                />

                <PipelineCard
                  label="Quotes"
                  value={
                    outstandingQuotes.length
                  }
                  detail="Outstanding"
                />

                <PipelineCard
                  label="Conversions"
                  value={
                    acceptedEnquiries.length
                  }
                  detail="Ready now"
                  highlight={
                    acceptedEnquiries.length >
                    0
                  }
                />
              </div>
            </DashboardPanel>
          </section>
</div>
      </main>
    </AppShell>
  );
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
  accent = "default",
}: {
  label: string;
  value: string;
  detail: string;

  accent?:
    | "default"
    | "green"
    | "blue"
    | "amber";
}) {
  const accentClass =
    accent === "green"
      ? "bg-green-500"
      : accent === "blue"
        ? "bg-blue-500"
        : accent === "amber"
          ? "bg-amber-500"
          : "bg-[#338b45]";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`mb-3 h-1.5 w-10 rounded-full ${accentClass}`}
      />

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
  status: TreatmentStatus;
}) {
  const styles =
    status === "Completed"
      ? "bg-green-100 text-green-800"
      : status === "Rescheduled"
        ? "bg-blue-100 text-blue-800"
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

function EnquiryStatusBadge({
  status,
}: {
  status:
    | "New Enquiry"
    | "Visit Arranged"
    | "Quote Prepared"
    | "Quote Accepted"
    | "Quote Declined"
    | "Converted to Customer"
    | "Closed";
}) {
  const styles =
    status ===
      "Converted to Customer" ||
    status === "Quote Accepted"
      ? "bg-green-100 text-green-800"
      : status ===
            "Quote Declined" ||
          status === "Closed"
        ? "bg-red-100 text-red-700"
        : status ===
            "Quote Prepared"
          ? "bg-blue-100 text-blue-800"
          : status ===
              "Visit Arranged"
            ? "bg-amber-100 text-amber-800"
            : "bg-slate-100 text-slate-700";

  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}
    >
      {status}
    </span>
  );
}

function PipelineCard({
  label,
  value,
  detail,
  highlight = false,
}: {
  label: string;
  value: number;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </div>
  );
}
