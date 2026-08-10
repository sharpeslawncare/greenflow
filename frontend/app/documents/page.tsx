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

type StatusFilter =
  | "All"
  | TreatmentStatus;

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
            customer.customerNumber ===
            customerNumber,
        ) ?? null
      : null;

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>("All");

  const [dateFrom, setDateFrom] =
    useState("");

  const [dateTo, setDateTo] =
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

          const recordDate =
            getRecordDate(
              treatment,
            );

          const matchesCustomer =
            !customerNumber ||
            treatment.customerNumber ===
              customerNumber;

          const matchesStatus =
            statusFilter === "All" ||
            treatment.status ===
              statusFilter;

          const matchesDates =
            (!dateFrom ||
              recordDate >= dateFrom) &&
            (!dateTo ||
              recordDate <= dateTo);

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
              customer?.fullName ?? "",
              customer?.address ?? "",
              customer?.postcode ?? "",
            ].some((value) =>
              value
                .toLowerCase()
                .includes(query),
            );

          return (
            matchesCustomer &&
            matchesStatus &&
            matchesDates &&
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
      dateFrom,
      dateTo,
      customerNumber,
    ]);

  const scopedTreatments =
    customerNumber
      ? treatments.filter(
          (treatment) =>
            treatment.customerNumber ===
            customerNumber,
        )
      : treatments;

  const completedCount =
    scopedTreatments.filter(
      (treatment) =>
        treatment.status ===
        "Completed",
    ).length;

  const reschedulingCount =
    scopedTreatments.filter(
      (treatment) =>
        treatment.status ===
        "Needs Rescheduling",
    ).length;

  const rescheduledCount =
    scopedTreatments.filter(
      (treatment) =>
        treatment.status ===
        "Rescheduled",
    ).length;

  const cancelledCount =
    scopedTreatments.filter(
      (treatment) =>
        treatment.status ===
        "Cancelled",
    ).length;

  if (
    !customersReady ||
    !treatmentsReady
  ) {
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
    setDateFrom("");
    setDateTo("");
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
                Documents
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                {selectedCustomer
                  ? `Treatment reports, invoices and visit records for ${selectedCustomer.fullName}.`
                  : "Print or save customer treatment reports, invoices and visit-outcome records generated directly from Treatment Records."}
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
              label="All records"
              value={String(
                scopedTreatments.length,
              )}
              detail="Available documents"
            />

            <SummaryCard
              label="Completed"
              value={String(
                completedCount,
              )}
              detail="Report and invoice"
            />

            <SummaryCard
              label="Needs rescheduling"
              value={String(
                reschedulingCount,
              )}
              detail="Visit outcome records"
              warning={
                reschedulingCount > 0
              }
            />

            <SummaryCard
              label="Rescheduled"
              value={String(
                rescheduledCount,
              )}
              detail="Resolved failures"
            />

            <SummaryCard
              label="Cancelled"
              value={String(
                cancelledCount,
              )}
              detail="Cancellation records"
            />
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_210px_170px_170px_auto] xl:items-end">
              <Field label="Search documents">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Customer, address, treatment, product, invoice or notes"
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
            <div className="grid grid-cols-[115px_85px_1.2fr_1.2fr_1.25fr_150px_145px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              <span>Date</span>
              <span>Number</span>
              <span>Customer</span>
              <span>Treatment</span>
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
                    Adjust the filters or record a
                    job outcome to create a document.
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
                        key={
                          treatment.id
                        }
                        treatment={
                          treatment
                        }
                        customerName={
                          customer?.fullName ??
                          "Customer not found"
                        }
                      />
                    );
                  },
                )
              )}
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
}: {
  treatment: TreatmentRecord;
  customerName: string;
}) {
  const products =
    [
      treatment.chemicalName,
      treatment.fertiliser,
      treatment.herbicide,
      treatment.otherMaterials,
    ]
      .filter(
        (product) =>
          product &&
          product !== "None",
      )
      .join(", ");

  const documentLabel =
    treatment.status ===
    "Completed"
      ? "Report & invoice"
      : "Visit record";

  return (
    <div className="grid grid-cols-[115px_85px_1.2fr_1.2fr_1.25fr_150px_145px] items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0 hover:bg-green-50/40">
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
        <div className="font-semibold">
          {treatment.treatmentName}
        </div>

        {treatment.invoiceNumber && (
          <div className="mt-1 text-xs text-slate-500">
            {treatment.invoiceNumber}
          </div>
        )}
      </div>

      <span className="truncate text-slate-600">
        {products ||
          "No products applied"}
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

function formatDate(
  value: string,
) {
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