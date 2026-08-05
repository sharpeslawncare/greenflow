"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import {
  type TreatmentApplication,
  type TreatmentRecord,
  type TreatmentStatus,
  getTreatmentApplications,
  getTreatmentProductNames,
  getTreatmentTotalProductCost,
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

  const totalProductCost =
    treatments
      .filter(
        (treatment) =>
          treatment.status ===
          "Completed",
      )
      .reduce(
        (total, treatment) =>
          total +
          getTreatmentTotalProductCost(
            treatment,
          ),
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
      <div className="grid gap-3 sm:grid-cols-4">
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

        <MiniSummary
          label="Product cost"
          value={`£${totalProductCost.toFixed(
            2,
          )}`}
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
        <div className="grid grid-cols-[115px_145px_1.2fr_1.4fr_115px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          <span>Date</span>
          <span>Status</span>
          <span>Treatment</span>
          <span>Products</span>
          <span>Next visit</span>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {treatments.map(
            (treatment) => {
              const products =
                getTreatmentProductNames(
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
                    className="grid w-full grid-cols-[115px_145px_1.2fr_1.4fr_115px] gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50"
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

                    <span className="line-clamp-2 text-slate-600">
                      {products.length > 0
                        ? products.join(", ")
                        : "No products recorded"}
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
                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
                      <div className="grid gap-3 text-sm sm:grid-cols-4">
                        <Detail
                          label="Area"
                          value={`${treatment.treatmentAreaSquareMetres.toLocaleString(
                            "en-GB",
                          )} m²`}
                        />

                        <Detail
                          label="Products recorded"
                          value={String(
                            getTreatmentApplications(
                              treatment,
                            ).length,
                          )}
                        />

                        <Detail
                          label="Product cost"
                          value={`£${getTreatmentTotalProductCost(
                            treatment,
                          ).toFixed(2)}`}
                        />

                        <Detail
                          label="Invoice"
                          value={
                            treatment.invoiceNumber ||
                            "Not recorded"
                          }
                        />
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Internal product applications
                        </div>

                        <HistoryApplicationList
                          applications={getTreatmentApplications(
                            treatment,
                          )}
                        />
                      </div>

                      <div className="mt-4">
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

function HistoryApplicationList({
  applications,
}: {
  applications: TreatmentApplication[];
}) {
  if (applications.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        No products were recorded for this visit.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {applications.map(
        (application) => (
          <div
            key={application.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="font-bold">
              {application.productName}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              {application.productType ||
                "Uncategorised"}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Detail
                label="Quantity"
                value={formatProductAmount(
                  application.productRequired,
                  application.productUnit,
                )}
              />

              <Detail
                label="Rate"
                value={
                  application.applicationRate >
                  0
                    ? `${application.applicationRate} ${application.applicationRateUnit}`
                    : "—"
                }
              />

              <Detail
                label="Water"
                value={
                  application.waterRequiredLitres >
                  0
                    ? `${application.waterRequiredLitres} L`
                    : "—"
                }
              />

              <Detail
                label="Cost"
                value={`£${application.estimatedProductCost.toFixed(
                  2,
                )}`}
              />
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function formatProductAmount(
  amount: number,
  unit: string,
) {
  if (!unit || amount <= 0) {
    return "Not recorded";
  }

  if (
    unit === "L" &&
    amount < 1
  ) {
    return `${(
      amount * 1000
    ).toFixed(1)} ml`;
  }

  if (
    unit === "kg" &&
    amount < 1
  ) {
    return `${(
      amount * 1000
    ).toFixed(1)} g`;
  }

  return `${amount.toFixed(
    3,
  )} ${unit}`;
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