"use client";

import Link from "next/link";
import {
  type ReactNode,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";
import {
  type TreatmentRecord,
  type TreatmentStatus,
  useTreatmentStore,
} from "@/components/treatment-store";

type StatusFilter =
  | "All"
  | TreatmentStatus;

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

export default function TreatmentsPage() {
  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    treatments,
    ready: treatmentsReady,
    deleteTreatment,
  } = useTreatmentStore();

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>("All");

  const [selectedId, setSelectedId] =
    useState("");

  const [message, setMessage] =
    useState("");

  const filteredTreatments =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return [...treatments]
        .filter((treatment) => {
          const customer =
            customers.find(
              (item) =>
                item.customerNumber ===
                treatment.customerNumber,
            );

          const matchesStatus =
            statusFilter === "All" ||
            treatment.status ===
              statusFilter;

          const matchesSearch =
            !query ||
            [
              treatment.customerNumber,
              customer?.fullName ?? "",
              customer?.address ?? "",
              customer?.postcode ?? "",
              treatment.treatmentName,
              treatment.chemicalName,
              treatment.fertiliser,
              treatment.herbicide,
              treatment.invoiceNumber,
              treatment.notes,
            ].some((value) =>
              value
                .toLowerCase()
                .includes(query),
            );

          return (
            matchesStatus &&
            matchesSearch
          );
        })
        .sort(
          (first, second) =>
            getRecordDate(
              second,
            ).localeCompare(
              getRecordDate(first),
            ),
        );
    }, [
      treatments,
      customers,
      search,
      statusFilter,
    ]);

  const selectedTreatment =
    filteredTreatments.find(
      (treatment) =>
        treatment.id ===
        selectedId,
    ) ??
    filteredTreatments[0] ??
    null;

  const selectedCustomer =
    selectedTreatment
      ? customers.find(
          (customer) =>
            customer.customerNumber ===
            selectedTreatment.customerNumber,
        ) ?? null
      : null;

  const completedTreatments =
    treatments.filter(
      (treatment) =>
        treatment.status ===
        "Completed",
    );

  const totalArea =
    completedTreatments.reduce(
      (total, treatment) =>
        total +
        treatment
          .treatmentAreaSquareMetres,
      0,
    );

  const totalChemicalCost =
    completedTreatments.reduce(
      (total, treatment) =>
        total +
        treatment
          .estimatedProductCost,
      0,
    );

  const awaitingReschedule =
    treatments.filter(
      (treatment) =>
        treatment.status ===
        "Needs Rescheduling",
    ).length;

  const ready =
    customersReady &&
    treatmentsReady;

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading treatment records...
          </div>
        </main>
      </AppShell>
    );
  }

  function removeSelectedRecord() {
    if (!selectedTreatment) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete this ${selectedTreatment.status.toLowerCase()} treatment record? This does not restore or alter the linked programme visit.`,
      );

    if (!confirmed) {
      return;
    }

    deleteTreatment(
      selectedTreatment.id,
    );

    setSelectedId("");

    showMessage(
      "Treatment record deleted.",
    );
  }

  function showMessage(
    text: string,
  ) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3500);
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1650px]">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-3xl font-bold">
                Treatment Records
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Review completed treatments,
                cancellations, failed visits and
                rescheduling history from one
                operational record.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/jobs"
                className="inline-flex h-11 items-center rounded-xl bg-[#176b37] px-5 text-sm font-semibold text-white hover:bg-[#125b2f]"
              >
                Open Jobs
              </Link>

              <Link
                href="/documents"
                className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold hover:bg-slate-50"
              >
                Open Documents
              </Link>
            </div>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="All records"
              value={String(
                treatments.length,
              )}
              detail="Operational history"
            />

            <SummaryCard
              label="Completed"
              value={String(
                completedTreatments.length,
              )}
              detail="Treatment reports"
            />

            <SummaryCard
              label="Awaiting reschedule"
              value={String(
                awaitingReschedule,
              )}
              detail="Needs attention"
              warning={
                awaitingReschedule > 0
              }
            />

            <SummaryCard
              label="Completed area"
              value={`${totalArea.toLocaleString(
                "en-GB",
              )} m²`}
              detail="Recorded applications"
            />

            <SummaryCard
              label="Chemical cost"
              value={`£${totalChemicalCost.toFixed(
                2,
              )}`}
              detail="Completed records"
            />
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_230px]">
              <Field label="Search records">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Customer, treatment, product, address, invoice or notes"
                  className={inputClass}
                />
              </Field>

              <Field label="Status">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target
                        .value as StatusFilter,
                    )
                  }
                  className={inputClass}
                >
                  <option value="All">
                    All statuses
                  </option>

                  <option value="Completed">
                    Completed
                  </option>

                  <option value="Needs Rescheduling">
                    Needs Rescheduling
                  </option>

                  <option value="Rescheduled">
                    Rescheduled
                  </option>

                  <option value="Cancelled">
                    Cancelled
                  </option>
                </select>
              </Field>
            </div>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_470px]">
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-[115px_1.25fr_1.2fr_150px_130px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                <span>Date</span>
                <span>Customer</span>
                <span>Treatment</span>
                <span>Status</span>
                <span>Product</span>
              </div>

              <div className="max-h-[64vh] overflow-y-auto">
                {filteredTreatments.length ===
                0 ? (
                  <div className="p-12 text-center text-sm text-slate-500">
                    No treatment records match the
                    current filters.
                  </div>
                ) : (
                  filteredTreatments.map(
                    (treatment) => {
                      const customer =
                        customers.find(
                          (item) =>
                            item.customerNumber ===
                            treatment.customerNumber,
                        );

                      const selected =
                        selectedTreatment?.id ===
                        treatment.id;

                      return (
                        <button
                          key={
                            treatment.id
                          }
                          type="button"
                          onClick={() =>
                            setSelectedId(
                              treatment.id,
                            )
                          }
                          className={`grid w-full grid-cols-[115px_1.25fr_1.2fr_150px_130px] items-center gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm transition last:border-0 ${
                            selected
                              ? "bg-green-50"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <div className="font-semibold">
                              {formatDate(
                                getRecordDate(
                                  treatment,
                                ),
                              )}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              Scheduled{" "}
                              {formatDate(
                                treatment.scheduledDate,
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="font-bold">
                              {customer?.fullName ??
                                treatment.customerNumber}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              Customer{" "}
                              {
                                treatment.customerNumber
                              }
                            </div>
                          </div>

                          <div>
                            <div className="font-semibold">
                              {
                                treatment.treatmentName
                              }
                            </div>

                            {treatment.invoiceNumber && (
                              <div className="mt-1 text-xs text-slate-500">
                                {
                                  treatment.invoiceNumber
                                }
                              </div>
                            )}
                          </div>

                          <StatusBadge
                            status={
                              treatment.status
                            }
                          />

                          <span className="truncate text-slate-600">
                            {treatment.chemicalName ||
                              treatment.fertiliser ||
                              treatment.herbicide ||
                              "None"}
                          </span>
                        </button>
                      );
                    },
                  )
                )}
              </div>
            </article>

            <article className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {selectedTreatment ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">
                        Treatment detail
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Immutable operational facts
                        recorded when the job outcome
                        was saved.
                      </p>
                    </div>

                    <StatusBadge
                      status={
                        selectedTreatment.status
                      }
                    />
                  </div>

                  <div className="mt-5 space-y-4">
                    <InformationRow
                      label="Customer"
                      value={
                        selectedCustomer?.fullName ??
                        selectedTreatment.customerNumber
                      }
                    />

                    <InformationRow
                      label="Treatment"
                      value={
                        selectedTreatment.treatmentName
                      }
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <InfoBox
                        label="Scheduled date"
                        value={formatDate(
                          selectedTreatment.scheduledDate,
                        )}
                      />

                      <InfoBox
                        label="Completed / recorded"
                        value={formatDate(
                          getRecordDate(
                            selectedTreatment,
                          ),
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <InfoBox
                        label="Area"
                        value={`${selectedTreatment.treatmentAreaSquareMetres.toLocaleString(
                          "en-GB",
                        )} m²`}
                      />

                      <InfoBox
                        label="Next / replacement"
                        value={
                          selectedTreatment.nextVisitDate
                            ? formatDate(
                                selectedTreatment.nextVisitDate,
                              )
                            : "Not recorded"
                        }
                      />
                    </div>

                    <Section
                      title="Products and application"
                    >
                      <DetailGrid>
                        <DetailItem
                          label="Chemical"
                          value={
                            selectedTreatment.chemicalName ||
                            "None recorded"
                          }
                        />

                        <DetailItem
                          label="Chemical type"
                          value={
                            selectedTreatment.chemicalType ||
                            "—"
                          }
                        />

                        <DetailItem
                          label="Application rate"
                          value={
                            selectedTreatment.applicationRate >
                            0
                              ? `${selectedTreatment.applicationRate} ${selectedTreatment.applicationRateUnit}`
                              : "—"
                          }
                        />

                        <DetailItem
                          label="Product required"
                          value={
                            selectedTreatment.productRequired >
                            0
                              ? `${selectedTreatment.productRequired} ${selectedTreatment.productUnit}`
                              : "—"
                          }
                        />

                        <DetailItem
                          label="Water required"
                          value={
                            selectedTreatment.waterRequiredLitres >
                            0
                              ? `${selectedTreatment.waterRequiredLitres} L`
                              : "—"
                          }
                        />

                        <DetailItem
                          label="Estimated cost"
                          value={`£${selectedTreatment.estimatedProductCost.toFixed(
                            2,
                          )}`}
                        />

                        <DetailItem
                          label="Fertiliser"
                          value={
                            selectedTreatment.fertiliser ||
                            "None"
                          }
                        />

                        <DetailItem
                          label="Herbicide"
                          value={
                            selectedTreatment.herbicide ||
                            "None"
                          }
                        />
                      </DetailGrid>
                    </Section>

                    <Section title="Equipment">
                      <DetailGrid>
                        <DetailItem
                          label="Knapsack"
                          value={
                            [
                              selectedTreatment.knapsackMake,
                              selectedTreatment.knapsackModel,
                            ]
                              .filter(Boolean)
                              .join(" ") ||
                            "—"
                          }
                        />

                        <DetailItem
                          label="Nozzle"
                          value={
                            [
                              selectedTreatment.nozzleColour,
                              selectedTreatment.nozzleType,
                            ]
                              .filter(Boolean)
                              .join(" ") ||
                            "—"
                          }
                        />

                        <DetailItem
                          label="Walking speed"
                          value={
                            selectedTreatment.walkingSpeedKph >
                            0
                              ? `${selectedTreatment.walkingSpeedKph} km/h`
                              : "—"
                          }
                        />

                        <DetailItem
                          label="Flow rate"
                          value={
                            selectedTreatment.flowRateLitresPerMinute >
                            0
                              ? `${selectedTreatment.flowRateLitresPerMinute} L/min`
                              : "—"
                          }
                        />

                        <DetailItem
                          label="Spray width"
                          value={
                            selectedTreatment.sprayWidthMetres >
                            0
                              ? `${selectedTreatment.sprayWidthMetres} m`
                              : "—"
                          }
                        />

                        <DetailItem
                          label="Pressure"
                          value={
                            selectedTreatment.pressureBar >
                            0
                              ? `${selectedTreatment.pressureBar} bar`
                              : "—"
                          }
                        />
                      </DetailGrid>
                    </Section>

                    <Section title="Notes">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {selectedTreatment.notes ||
                          "No notes recorded."}
                      </p>
                    </Section>

                    <div className="flex flex-wrap gap-2">
                      {selectedCustomer && (
                        <Link
                          href={`/customers/${selectedCustomer.customerNumber}`}
                          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                        >
                          Open customer
                        </Link>
                      )}

                      <Link
                        href="/documents"
                        className="rounded-xl border border-[#338b45] px-4 py-2.5 text-sm font-semibold text-[#176b37] hover:bg-green-50"
                      >
                        Open document centre
                      </Link>

                      <button
                        type="button"
                        onClick={
                          removeSelectedRecord
                        }
                        className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        Delete record
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-sm text-slate-500">
                  Select a treatment record to view
                  its details.
                </div>
              )}
            </article>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function getRecordDate(
  treatment: TreatmentRecord,
) {
  return (
    treatment.completedDate ||
    treatment.scheduledDate ||
    treatment.recordedDate.slice(
      0,
      10,
    )
  );
}

function parseDate(
  value: string,
) {
  const [year, month, day] =
    value
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day,
  );
}

function isDateValue(
  value: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const date =
    parseDate(value);

  return !Number.isNaN(
    date.getTime(),
  );
}

function formatDate(
  value: string,
) {
  if (!isDateValue(value)) {
    return "No date";
  }

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

function SummaryCard({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`mb-3 h-1.5 w-10 rounded-full ${
          warning
            ? "bg-amber-500"
            : "bg-[#338b45]"
        }`}
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

function StatusBadge({
  status,
}: {
  status: TreatmentStatus;
}) {
  const styles =
    status === "Completed"
      ? "bg-green-100 text-green-800"
      : status ===
          "Needs Rescheduling"
        ? "bg-amber-100 text-amber-800"
        : status === "Rescheduled"
          ? "bg-blue-100 text-blue-800"
          : "bg-red-100 text-red-700";

  return (
    <span
      className={`h-fit w-fit rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}
    >
      {status}
    </span>
  );
}

function InformationRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-slate-200 pb-3">
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 font-bold">
        {value}
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 font-bold">
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-bold">
        {title}
      </h3>

      <div className="mt-3">
        {children}
      </div>
    </section>
  );
}

function DetailGrid({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {children}
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-sm font-semibold">
        {value}
      </div>
    </div>
  );
}