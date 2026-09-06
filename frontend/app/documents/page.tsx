"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
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

type StatusFilter = "All" | TreatmentStatus;
type JobTypeFilter = "All" | "Programme" | "Additional";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-slate-500">
          Loading documents...
        </div>
      }
    >
      <DocumentsPageContent />
    </Suspense>
  );
}

function DocumentsPageContent() {
  const searchParams = useSearchParams();

  const customerNumber =
    searchParams.get("customer")?.trim() ?? "";

  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const selectedCustomer =
    customerNumber
      ? customers.find(
          (customer) =>
            customer.customerNumber === customerNumber,
        ) ?? null
      : null;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("All");
  const [jobTypeFilter, setJobTypeFilter] =
    useState<JobTypeFilter>("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredTreatments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...treatments]
      .filter((treatment) => {
        const customer = customers.find(
          (item) =>
            item.customerNumber ===
            treatment.customerNumber,
        );

        const recordDate = getRecordDate(treatment);
        const additional = isAdditionalJob(treatment);

        const matchesCustomer =
          !customerNumber ||
          treatment.customerNumber === customerNumber;

        const matchesStatus =
          statusFilter === "All" ||
          treatment.status === statusFilter;

        const matchesJobType =
          jobTypeFilter === "All" ||
          (jobTypeFilter === "Additional"
            ? additional
            : !additional);

        const matchesDates =
          (!dateFrom || recordDate >= dateFrom) &&
          (!dateTo || recordDate <= dateTo);

        const matchesSearch =
          !query ||
          [
            treatment.customerNumber,
            treatment.treatmentName,
            treatment.chemicalName,
            treatment.fertiliser,
            treatment.herbicide,
            treatment.otherMaterials,
            treatment.invoiceNumber,
            treatment.notes,
            treatment.customerWording,
            additional ? "additional job" : "programme",
            customer?.fullName ?? "",
            customer?.address ?? "",
            customer?.postcode ?? "",
          ].some((value) =>
            String(value ?? "")
              .toLowerCase()
              .includes(query),
          );

        return (
          matchesCustomer &&
          matchesStatus &&
          matchesJobType &&
          matchesDates &&
          matchesSearch
        );
      })
      .sort((first, second) =>
        getRecordDate(second).localeCompare(
          getRecordDate(first),
        ),
      );
  }, [
    treatments,
    customers,
    search,
    statusFilter,
    jobTypeFilter,
    dateFrom,
    dateTo,
    customerNumber,
  ]);

  const scopedTreatments = customerNumber
    ? treatments.filter(
        (treatment) =>
          treatment.customerNumber === customerNumber,
      )
    : treatments;

  const completedTreatments =
    scopedTreatments.filter(
      (treatment) =>
        treatment.status === "Completed",
    );

  const completedCount =
    completedTreatments.length;

  const additionalCount =
    completedTreatments.filter(
      isAdditionalJob,
    ).length;

  const programmeCount =
    completedTreatments.filter(
      (treatment) =>
        !isAdditionalJob(treatment),
    ).length;

  const invoicedValue =
    completedTreatments.reduce(
      (total, treatment) => {
        const customer = customers.find(
          (item) =>
            item.customerNumber ===
            treatment.customerNumber,
        );

        return (
          total +
          getInvoiceAmount(
            treatment,
            customer?.treatmentPrice ?? 0,
          )
        );
      },
      0,
    );

  const reschedulingCount =
    scopedTreatments.filter(
      (treatment) =>
        treatment.status ===
        "Needs Rescheduling",
    ).length;

  if (!customersReady || !treatmentsReady) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading GreenFlow documents...
          </div>
        </main>
      </AppShell>
    );
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setJobTypeFilter("All");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1750px]">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-3xl font-bold">
                Documents
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                {selectedCustomer
                  ? `Treatment reports, invoices and visit records for ${selectedCustomer.fullName}.`
                  : "Treatment reports, invoices and visit-outcome records for seasonal programme work and additional jobs."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/treatments"
                className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold hover:bg-slate-50"
              >
                Treatment Records
              </Link>

              <Link
                href="/jobs"
                className="inline-flex h-11 items-center rounded-xl bg-[#176b37] px-5 text-sm font-semibold text-white hover:bg-[#125b2f]"
              >
                Open Jobs
              </Link>
            </div>
          </header>

          {customerNumber && (
            <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 shadow-sm">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
                  Customer context
                </div>

                <div className="mt-1 font-bold text-green-950">
                  {selectedCustomer
                    ? `${selectedCustomer.fullName} · Customer ${selectedCustomer.customerNumber}`
                    : `Customer ${customerNumber}`}
                </div>

                <p className="mt-1 text-sm text-green-800">
                  Only documents linked to this customer are shown.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedCustomer && (
                  <Link
                    href={`/customers/${selectedCustomer.customerNumber}?tab=documents`}
                    className="rounded-xl border border-green-300 bg-white px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100"
                  >
                    Return to customer
                  </Link>
                )}

                <Link
                  href="/documents"
                  className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
                >
                  Show all documents
                </Link>
              </div>
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="Completed"
              value={String(completedCount)}
              detail="Reports and invoices"
            />

            <SummaryCard
              label="Programme"
              value={String(programmeCount)}
              detail="Completed seasonal visits"
            />

            <SummaryCard
              label="Additional jobs"
              value={String(additionalCount)}
              detail="Completed extra services"
              highlight={additionalCount > 0}
            />

            <SummaryCard
              label="Invoiced value"
              value={`£${invoicedValue.toFixed(2)}`}
              detail="Completed treatment records"
            />

            <SummaryCard
              label="Needs rescheduling"
              value={String(reschedulingCount)}
              detail="Visit outcome records"
              warning={reschedulingCount > 0}
            />
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_190px_190px_160px_160px_auto] xl:items-end">
              <Field label="Search documents">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Customer, treatment, invoice, address, product or notes"
                  className={inputClass}
                />
              </Field>

              <Field label="Work type">
                <select
                  value={jobTypeFilter}
                  onChange={(event) =>
                    setJobTypeFilter(
                      event.target
                        .value as JobTypeFilter,
                    )
                  }
                  className={inputClass}
                >
                  <option value="All">
                    All work
                  </option>
                  <option value="Programme">
                    Programme
                  </option>
                  <option value="Additional">
                    Additional jobs
                  </option>
                </select>
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

              <Field label="From">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) =>
                    setDateFrom(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="To">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) =>
                    setDateTo(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <button
                type="button"
                onClick={resetFilters}
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-50"
              >
                Reset filters
              </button>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <div className="min-w-[1260px]">
                <div className="grid grid-cols-[110px_80px_1.1fr_1.35fr_130px_1.1fr_145px_145px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>Date</span>
                  <span>Number</span>
                  <span>Customer</span>
                  <span>Treatment</span>
                  <span>Invoice value</span>
                  <span>Products</span>
                  <span>Status</span>
                  <span>Document</span>
                </div>

                <div className="max-h-[62vh] overflow-y-auto">
                  {filteredTreatments.length ===
                  0 ? (
                    <div className="p-12 text-center">
                      <div className="font-bold">
                        No documents found
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        Adjust the filters or record a job outcome to create a document.
                      </p>
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

                        return (
                          <DocumentRow
                            key={treatment.id}
                            treatment={
                              treatment
                            }
                            customerName={
                              customer?.fullName ??
                              "Customer not found"
                            }
                            fallbackPrice={
                              customer
                                ?.treatmentPrice ??
                              0
                            }
                          />
                        );
                      },
                    )
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function DocumentRow({
  treatment,
  customerName,
  fallbackPrice,
}: {
  treatment: TreatmentRecord;
  customerName: string;
  fallbackPrice: number;
}) {
  const products =
    treatment.applications
      .map(
        (application) =>
          application.productName,
      )
      .filter(Boolean);

  const uniqueProducts =
    Array.from(new Set(products));

  const documentLabel =
    treatment.status === "Completed"
      ? "Report & invoice"
      : "Visit record";

  const additional =
    isAdditionalJob(treatment);

  const invoiceAmount =
    getInvoiceAmount(
      treatment,
      fallbackPrice,
    );

  return (
    <div className="grid grid-cols-[110px_80px_1.1fr_1.35fr_130px_1.1fr_145px_145px] items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0 hover:bg-green-50/40">
      <span className="text-slate-600">
        {formatDate(
          getRecordDate(treatment),
        )}
      </span>

      <Link
        href={`/customers/${treatment.customerNumber}`}
        className="font-bold text-[#176b37] hover:underline"
      >
        {treatment.customerNumber}
      </Link>

      <span className="font-semibold">
        {customerName}
      </span>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">
            {treatment.treatmentName}
          </span>

          {additional ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
              Additional
            </span>
          ) : (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-800">
              Programme
            </span>
          )}
        </div>

        {treatment.invoiceNumber && (
          <div className="mt-1 text-xs text-slate-500">
            {treatment.invoiceNumber}
          </div>
        )}
      </div>

      <div>
        {treatment.status ===
          "Completed" &&
        invoiceAmount > 0 ? (
          <>
            <div className="font-bold">
              £
              {invoiceAmount.toFixed(
                2,
              )}
            </div>

            {additional &&
              treatment.invoiceAmount >
                0 && (
                <div className="mt-1 text-[10px] font-semibold text-amber-700">
                  Agreed job price
                </div>
              )}
          </>
        ) : (
          <span className="text-slate-400">
            —
          </span>
        )}
      </div>

      <span className="truncate text-slate-600">
        {uniqueProducts.length > 0
          ? uniqueProducts.join(", ")
          : "No products applied"}
      </span>

      <StatusBadge
        status={treatment.status}
      />

      <Link
        href={`/documents/${treatment.id}`}
        className="w-fit rounded-lg border border-[#338b45] px-3 py-2 text-xs font-semibold text-[#176b37] hover:bg-green-50"
      >
        {documentLabel}
      </Link>
    </div>
  );
}

