"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import {
  useCustomerStore,
} from "@/components/customer-store";
import {
  type TreatmentRecord,
  useTreatmentStore,
} from "@/components/treatment-store";

type CustomerTreatmentHistoryProps = {
  customerNumber: string;
};

type HistoryFilter =
  | "All"
  | "Programme"
  | "Additional";

export function CustomerTreatmentHistory({
  customerNumber,
}: CustomerTreatmentHistoryProps) {
  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const {
    getCustomer,
    ready: customersReady,
  } = useCustomerStore();

  const [
    filter,
    setFilter,
  ] = useState<HistoryFilter>("All");

  const customer =
    getCustomer(customerNumber);

  const customerTreatments =
    useMemo(
      () =>
        treatments
          .filter(
            (treatment) =>
              treatment.customerNumber ===
              customerNumber,
          )
          .sort(
            (first, second) =>
              getRecordDate(
                second,
              ).localeCompare(
                getRecordDate(
                  first,
                ),
              ),
          ),
      [
        treatments,
        customerNumber,
      ],
    );

  const filteredTreatments =
    useMemo(() => {
      if (filter === "All") {
        return customerTreatments;
      }

      if (
        filter ===
        "Additional"
      ) {
        return customerTreatments.filter(
          (treatment) =>
            isAdditionalJob(
              treatment,
            ),
        );
      }

      return customerTreatments.filter(
        (treatment) =>
          !isAdditionalJob(
            treatment,
          ),
      );
    }, [
      customerTreatments,
      filter,
    ]);

  const completedTreatments =
    customerTreatments.filter(
      (treatment) =>
        treatment.status ===
        "Completed",
    );

  const completedAdditional =
    completedTreatments.filter(
      isAdditionalJob,
    );

  const completedProgramme =
    completedTreatments.filter(
      (treatment) =>
        !isAdditionalJob(
          treatment,
        ),
    );

  const invoicedValue =
    completedTreatments.reduce(
      (total, treatment) =>
        total +
        getInvoiceAmount(
          treatment,
          customer
            ?.treatmentPrice ??
            0,
        ),
      0,
    );

  if (
    !treatmentsReady ||
    !customersReady
  ) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
        Loading treatment history...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Completed visits"
          value={String(
            completedTreatments.length,
          )}
          detail="Programme and additional"
        />

        <SummaryCard
          label="Programme"
          value={String(
            completedProgramme.length,
          )}
          detail="Seasonal treatments completed"
        />

        <SummaryCard
          label="Additional jobs"
          value={String(
            completedAdditional.length,
          )}
          detail="Extra services completed"
          highlight={
            completedAdditional.length >
            0
          }
        />

        <SummaryCard
          label="Invoiced value"
          value={`£${invoicedValue.toFixed(
            2,
          )}`}
          detail="Completed treatment records"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-xl font-bold">
              Treatment history
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Seasonal programme treatments and additional services are shown together in date order. Additional jobs keep their own agreed invoice value.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                "All",
                "Programme",
                "Additional",
              ] as HistoryFilter[]
            ).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setFilter(
                    item,
                  )
                }
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  filter === item
                    ? "bg-[#176b37] text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {filteredTreatments.length ===
        0 ? (
          <div className="p-12 text-center">
            <div className="font-bold text-slate-800">
              No treatment records
            </div>

            <p className="mt-2 text-sm text-slate-500">
              {filter ===
              "Additional"
                ? "No additional jobs have been recorded for this customer yet."
                : filter ===
                    "Programme"
                  ? "No seasonal programme treatments have been recorded for this customer yet."
                  : "Completed, rescheduled and cancelled treatment records will appear here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTreatments.map(
              (treatment) => (
                <TreatmentHistoryRow
                  key={
                    treatment.id
                  }
                  treatment={
                    treatment
                  }
                  fallbackPrice={
                    customer
                      ?.treatmentPrice ??
                    0
                  }
                />
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function TreatmentHistoryRow({
  treatment,
  fallbackPrice,
}: {
  treatment: TreatmentRecord;
  fallbackPrice: number;
}) {
  const additional =
    isAdditionalJob(
      treatment,
    );

  const completed =
    treatment.status ===
    "Completed";

  const invoiceAmount =
    getInvoiceAmount(
      treatment,
      fallbackPrice,
    );

  const products =
    treatment.applications
      .map(
        (application) =>
          application.productName,
      )
      .filter(Boolean);

  const uniqueProducts =
    Array.from(
      new Set(products),
    );

  return (
    <article className="p-5 transition hover:bg-slate-50/70">
      <div className="grid gap-5 xl:grid-cols-[145px_minmax(230px,1fr)_minmax(200px,0.9fr)_140px_150px] xl:items-center">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {completed
              ? "Completed"
              : "Visit date"}
          </div>

          <div className="mt-1 font-semibold text-slate-900">
            {formatDate(
              getRecordDate(
                treatment,
              ),
            )}
          </div>

          <div className="mt-2">
            <StatusBadge
              status={
                treatment.status
              }
            />
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-950">
              {
                treatment.treatmentName
              }
            </h3>

            {additional ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                Additional job
              </span>
            ) : (
              <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-green-800">
                Programme
              </span>
            )}
          </div>

          {treatment.invoiceNumber && (
            <div className="mt-2 text-xs font-semibold text-slate-500">
              Invoice{" "}
              {
                treatment.invoiceNumber
              }
            </div>
          )}

          {additional &&
            treatment.customerWording
              ?.trim() && (
              <p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-5 text-slate-500">
                {
                  treatment.customerWording
                }
              </p>
            )}
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Products
          </div>

          <div className="mt-1 text-sm text-slate-700">
            {uniqueProducts.length >
            0
              ? uniqueProducts.join(
                  ", ",
                )
              : "No products recorded"}
          </div>

          {treatment
            .treatmentAreaSquareMetres >
            0 && (
            <div className="mt-1 text-xs text-slate-500">
              {treatment.treatmentAreaSquareMetres.toLocaleString(
                "en-GB",
              )}{" "}
              m² treated
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {completed
              ? "Invoice value"
              : "Value"}
          </div>

          <div className="mt-1 text-lg font-bold text-slate-950">
            {completed &&
            invoiceAmount >
              0
              ? `£${invoiceAmount.toFixed(
                  2,
                )}`
              : "—"}
          </div>

          {completed &&
            additional &&
            treatment.invoiceAmount >
              0 && (
              <div className="mt-1 text-[11px] font-semibold text-amber-700">
                Agreed additional-job price
              </div>
            )}
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Link
            href={`/documents/${treatment.id}`}
            className="rounded-xl border border-[#338b45] bg-white px-3 py-2 text-xs font-bold text-[#176b37] hover:bg-green-50"
          >
            {completed
              ? "Report & invoice"
              : "Visit record"}
          </Link>
        </div>
      </div>

      {treatment.notes.trim() && (
        <details className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <summary className="cursor-pointer text-xs font-bold text-slate-600">
            Visit notes
          </summary>

          <div className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
            {treatment.notes}
          </div>
        </details>
      )}
    </article>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  highlight = false,
}: {
  label: string;
  value: string;
  detail: string;
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
        className={`text-xs font-bold uppercase tracking-wide ${
          highlight
            ? "text-amber-700"
            : "text-slate-500"
        }`}
      >
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold text-slate-950">
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
  const className =
    status === "Completed"
      ? "bg-green-100 text-green-800"
      : status ===
          "Cancelled"
        ? "bg-slate-200 text-slate-700"
        : status ===
            "Needs Rescheduling"
          ? "bg-amber-100 text-amber-800"
          : status ===
              "Rescheduled"
            ? "bg-blue-100 text-blue-800"
            : "bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${className}`}
    >
      {status}
    </span>
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
    !isAdditionalJob(
      treatment,
    ) &&
    Number.isFinite(
      fallbackPrice,
    ) &&
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

  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(
    new Date(
      year,
      month - 1,
      day,
    ),
  );
}
