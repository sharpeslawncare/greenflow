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

type VanCapacity = {
  vanNumber?: number;
  programmeVisits: number;
  additionalJobs: number;
  totalVisits: number;
  workloadUnits: number;
  totalLawnArea: number;
  expectedValue: number;
  groups: number[];
};

type DayCapacity = {
  date: string;
  programmeVisits: number;
  additionalJobs: number;
  totalVisits: number;
  workloadUnits: number;
  totalLawnArea: number;
  expectedValue: number;
  groups: number[];
  vans: number[];
  vanBreakdown: VanCapacity[];
};

type CapacityWorkItem = {
  source: "programme" | "additional";
  value: number;
  workloadUnits: number;
  lawnArea: number;
  groupNumber?: number;
  vanNumber?: number;
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

  const [expandedDate, setExpandedDate] = useState<
    string | null
  >(null);

  const days = useMemo(() => {
    const dates = Array.from({ length: 21 }, (_, index) =>
      shiftDateValue(windowStart, index),
    );

    return dates.map((date): DayCapacity => {
      const programmeWork: CapacityWorkItem[] =
        programmes.flatMap((programme) => {
          const customer = customers.find(
            (record) =>
              record.customerNumber ===
              programme.customerNumber,
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
              source: "programme" as const,
              value: customer.treatmentPrice ?? 0,
              workloadUnits: 1,
              lawnArea: customer.lawnSize ?? 0,
              groupNumber: customer.groupNumber,
              vanNumber: customer.vanNumber,
            }));
        });

      const additionalWork: CapacityWorkItem[] =
        customers.flatMap((customer) => {
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
              source: "additional" as const,
              value: job.price ?? 0,
              workloadUnits:
                getAdditionalJobWorkloadUnits(
                  job.treatmentName,
                ),
              lawnArea: customer.lawnSize ?? 0,
              groupNumber: customer.groupNumber,
              vanNumber: customer.vanNumber,
            }));
        });

      const allWork = [
        ...programmeWork,
        ...additionalWork,
      ];

      const vans = uniquePositiveNumbers(
        allWork.map((job) => job.vanNumber),
      );

      const vanKeys: Array<number | undefined> = [
        ...vans,
      ];

      if (
        allWork.some(
          (job) =>
            typeof job.vanNumber !== "number" ||
            !Number.isFinite(job.vanNumber) ||
            job.vanNumber <= 0,
        )
      ) {
        vanKeys.push(undefined);
      }

      const vanBreakdown = vanKeys.map(
        (vanNumber): VanCapacity => {
          const vanWork = allWork.filter((job) =>
            vanNumber === undefined
              ? typeof job.vanNumber !== "number" ||
                !Number.isFinite(job.vanNumber) ||
                job.vanNumber <= 0
              : job.vanNumber === vanNumber,
          );

          return {
            vanNumber,
            programmeVisits: vanWork.filter(
              (job) => job.source === "programme",
            ).length,
            additionalJobs: vanWork.filter(
              (job) => job.source === "additional",
            ).length,
            totalVisits: vanWork.length,
            workloadUnits: vanWork.reduce(
              (total, job) =>
                total + job.workloadUnits,
              0,
            ),
            totalLawnArea: vanWork.reduce(
              (total, job) =>
                total + job.lawnArea,
              0,
            ),
            expectedValue: vanWork.reduce(
              (total, job) => total + job.value,
              0,
            ),
            groups: uniquePositiveNumbers(
              vanWork.map(
                (job) => job.groupNumber,
              ),
            ),
          };
        },
      );

      return {
        date,
        programmeVisits: programmeWork.length,
        additionalJobs: additionalWork.length,
        totalVisits: allWork.length,
        workloadUnits: allWork.reduce(
          (total, job) =>
            total + job.workloadUnits,
          0,
        ),
        totalLawnArea: allWork.reduce(
          (total, job) =>
            total + job.lawnArea,
          0,
        ),
        expectedValue: allWork.reduce(
          (total, job) => total + job.value,
          0,
        ),
        groups: uniquePositiveNumbers(
          allWork.map(
            (job) => job.groupNumber,
          ),
        ),
        vans,
        vanBreakdown,
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
            summary.programmeVisits +
            day.programmeVisits,
          additionalJobs:
            summary.additionalJobs +
            day.additionalJobs,
          totalVisits:
            summary.totalVisits +
            day.totalVisits,
          workloadUnits:
            summary.workloadUnits +
            day.workloadUnits,
          totalLawnArea:
            summary.totalLawnArea +
            day.totalLawnArea,
          expectedValue:
            summary.expectedValue +
            day.expectedValue,
        }),
        {
          programmeVisits: 0,
          additionalJobs: 0,
          totalVisits: 0,
          workloadUnits: 0,
          totalLawnArea: 0,
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
                See programme visits and additional jobs
                together before arranging the day&apos;s
                routes.
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
                  setWindowStart(
                    getTodayDateValue(),
                  )
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

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <SummaryCard
              label="Total visits"
              value={String(totals.totalVisits)}
              detail="Across this 21-day window"
            />
            <SummaryCard
              label="Programme"
              value={String(
                totals.programmeVisits,
              )}
              detail="Seasonal programme visits"
            />
            <SummaryCard
              label="Additional jobs"
              value={String(
                totals.additionalJobs,
              )}
              detail="Scheduled extra work"
            />
            <SummaryCard
              label="Workload units"
              value={String(
                totals.workloadUnits,
              )}
              detail="Weighted operational workload"
            />
            <SummaryCard
              label="Lawn area"
              value={`${totals.totalLawnArea.toLocaleString(
                "en-GB",
              )} m²`}
              detail="Total treatment area in this window"
            />
            <SummaryCard
              label="Expected value"
              value={`£${totals.expectedValue.toFixed(
                2,
              )}`}
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
                  Capacity uses both weighted workload and
                  total lawn area. Programme visits = 1
                  unit, Aeration = 2, Scarification = 3,
                  Overseeding = 2, and other additional
                  jobs = 1. Lawn area is assessed
                  separately: 4,000 m² is Busy, 4,750 m²
                  is a Big day, and 5,500 m² is Very busy.
                  The day uses whichever measure gives the
                  higher workload rating.
                </p>
              </div>

              <Link
                href="/additional-jobs"
                className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100"
              >
                Additional Jobs Planner
              </Link>
            </div>

            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              <strong>Van balance:</strong>{" "}
              use the new Van balance button on any
              working day to compare visits, workload
              units, lawn area, value and customer groups
              for each van. GreenFlow does not apply new
              per-van capacity rules here; it shows the
              underlying figures so you can judge the
              balance before changing the schedule.
            </div>

            <div className="mt-5 overflow-x-auto">
              <div className="min-w-[1120px] overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[1.4fr_90px_100px_70px_80px_105px_115px_120px_1.5fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>Date</span>
                  <span>Programme</span>
                  <span>Additional</span>
                  <span>Total</span>
                  <span>Units</span>
                  <span>Lawn area</span>
                  <span>Expected £</span>
                  <span>Capacity</span>
                  <span>Open</span>
                </div>

                {days.map((day) => {
                  const busiestVan =
                    getBusiestVanKey(
                      day.vanBreakdown,
                    );

                  const isExpanded =
                    expandedDate === day.date;

                  return (
                    <div
                      key={day.date}
                      className="border-t border-slate-100"
                    >
                      <div
                        className={`grid grid-cols-[1.4fr_90px_100px_70px_80px_105px_115px_120px_1.5fr] items-center gap-3 px-4 py-3 text-sm ${
                          day.date ===
                          getTodayDateValue()
                            ? "bg-green-50/60"
                            : "bg-white"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            {formatDateWithDay(
                              day.date,
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {day.groups.length > 0
                              ? `Groups ${day.groups.join(
                                  ", ",
                                )}`
                              : "No groups"}
                            {" · "}
                            {day.vans.length > 0
                              ? `Vans ${day.vans.join(
                                  ", ",
                                )}`
                              : "No assigned vans"}
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
                          {day.totalLawnArea.toLocaleString(
                            "en-GB",
                          )}{" "}
                          m²
                        </span>

                        <span className="font-bold">
                          £
                          {day.expectedValue.toFixed(
                            2,
                          )}
                        </span>

                        <CapacityBadge
                          workloadUnits={
                            day.workloadUnits
                          }
                          totalLawnArea={
                            day.totalLawnArea
                          }
                        />

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

                          {day.totalVisits > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedDate(
                                  isExpanded
                                    ? null
                                    : day.date,
                                )
                              }
                              className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
                            >
                              {isExpanded
                                ? "Hide van balance"
                                : "Van balance"}
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-slate-50 px-4 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">
                                Van balance
                              </div>
                              <h3 className="mt-1 font-bold text-slate-950">
                                {formatDateWithDay(
                                  day.date,
                                )}
                              </h3>
                              <p className="mt-1 text-xs leading-5 text-slate-600">
                                Compare the work allocated
                                to each van before adjusting
                                Groups &amp; Routes.
                              </p>
                            </div>

                            <Link
                              href={`/routes?date=${day.date}`}
                              className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-50"
                            >
                              Open Groups &amp; Routes
                            </Link>
                          </div>

                          {day.vanBreakdown.length === 0 ? (
                            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                              No work is scheduled for this
                              date.
                            </div>
                          ) : (
                            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {day.vanBreakdown.map(
                                (van) => (
                                  <VanCapacityCard
                                    key={
                                      van.vanNumber ??
                                      "unassigned"
                                    }
                                    van={van}
                                    busiest={
                                      getVanKey(van) ===
                                      busiestVan
                                    }
                                  />
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function VanCapacityCard({
  van,
  busiest,
}: {
  van: VanCapacity;
  busiest: boolean;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {van.vanNumber
              ? `Van ${van.vanNumber}`
              : "Unassigned"}
          </div>
          <div className="mt-1 text-2xl font-black text-slate-950">
            {van.workloadUnits} units
          </div>
        </div>

        {busiest &&
          van.totalVisits > 0 && (
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-800">
              Highest workload
            </span>
          )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <VanMetric
          label="Visits"
          value={String(van.totalVisits)}
        />
        <VanMetric
          label="Lawn area"
          value={`${van.totalLawnArea.toLocaleString(
            "en-GB",
          )} m²`}
        />
        <VanMetric
          label="Programme"
          value={String(van.programmeVisits)}
        />
        <VanMetric
          label="Additional"
          value={String(van.additionalJobs)}
        />
        <VanMetric
          label="Expected"
          value={`£${van.expectedValue.toFixed(
            2,
          )}`}
        />
        <VanMetric
          label="Groups"
          value={
            van.groups.length > 0
              ? van.groups.join(", ")
              : "None"
          }
        />
      </div>
    </article>
  );
}

function VanMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function getVanKey(van: VanCapacity) {
  return van.vanNumber === undefined
    ? "unassigned"
    : String(van.vanNumber);
}

function getBusiestVanKey(
  vans: VanCapacity[],
) {
  if (vans.length === 0) {
    return "";
  }

  const sorted = [...vans].sort(
    (first, second) => {
      if (
        second.workloadUnits !==
        first.workloadUnits
      ) {
        return (
          second.workloadUnits -
          first.workloadUnits
        );
      }

      if (
        second.totalLawnArea !==
        first.totalLawnArea
      ) {
        return (
          second.totalLawnArea -
          first.totalLawnArea
        );
      }

      return (
        second.totalVisits -
        first.totalVisits
      );
    },
  );

  return getVanKey(sorted[0]);
}

function CapacityBadge({
  workloadUnits,
  totalLawnArea,
}: {
  workloadUnits: number;
  totalLawnArea: number;
}) {
  const unitLevel =
    workloadUnits >= 50
      ? 4
      : workloadUnits >= 40
        ? 2
        : workloadUnits === 0
          ? 0
          : 1;

  const areaLevel =
    totalLawnArea >= 5500
      ? 4
      : totalLawnArea >= 4750
        ? 3
        : totalLawnArea >= 4000
          ? 2
          : totalLawnArea === 0
            ? 0
            : 1;

  const level = Math.max(
    unitLevel,
    areaLevel,
  );

  const label =
    level === 4
      ? "Very busy"
      : level === 3
        ? "Big day"
        : level === 2
          ? "Busy"
          : level === 0
            ? "Empty"
            : "Available";

  const styles =
    level === 4
      ? "border-red-200 bg-red-50 text-red-800"
      : level === 3
        ? "border-orange-200 bg-orange-50 text-orange-800"
        : level === 2
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : level === 0
            ? "border-slate-200 bg-slate-50 text-slate-500"
            : "border-green-200 bg-green-50 text-green-800";

  const reason =
    areaLevel > unitLevel
      ? `${totalLawnArea.toLocaleString(
          "en-GB",
        )} m² lawn area`
      : unitLevel > areaLevel
        ? `${workloadUnits} workload units`
        : level > 1
          ? `${workloadUnits} units · ${totalLawnArea.toLocaleString(
              "en-GB",
            )} m²`
          : "";

  return (
    <div>
      <span
        className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${styles}`}
      >
        {label}
      </span>
      {reason && (
        <div className="mt-1 text-[11px] font-semibold text-slate-500">
          {reason}
        </div>
      )}
    </div>
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
      ((treatment.programmeId ===
        programmeId &&
        treatment.programmeVisitId ===
          visitId) ||
        (!treatment.programmeVisitId &&
          treatment.customerNumber ===
            customerNumber &&
          treatment.scheduledDate ===
            scheduledDate &&
          treatment.treatmentName ===
            treatmentName)),
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