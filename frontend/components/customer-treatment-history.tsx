"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import {
  type TreatmentRecord,
  type TreatmentStatus,
  useTreatmentStore,
} from "@/components/treatment-store";

export function CustomerTreatmentHistory({
  customerNumber,
}: {
  customerNumber: string;
}) {
  const {
    getTreatmentsForCustomer,
    ready,
  } = useTreatmentStore();

  const [expandedId, setExpandedId] =
    useState("");

  const treatments =
    getTreatmentsForCustomer(
      customerNumber,
    );

  const completedCount =
    treatments.filter(
      (treatment) =>
        treatment.status ===
        "Completed",
    ).length;

  const completedArea =
    treatments
      .filter(
        (treatment) =>
          treatment.status ===
          "Completed",
      )
      .reduce(
        (total, treatment) =>
          total +
          treatment
            .treatmentAreaSquareMetres,
        0,
      );

  const latestCompleted =
    useMemo(
      () =>
        treatments.find(
          (treatment) =>
            treatment.status ===
            "Completed",
        ),
      [treatments],
    );

  if (!ready) {
    return (
      <div className="rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
        Loading treatment history...
      </div>
    );
  }

  if (treatments.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
        <div className="font-bold">
          No treatment history recorded
        </div>

        <p className="mt-2 text-sm text-slate-500">
          Complete a job to create the first
          operational treatment record.
        </p>

        <Link
          href="/jobs"
          className="mt-4 inline-flex rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Open Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniSummary
          label="Records"
          value={String(
            treatments.length,
          )}
        />

        <MiniSummary
          label="Completed"
          value={String(
            completedCount,
          )}
        />

        <MiniSummary
          label="Completed area"
          value={`${completedArea.toLocaleString(
            "en-GB",
          )} m²`}
        />
      </div>

      {latestCompleted && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          Latest completed treatment:{" "}
          <strong>
            {
              latestCompleted.treatmentName
            }
          </strong>{" "}
          on{" "}
          <strong>
            {formatDate(
              getRecordDate(
                latestCompleted,
              ),
            )}
          </strong>
          .
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-[115px_145px_1.2fr_1.3fr_115px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          <span>Date</span>
          <span>Status</span>
          <span>Treatment</span>
          <span>Products</span>
          <span>Next visit</span>
        </div>

        <div className="max-h-[44vh] overflow-y-auto">
          {treatments.map(
            (treatment) => {
              const products =
                getProducts(
                  treatment,
                );

              const expanded =
                expandedId ===
                treatment.id;

              return (
                <div
                  key={treatment.id}
                  className="border-t border-slate-100"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(
                        expanded
                          ? ""
                          : treatment.id,
                      )
                    }
                    className="grid w-full grid-cols-[115px_145px_1.2fr_1.3fr_115px] gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="text-slate-600">
                      {formatDate(
                        getRecordDate(
                          treatment,
                        ),
                      )}
                    </span>

                    <HistoryStatus
                      status={
                        treatment.status
                      }
                    />

                    <div>
                      <div className="font-semibold">
                        {
                          treatment.treatmentName
                        }
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Scheduled{" "}
                        {formatDate(
                          treatment.scheduledDate,
                        )}
                      </div>
                    </div>

                    <span className="text-slate-600">
                      {products ||
                        "No products recorded"}
                    </span>

                    <span className="text-slate-600">
                      {treatment.nextVisitDate
                        ? formatDate(
                            treatment.nextVisitDate,
                          )
                        : "—"}
                    </span>
                  </button>

                  {expanded && (
                    <div className="grid gap-3 border-t border-slate-100 bg-slate-50 px-4 py-4 text-sm sm:grid-cols-4">
                      <Detail
                        label="Area"
                        value={`${treatment.treatmentAreaSquareMetres.toLocaleString(
                          "en-GB",
                        )} m²`}
                      />

                      <Detail
                        label="Product required"
                        value={
                          treatment.productRequired >
                          0
                            ? `${treatment.productRequired} ${treatment.productUnit}`
                            : "—"
                        }
                      />

                      <Detail
                        label="Water"
                        value={
                          treatment.waterRequiredLitres >
                          0
                            ? `${treatment.waterRequiredLitres} L`
                            : "—"
                        }
                      />

                      <Detail
                        label="Chemical cost"
                        value={`£${treatment.estimatedProductCost.toFixed(
                          2,
                        )}`}
                      />

                      <div className="sm:col-span-4">
                        <Detail
                          label="Notes"
                          value={
                            treatment.notes ||
                            "No notes recorded."
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          href="/treatments"
          className="rounded-xl border border-[#338b45] px-4 py-2.5 text-sm font-semibold text-[#176b37] hover:bg-green-50"
        >
          Open all treatment records
        </Link>
      </div>
    </div>
  );
}

function getProducts(
  treatment: TreatmentRecord,
) {
  return [
    treatment.chemicalName,
    treatment.fertiliser,
    treatment.herbicide,
    treatment.otherMaterials,
  ]
    .filter(
      (value) =>
        value &&
        value !== "None",
    )
    .join(", ");
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

function HistoryStatus({
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
    return "—";
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

function MiniSummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-xl font-bold">
        {value}
      </div>
    </div>
  );
}

function Detail({
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

      <div className="mt-1 whitespace-pre-wrap font-semibold text-slate-700">
        {value}
      </div>
    </div>
  );
}