function isAdditionalJob(
  treatment: TreatmentRecord,
) {
  return (
    treatment.jobType ===
      "additional" ||
    treatment.programmeId.startsWith(
      "additional-jobs-",
    )
  );
}

function getInvoiceAmount(
  treatment: TreatmentRecord,
  fallbackPrice: number,
) {
  if (
    Number.isFinite(
      treatment.invoiceAmount,
    ) &&
    treatment.invoiceAmount > 0
  ) {
    return treatment.invoiceAmount;
  }

  if (
    treatment.status ===
      "Completed" &&
    !isAdditionalJob(treatment) &&
    Number.isFinite(fallbackPrice) &&
    fallbackPrice > 0
  ) {
    return fallbackPrice;
  }

  return 0;
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

function parseDate(value: string) {
  const [year, month, day] =
    value.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day,
  );
}

function formatDate(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
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
  highlight = false,
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
  highlight?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm ${
        highlight
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`mb-3 h-1.5 w-10 rounded-full ${
          warning
            ? "bg-amber-500"
            : highlight
              ? "bg-amber-400"
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
        : status ===
            "Rescheduled"
          ? "bg-blue-100 text-blue-800"
          : "bg-red-100 text-red-700";

  return (
    <span
      className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${styles}`}
    >
      {status}
    </span>
  );
}
