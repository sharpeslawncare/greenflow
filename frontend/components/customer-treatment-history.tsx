"use client";

import { useTreatmentStore } from "@/components/treatment-store";

export function CustomerTreatmentHistory({
  customerNumber,
}: {
  customerNumber: string;
}) {
  const {
    getTreatmentsForCustomer,
    ready,
  } = useTreatmentStore();

  const treatments =
    getTreatmentsForCustomer(
      customerNumber,
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
          Complete a job from Today&apos;s
          Jobs to add the first record.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-[120px_145px_1.2fr_1.4fr_110px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span>Date</span>
        <span>Status</span>
        <span>Treatment</span>
        <span>Products</span>
        <span>Next visit</span>
      </div>

      <div className="max-h-[42vh] overflow-y-auto">
        {treatments.map((treatment) => {
          const products = [
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

          return (
            <div
              key={treatment.id}
              className="grid grid-cols-[120px_145px_1.2fr_1.4fr_110px] gap-3 border-t border-slate-100 px-4 py-3 text-sm"
            >
              <span className="text-slate-600">
                {treatment.completedDate
                  ? formatDate(
                      treatment.completedDate,
                    )
                  : formatDateTime(
                      treatment.recordedDate,
                    )}
              </span>

              <HistoryStatus
                status={treatment.status}
              />

              <div>
                <div className="font-semibold">
                  {treatment.treatmentName}
                </div>

                {treatment.notes && (
                  <div className="mt-1 text-xs text-slate-500">
                    {treatment.notes}
                  </div>
                )}
              </div>

              <span className="text-slate-600">
                {products ||
                  "No products recorded"}
              </span>

              <span className="text-slate-600">
                {treatment.nextVisitDate}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryStatus({
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
      className={`h-fit w-fit rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}
    >
      {status}
    </span>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(
    new Date(year, month - 1, day),
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(new Date(value));
}