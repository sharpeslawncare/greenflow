"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";
import {
  type TreatmentRecord,
  useTreatmentStore,
} from "@/components/treatment-store";

type StatusFilter =
  | "All"
  | "Completed"
  | "Needs Rescheduling"
  | "Cancelled";

export default function DocumentsPage() {
  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("All");

  const sortedTreatments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...treatments]
      .filter((treatment) => {
        const customer = customers.find(
          (item) =>
            item.customerNumber ===
            treatment.customerNumber,
        );

        const matchesStatus =
          statusFilter === "All" ||
          treatment.status === statusFilter;

        const matchesSearch =
          !query ||
          [
            treatment.customerNumber,
            treatment.treatmentName,
            treatment.fertiliser,
            treatment.herbicide,
            customer?.fullName ?? "",
            customer?.address ?? "",
            customer?.postcode ?? "",
          ].some((value) =>
            value.toLowerCase().includes(query),
          );

        return matchesStatus && matchesSearch;
      })
      .sort(
        (first, second) =>
          new Date(second.recordedDate).getTime() -
          new Date(first.recordedDate).getTime(),
      );
  }, [
    treatments,
    customers,
    search,
    statusFilter,
  ]);

  const completedCount = treatments.filter(
    (treatment) =>
      treatment.status === "Completed",
  ).length;

  const reschedulingCount = treatments.filter(
    (treatment) =>
      treatment.status ===
      "Needs Rescheduling",
  ).length;

  const cancelledCount = treatments.filter(
    (treatment) =>
      treatment.status === "Cancelled",
  ).length;

  if (!customersReady || !treatmentsReady) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading GreenFlow documents...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1500px]">
          <header className="mb-5">
            <Link
              href="/"
              className="text-sm font-semibold text-[#176b37] hover:underline"
            >
              ← Dashboard
            </Link>

            <h1 className="mt-2 text-3xl font-bold">
              Documents
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Treatment reports and invoice
              previews generated from completed
              GreenFlow records.
            </p>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="All records"
              value={String(treatments.length)}
              detail="Treatment history"
            />

            <SummaryCard
              label="Completed"
              value={String(completedCount)}
              detail="Reports available"
            />

            <SummaryCard
              label="Needs rescheduling"
              value={String(reschedulingCount)}
              detail="Require attention"
              warning={reschedulingCount > 0}
            />

            <SummaryCard
              label="Cancelled"
              value={String(cancelledCount)}
              detail="Recorded cancellations"
            />
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <label>
                <span className="mb-1.5 block text-sm font-semibold">
                  Search documents
                </span>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Customer, address, treatment or product"
                  className={inputClass}
                />
              </label>

              <label>
                <span className="mb-1.5 block text-sm font-semibold">
                  Status
                </span>

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
                  <option value="All">All</option>
                  <option value="Completed">
                    Completed
                  </option>
                  <option value="Needs Rescheduling">
                    Needs Rescheduling
                  </option>
                  <option value="Cancelled">
                    Cancelled
                  </option>
                </select>
              </label>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[120px_90px_1.2fr_1.2fr_1.4fr_145px_130px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              <span>Date</span>
              <span>Number</span>
              <span>Customer</span>
              <span>Treatment</span>
              <span>Products</span>
              <span>Status</span>
              <span>Document</span>
            </div>

            <div className="max-h-[58vh] overflow-y-auto">
              {sortedTreatments.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="font-bold">
                    No treatment documents found
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    Complete a job from Today&apos;s
                    Jobs to generate the first record.
                  </p>
                </div>
              ) : (
                sortedTreatments.map((treatment) => {
                  const customer = customers.find(
                    (item) =>
                      item.customerNumber ===
                      treatment.customerNumber,
                  );

                  return (
                    <DocumentRow
                      key={treatment.id}
                      treatment={treatment}
                      customerName={
                        customer?.fullName ??
                        "Customer not found"
                      }
                    />
                  );
                })
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
  const products = [
    treatment.fertiliser,
    treatment.herbicide,
    treatment.otherMaterials,
  ]
    .filter(
      (product) =>
        product && product !== "None",
    )
    .join(", ");

  return (
    <div className="grid grid-cols-[120px_90px_1.2fr_1.2fr_1.4fr_145px_130px] items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0 hover:bg-green-50/40">
      <span className="text-slate-600">
        {formatTreatmentDate(treatment)}
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

      <span>{treatment.treatmentName}</span>

      <span className="truncate text-slate-600">
        {products || "No products recorded"}
      </span>

      <StatusBadge status={treatment.status} />

      <Link
        href={`/documents/${treatment.id}`}
        className="w-fit rounded-lg border border-[#338b45] px-3 py-2 text-xs font-semibold text-[#176b37] hover:bg-green-50"
      >
        View report
      </Link>
    </div>
  );
}

function formatTreatmentDate(
  treatment: TreatmentRecord,
) {
  if (treatment.completedDate) {
    return formatDate(treatment.completedDate);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(treatment.recordedDate));
}

function formatDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

const inputClass =
  "w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

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
  status: TreatmentRecord["status"];
}) {
  const styles =
    status === "Completed"
      ? "bg-green-100 text-green-800"
      : status === "Needs Rescheduling"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-700";

  return (
    <span
      className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${styles}`}
    >
      {status}
    </span>
  );
}