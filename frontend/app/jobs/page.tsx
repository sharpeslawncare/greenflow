"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";
import {
  type CustomerProgramme,
  type ProgrammeVisit,
  useProgrammeStore,
} from "@/components/programme-store";
import {
  type TreatmentRecord,
  useTreatmentStore,
} from "@/components/treatment-store";
import {
  formatDateWithDay,
  getTodayDateValue,
} from "@/lib/date-utils";

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <main className="p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
              Loading scheduled jobs...
            </div>
          </main>
        </AppShell>
      }
    >
      <JobsPageContent />
    </Suspense>
  );
}

function JobsPageContent() {
  const searchParams =
    useSearchParams();

  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    programmes,
    ready: programmesReady,
  } = useProgrammeStore();

  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const requestedDate =
    searchParams.get("date");

  const requestedGroup =
    Number(
      searchParams.get("group") ??
        "0",
    );

  const requestedVan =
    Number(
      searchParams.get("van") ??
        "0",
    );

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    isDateValue(requestedDate)
      ? requestedDate
      : getTodayDateValue(),
  );

  const scheduledJobs =
    useMemo(() => {
      return programmes
        .flatMap((programme) => {
          const customer =
            customers.find(
              (item) =>
                item.customerNumber ===
                programme.customerNumber,
            );

          if (
            !customer ||
            customer.status !== "Active"
          ) {
            return [];
          }

          return programme.visits
            .filter(
              (visit) =>
                visit.scheduledDate ===
                  selectedDate &&
                (visit.status ===
                  "Scheduled" ||
                  visit.status ===
                    "Planned"),
            )
            .filter(
              (visit) =>
                !hasRecordedOutcome(
                  treatments,
                  programme,
                  visit,
                  customer.customerNumber,
                ),
            )
            .map((visit) => ({
              id: `${programme.id}-${visit.id}`,
              programme,
              visit,
              customer,
            }));
        })
        .filter(
          (job) =>
            (requestedGroup <= 0 ||
              job.customer
                .groupNumber ===
                requestedGroup) &&
            (requestedVan <= 0 ||
              job.customer.vanNumber ===
                requestedVan),
        )
        .sort(
          (first, second) => {
            if (
              first.customer
                .groupNumber !==
              second.customer
                .groupNumber
            ) {
              return (
                first.customer
                  .groupNumber -
                second.customer
                  .groupNumber
              );
            }

            if (
              first.customer
                .vanNumber !==
              second.customer
                .vanNumber
            ) {
              return (
                first.customer
                  .vanNumber -
                second.customer
                  .vanNumber
              );
            }

            return first.customer.fullName.localeCompare(
              second.customer.fullName,
            );
          },
        );
    }, [
      programmes,
      customers,
      selectedDate,
      requestedGroup,
      requestedVan,
    ]);

  const completedTreatments =
    useMemo(
      () =>
        treatments.filter(
          (treatment) =>
            treatment.status ===
              "Completed" &&
            (treatment.completedDate ===
              selectedDate ||
              treatment.scheduledDate ===
                selectedDate),
        ),
      [treatments, selectedDate],
    );

  const totalArea =
    scheduledJobs.reduce(
      (total, job) =>
        total +
        job.customer.lawnSize,
      0,
    );

  const expectedRevenue =
    scheduledJobs.reduce(
      (total, job) =>
        total +
        job.customer
          .treatmentPrice,
      0,
    );

  const groupNumbers =
    Array.from(
      new Set(
        scheduledJobs.map(
          (job) =>
            job.customer
              .groupNumber,
        ),
      ),
    ).sort(
      (first, second) =>
        first - second,
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
            Loading Today&apos;s
            Jobs...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <style jsx global>{`
        .jobs-print {
          display: none;
        }

        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        @media print {
          html,
          body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }

          aside {
            display: none !important;
          }

          .jobs-screen {
            display: none !important;
          }

          .jobs-print {
            display: block !important;
            width: 190mm;
            margin: 0 auto;
            color: #0f172a;
            font-family:
              Arial,
              Helvetica,
              sans-serif;
            font-size: 9pt;
            line-height: 1.3;
          }

          .jobs-print *,
          .jobs-print *::before,
          .jobs-print *::after {
            box-sizing: border-box;
          }

          .jobs-print table {
            width: 100%;
            border-collapse: collapse;
          }

          .jobs-print thead {
            display: table-header-group;
          }

          .jobs-print tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .jobs-print th,
          .jobs-print td {
            border-bottom: 1px solid #d1d5db;
            padding: 2.2mm 1.5mm;
            vertical-align: top;
          }

          .jobs-print th {
            text-align: left;
            color: #176b37;
            font-size: 7.5pt;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
        }
      `}</style>

      <main className="jobs-screen p-5 md:p-7">
        <div className="mx-auto max-w-[1500px]">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-3xl font-bold">
                Today&apos;s Jobs
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Review the scheduled
                workload, open the Visit
                Centre and print a compact
                working job sheet for the
                selected day.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Working date
                </span>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={
                      selectedDate
                    }
                    onChange={(
                      event,
                    ) =>
                      setSelectedDate(
                        event.target
                          .value,
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-[#338b45] focus:ring-4 focus:ring-green-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDate(
                        getTodayDateValue(),
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                  >
                    Today
                  </button>
                </div>
              </label>

              <button
                type="button"
                onClick={() =>
                  window.print()
                }
                disabled={
                  scheduledJobs.length ===
                  0
                }
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                Print Daily Job Sheet
              </button>

              <Link
                href={`/jobs/print?date=${selectedDate}${
                  requestedGroup > 0
                    ? `&group=${requestedGroup}`
                    : ""
                }${
                  requestedVan > 0
                    ? `&van=${requestedVan}`
                    : ""
                }`}
                className={`rounded-xl border border-[#338b45] bg-white px-5 py-2.5 text-sm font-bold text-[#176b37] hover:bg-green-50 ${
                  scheduledJobs.length === 0
                    ? "pointer-events-none opacity-50"
                    : ""
                }`}
              >
                Print Customer Sheets
              </Link>

              <Link
                href={`/visit-centre?date=${selectedDate}${
                  requestedGroup > 0
                    ? `&group=${requestedGroup}`
                    : ""
                }${
                  requestedVan > 0
                    ? `&van=${requestedVan}`
                    : ""
                }`}
                className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#125b2f]"
              >
                Open Visit Centre
              </Link>
            </div>
          </header>

          {(requestedGroup > 0 ||
            requestedVan > 0) && (
            <section className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              Showing{" "}
              {requestedGroup > 0
                ? `Group ${requestedGroup}`
                : "all groups"}
              {requestedVan > 0
                ? ` · Van ${requestedVan}`
                : ""}
              .
              <Link
                href={`/jobs?date=${selectedDate}`}
                className="ml-2 font-bold underline"
              >
                Clear filter
              </Link>
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Scheduled"
              value={String(
                scheduledJobs.length,
              )}
              detail={formatDateWithDay(
                selectedDate,
              )}
            />

            <SummaryCard
              label="Completed"
              value={String(
                completedTreatments.length,
              )}
              detail="Treatment records on this date"
            />

            <SummaryCard
              label="Lawn area"
              value={`${totalArea.toLocaleString(
                "en-GB",
              )} m²`}
              detail="Remaining scheduled work"
            />

            <SummaryCard
              label="Expected revenue"
              value={`£${expectedRevenue.toFixed(
                2,
              )}`}
              detail="Remaining scheduled work"
            />
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold">
                  Daily workload
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Jobs are grouped by
                  customer group and then
                  listed by customer name.
                </p>
              </div>

              {groupNumbers.length >
                0 && (
                <div className="text-sm font-semibold text-slate-600">
                  Groups{" "}
                  {groupNumbers.join(
                    ", ",
                  )}
                </div>
              )}
            </div>

            {scheduledJobs.length ===
            0 ? (
              <div className="p-12 text-center text-slate-500">
                No remaining scheduled
                jobs for{" "}
                {formatDateWithDay(
                  selectedDate,
                )}
                .
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[980px]">
                  <div className="grid grid-cols-[60px_100px_1.2fr_1.7fr_1.3fr_95px_95px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <span>#</span>
                    <span>Customer</span>
                    <span>Name</span>
                    <span>Address</span>
                    <span>Treatment</span>
                    <span>Area</span>
                    <span>Price</span>
                  </div>

                  {scheduledJobs.map(
                    (job, index) => (
                      <div
                        key={job.id}
                        className="grid grid-cols-[60px_100px_1.2fr_1.7fr_1.3fr_95px_95px] items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm hover:bg-green-50/40"
                      >
                        <span className="font-bold text-slate-400">
                          {index + 1}
                        </span>

                        <Link
                          href={`/customers/${job.customer.customerNumber}`}
                          className="font-bold text-[#176b37] hover:underline"
                        >
                          {
                            job.customer
                              .customerNumber
                          }
                        </Link>

                        <div>
                          <div className="font-semibold">
                            {
                              job.customer
                                .fullName
                            }
                          </div>

                          <div className="mt-0.5 text-xs text-slate-500">
                            Group{" "}
                            {
                              job.customer
                                .groupNumber
                            }
                            {job.customer
                              .vanNumber >
                              0
                              ? ` · Van ${job.customer.vanNumber}`
                              : ""}
                          </div>
                        </div>

                        <span className="text-slate-600">
                          {
                            job.customer
                              .address
                          }
                          ,{" "}
                          {
                            job.customer
                              .postcode
                          }
                        </span>

                        <span className="font-semibold">
                          {
                            job.visit
                              .treatmentName
                          }
                        </span>

                        <span>
                          {job.customer.lawnSize.toLocaleString(
                            "en-GB",
                          )}{" "}
                          m²
                        </span>

                        <span className="font-bold">
                          £
                          {job.customer.treatmentPrice.toFixed(
                            2,
                          )}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <section className="jobs-print">
        <header className="mb-[5mm] border-b-2 border-[#176b37] pb-[3mm]">
          <div className="flex items-end justify-between gap-[8mm]">
            <div>
              <div className="text-[18pt] font-bold text-[#176b37]">
                Sharpes Lawn Care
              </div>

              <div className="mt-[1mm] text-[8pt] text-slate-500">
                Daily Job Sheet · Powered
                by GreenFlow
              </div>
            </div>

            <div className="text-right">
              <div className="text-[13pt] font-bold">
                {formatDateWithDay(
                  selectedDate,
                )}
              </div>

              <div className="mt-[1mm] text-[8pt] text-slate-600">
                {requestedGroup > 0
                  ? `Group ${requestedGroup}`
                  : groupNumbers.length ===
                      1
                    ? `Group ${groupNumbers[0]}`
                    : `${groupNumbers.length} groups`}
                {requestedVan > 0
                  ? ` · Van ${requestedVan}`
                  : ""}
              </div>
            </div>
          </div>

          <div className="mt-[3mm] grid grid-cols-3 gap-[4mm] border-t border-slate-200 pt-[2mm] text-[8pt]">
            <PrintStat
              label="Jobs"
              value={String(
                scheduledJobs.length,
              )}
            />

            <PrintStat
              label="Lawn area"
              value={`${totalArea.toLocaleString(
                "en-GB",
              )} m²`}
            />

            <PrintStat
              label="Expected revenue"
              value={`£${expectedRevenue.toFixed(
                2,
              )}`}
            />
          </div>
        </header>

        <table>
          <thead>
            <tr>
              <th className="w-[7mm]">
                #
              </th>
              <th className="w-[20mm]">
                Customer
              </th>
              <th className="w-[34mm]">
                Name
              </th>
              <th>Address</th>
              <th className="w-[36mm]">
                Treatment
              </th>
              <th className="w-[18mm]">
                Area
              </th>
              <th className="w-[17mm]">
                Price
              </th>
            </tr>
          </thead>

          <tbody>
            {scheduledJobs.map(
              (job, index) => (
                <tr key={job.id}>
                  <td className="font-bold text-slate-500">
                    {index + 1}
                  </td>

                  <td>
                    <div className="font-bold">
                      {
                        job.customer
                          .customerNumber
                      }
                    </div>

                    <div className="text-[7pt] text-slate-500">
                      G
                      {
                        job.customer
                          .groupNumber
                      }
                    </div>
                  </td>

                  <td className="font-semibold">
                    {
                      job.customer
                        .fullName
                    }
                  </td>

                  <td>
                    {
                      job.customer
                        .address
                    }
                    ,{" "}
                    {
                      job.customer
                        .postcode
                    }
                  </td>

                  <td>
                    {
                      job.visit
                        .treatmentName
                    }
                  </td>

                  <td>
                    {job.customer.lawnSize.toLocaleString(
                      "en-GB",
                    )}{" "}
                    m²
                  </td>

                  <td className="font-bold">
                    £
                    {job.customer.treatmentPrice.toFixed(
                      2,
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>

        <footer className="mt-[5mm] border-t border-slate-300 pt-[3mm]">
          <div className="text-[7.5pt] font-bold uppercase tracking-wide text-[#176b37]">
            Notes
          </div>

          <div className="mt-[2mm] space-y-[3mm]">
            {Array.from({
              length: 3,
            }).map((_, index) => (
              <div
                key={index}
                className="h-[3mm] border-b border-dashed border-slate-300"
              />
            ))}
          </div>
        </footer>
      </section>
    </AppShell>
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
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-2xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </article>
  );
}

function PrintStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-[7pt] uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-[0.5mm] font-bold">
        {value}
      </div>
    </div>
  );
}

function hasRecordedOutcome(
  treatments: TreatmentRecord[],
  programme: CustomerProgramme,
  visit: ProgrammeVisit,
  customerNumber: string,
) {
  return treatments.some(
    (treatment) =>
      (
        treatment.status === "Completed" ||
        treatment.status === "Cancelled"
      ) &&
      (
        (
          treatment.programmeId === programme.id &&
          treatment.programmeVisitId === visit.id
        ) ||
        (
          !treatment.programmeVisitId &&
          treatment.customerNumber === customerNumber &&
          treatment.scheduledDate === visit.scheduledDate &&
          treatment.treatmentName === visit.treatmentName
        )
      ),
  );
}

function isDateValue(
  value: string | null,
): value is string {
  return Boolean(
    value &&
      /^\d{4}-\d{2}-\d{2}$/.test(
        value,
      ),
  );
}