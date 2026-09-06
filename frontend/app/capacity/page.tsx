"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";
import { useProgrammeStore } from "@/components/programme-store";
import { useTreatmentStore } from "@/components/treatment-store";
import {
  formatDateWithDay,
  getTodayDateValue,
  parseDate,
} from "@/lib/date-utils";

type DayCapacity = {
  date: string;
  programmeVisits: number;
  additionalJobs: number;
  totalVisits: number;
  workloadUnits: number;
  expectedValue: number;
  groups: number[];
  vans: number[];
};

export default function CapacityPage() {
  const { customers, ready: customersReady } =
    useCustomerStore();
  const { programmes, ready: programmesReady } =
    useProgrammeStore();
  const { treatments, ready: treatmentsReady } =
    useTreatmentStore();

  const [windowStart, setWindowStart] = useState(
    getTodayDateValue(),
  );

  const days = useMemo(() => {
    const dates = Array.from({ length: 21 }, (_, index) =>
      shiftDateValue(windowStart, index),
    );

    return dates.map((date): DayCapacity => {
      const programmeWork = programmes.flatMap((programme) => {
        const customer = customers.find(
          (record) =>
            record.customerNumber === programme.customerNumber,
        );

        if (!customer || customer.status !== "Active") {
          return [];
        }

        return programme.visits
          .filter(
            (visit) =>
              visit.scheduledDate === date &&
              (visit.status === "Scheduled" ||
                visit.status === "Planned"),
          )
          .filter(
            (visit) =>
              !hasFinalProgrammeOutcome(
                treatments,
                programme.id,
                visit.id,
                customer.customerNumber,
                visit.scheduledDate,
                visit.treatmentName,
              ),
          )
          .map(() => ({
            value: customer.treatmentPrice ?? 0,
            workloadUnits: 1,
            groupNumber: customer.groupNumber,
            vanNumber: customer.vanNumber,
          }));
      });

      const additionalWork = customers.flatMap((customer) => {
        if (customer.status !== "Active") {
          return [];
        }

        return (customer.additionalJobs ?? [])
          .filter(
            (job) =>
              job.status === "Scheduled" &&
              job.scheduledDate === date,
          )
          .map((job) => ({
            value: job.price ?? 0,
            workloadUnits: getAdditionalJobWorkloadUnits(
              job.treatmentName,
            ),
            groupNumber: customer.groupNumber,
            vanNumber: customer.vanNumber,
          }));
      });

      const allWork = [...programmeWork, ...additionalWork];

      return {
        date,
        programmeVisits: programmeWork.length,
        additionalJobs: additionalWork.length,
        totalVisits: allWork.length,
        workloadUnits: allWork.reduce(
          (total, job) => total + job.workloadUnits,
          0,
        ),
        expectedValue: allWork.reduce(
          (total, job) => total + job.value,
          0,
        ),
        groups: uniquePositiveNumbers(
          allWork.map((job) => job.groupNumber),
        ),
        vans: uniquePositiveNumbers(
          allWork.map((job) => job.vanNumber),
        ),
      };
    });
  }, [
    customers,
    programmes,
    treatments,
    windowStart,
  ]);

  const totals = useMemo(
    () =>
      days.reduce(
        (summary, day) => ({
          programmeVisits:
            summary.programmeVisits + day.programmeVisits,
          additionalJobs:
            summary.additionalJobs + day.additionalJobs,
          totalVisits:
            summary.totalVisits + day.totalVisits,
          workloadUnits:
            summary.workloadUnits + day.workloadUnits,
          expectedValue:
            summary.expectedValue + day.expectedValue,
        }),
        {
          programmeVisits: 0,
          additionalJobs: 0,
          totalVisits: 0,
          workloadUnits: 0,
          expectedValue: 0,
        },
      ),
    [days],
  );

  const ready =
    customersReady &&
    programmesReady &&
    treatmentsReady;

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading working day capacity...
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
                Operations
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                Working Day Capacity
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                See programme visits and additional jobs together before
                arranging the day&apos;s routes.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setWindowStart((current) =>
                    shiftDateValue(current, -7),
                  )
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                ← Previous 7 days
              </button>

              <button
                type="button"
                onClick={() =>
                  setWindowStart(getTodayDateValue())
                }
                className="rounded-xl border border-[#338b45] bg-green-50 px-4 py-2.5 text-sm font-semibold text-[#176b37] hover:bg-green-100"
              >
                Today
              </button>

              <button
                type="button"
                onClick={() =>
                  setWindowStart((current) =>
                    shiftDateValue(current, 7),
                  )
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Next 7 days →
              </button>
            </div>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="Total visits"
              value={String(totals.totalVisits)}
              detail="Across this 21-day window"
            />
            <SummaryCard
              label="Programme"
              value={String(totals.programmeVisits)}
              detail="Seasonal programme visits"
            />
            <SummaryCard
              label="Additional jobs"
              value={String(totals.additionalJobs)}
              detail="Scheduled extra work"
            />
            <SummaryCard
              label="Workload units"
              value={String(totals.workloadUnits)}
              detail="Weighted operational workload"
            />
            <SummaryCard
              label="Expected value"
              value={`£${totals.expectedValue.toFixed(2)}`}
              detail="Programme + additional work"
            />
          </section>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">
                  21-day planning window
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Capacity uses weighted workload rather than raw visit count:
                  programme visits = 1 unit, Aeration = 2, Scarification = 3,
                  Overseeding = 2, and other additional jobs = 1. A high
                  number of normal treatment visits can therefore remain
                  manageable.
                </p>
              </div>

              <Link
                href="/additional-jobs"
                className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100"
              >
                Additional Jobs Planner
              </Link>
            </div>

            <div className="mt-5 overflow-x-auto">
              <div className="min-w-[980px] overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[1.4fr_95px_105px_80px_95px_125px_120px_1.5fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>Date</span>
                  <span>Programme</span>
                  <span>Additional</span>
                  <span>Total</span>
                  <span>Units</span>
                  <span>Expected £</span>
                  <span>Capacity</span>
                  <span>Open</span>
                </div>

                {days.map((day) => (
                  <div
                    key={day.date}
                    className={`grid grid-cols-[1.4fr_95px_105px_80px_95px_125px_120px_1.5fr] items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm ${
                      day.date === getTodayDateValue()
                        ? "bg-green-50/60"
                        : "bg-white"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {formatDateWithDay(day.date)}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {day.groups.length > 0
                          ? `Groups ${day.groups.join(", ")}`
                          : "No groups"}
                        {" · "}
                        {day.vans.length > 0
                          ? `Vans ${day.vans.join(", ")}`
                          : "No vans"}
                      </div>
                    </div>

                    <span className="font-semibold">
                      {day.programmeVisits}
                    </span>

                    <span className="font-semibold text-amber-800">
                      {day.additionalJobs}
                    </span>

                    <span className="text-lg font-bold">
                      {day.totalVisits}
                    </span>

                    <span className="font-bold">
                      {day.workloadUnits}
                    </span>

                    <span className="font-bold">
                      £{day.expectedValue.toFixed(2)}
                    </span>

                    <CapacityBadge workloadUnits={day.workloadUnits} />

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/jobs?date=${day.date}`}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Jobs
                      </Link>

                      <Link
                        href={`/routes?date=${day.date}`}
                        className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100"
                      >
                        Routes
                      </Link>

                      <Link
                        href={`/visit-centre?date=${day.date}`}
                        className="rounded-lg bg-[#176b37] px-3 py-2 text-xs font-bold text-white hover:bg-[#125b2f]"
                      >
                        Visit Centre
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function CapacityBadge({
  workloadUnits,
}: {
  workloadUnits: number;
}) {
  const label =
    workloadUnits >= 50
      ? "Very busy"
      : workloadUnits >= 40
        ? "Busy"
        : workloadUnits === 0
          ? "Empty"
          : "Available";

  const styles =
    workloadUnits >= 50
      ? "border-red-200 bg-red-50 text-red-800"
      : workloadUnits >= 40
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : workloadUnits === 0
          ? "border-slate-200 bg-slate-50 text-slate-500"
          : "border-green-200 bg-green-50 text-green-800";

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${styles}`}
    >
      {label}
    </span>
  );
}

function SummaryCard({
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

function hasFinalProgrammeOutcome(
  treatments: Array<{
    status: string;
    programmeId?: string;
    programmeVisitId?: string;
    customerNumber: string;
    scheduledDate: string;
    treatmentName: string;
  }>,
  programmeId: string,
  visitId: string,
  customerNumber: string,
  scheduledDate: string,
  treatmentName: string,
) {
  return treatments.some(
    (treatment) =>
      (treatment.status === "Completed" ||
        treatment.status === "Cancelled") &&
      ((treatment.programmeId === programmeId &&
        treatment.programmeVisitId === visitId) ||
        (!treatment.programmeVisitId &&
          treatment.customerNumber === customerNumber &&
          treatment.scheduledDate === scheduledDate &&
          treatment.treatmentName === treatmentName)),
  );
}

function uniquePositiveNumbers(
  values: Array<number | undefined>,
) {
  return Array.from(
    new Set(
      values.filter(
        (value): value is number =>
          typeof value === "number" &&
          Number.isFinite(value) &&
          value > 0,
      ),
    ),
  ).sort((a, b) => a - b);
}

function shiftDateValue(
  value: string,
  days: number,
) {
  const date = parseDate(
    value || getTodayDateValue(),
  );

  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function getAdditionalJobWorkloadUnits(
  treatmentName: string,
) {
  const normalised = treatmentName
    .trim()
    .toLowerCase();

  if (normalised.includes("scarif")) {
    return 3;
  }

  if (
    normalised.includes("aerat") ||
    normalised.includes("overseed")
  ) {
    return 2;
  }

  return 1;
}