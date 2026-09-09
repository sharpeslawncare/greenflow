"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import {
  type AdditionalCustomerJob,
  type StoredCustomer,
  useCustomerStore,
} from "@/components/customer-store";
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

import {
  useRouteOrderStore,
} from "@/components/route-order-store";

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
    saveProgramme,
    canScheduleDate,
  } = useProgrammeStore();

  const {
    treatments,
    ready: treatmentsReady,
    updateTreatment,
  } = useTreatmentStore();

  const {
    ready: routeOrderReady,
    sortBySavedRoute,
  } = useRouteOrderStore();

  const requestedDate =
    searchParams.get("date");

  const requestedAttention =
    searchParams.get("attention");

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
      const seasonalItems =
        programmes.flatMap(
          (programme) => {
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
                source:
                  "programme" as const,
                programme,
                visit,
                customer,
                price:
                  customer.treatmentPrice,
              }));
          },
        );

      const additionalItems =
        customers.flatMap(
          (customer) => {
            if (
              customer.status !== "Active"
            ) {
              return [];
            }

            return customer.additionalJobs
              .filter(
                (job) =>
                  job.status ===
                    "Scheduled" &&
                  job.scheduledDate ===
                    selectedDate,
              )
              .map((job) => {
                const programme =
                  createAdditionalJobProgramme(
                    customer,
                    job,
                  );

                return {
                  id: `additional-${job.id}`,
                  source:
                    "additional" as const,
                  programme,
                  visit:
                    programme.visits[0],
                  customer,
                  price: job.price,
                  additionalJob: job,
                };
              });
          },
        );

      const items = [
        ...seasonalItems,
        ...additionalItems,
      ].filter(
        (job) =>
          (requestedGroup <= 0 ||
            job.customer
              .groupNumber ===
              requestedGroup) &&
          (requestedVan <= 0 ||
            job.customer.vanNumber ===
              requestedVan),
      );

      return sortBySavedRoute(
        items,
        selectedDate,
      );
    }, [
      programmes,
      customers,
      treatments,
      selectedDate,
      requestedGroup,
      requestedVan,
      sortBySavedRoute,
    ]);

  const visitsNeedingRescheduling =
    useMemo(() => {
      return treatments
        .filter(
          (treatment) =>
            treatment.status === "Needs Rescheduling",
        )
        .map((treatment) => ({
          treatment,
          customer: customers.find(
            (item) =>
              item.customerNumber === treatment.customerNumber,
          ),
        }))
        .sort((first, second) =>
          first.treatment.scheduledDate.localeCompare(
            second.treatment.scheduledDate,
          ),
        );
    }, [treatments, customers]);

  const showReschedulingAttention =
    requestedAttention === "rescheduling" ||
    visitsNeedingRescheduling.length > 0;

  const [rescheduleDates, setRescheduleDates] =
    useState<Record<string, string>>({});

  const [rescheduleMessages, setRescheduleMessages] =
    useState<
      Record<
        string,
        {
          tone: "success" | "error";
          text: string;
        }
      >
    >({});

  const [
    manualProgrammeVisitIds,
    setManualProgrammeVisitIds,
  ] = useState<Record<string, string>>({});

  useEffect(() => {
    setRescheduleDates((current) => {
      const next = { ...current };
      let changed = false;

      visitsNeedingRescheduling.forEach(({ treatment }) => {
        if (!next[treatment.id] && treatment.nextVisitDate) {
          next[treatment.id] = treatment.nextVisitDate;
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [visitsNeedingRescheduling]);

  function setRescheduleMessage(
    treatmentId: string,
    tone: "success" | "error",
    text: string,
  ) {
    setRescheduleMessages((current) => ({
      ...current,
      [treatmentId]: {
        tone,
        text,
      },
    }));
  }

  function resolveReschedulingTreatment(
    treatment: TreatmentRecord,
  ) {
    const replacementDate =
      rescheduleDates[treatment.id]?.trim() ||
      treatment.nextVisitDate.trim();

    if (!isDateValue(replacementDate)) {
      setRescheduleMessage(
        treatment.id,
        "error",
        "Choose a valid replacement date first.",
      );
      return;
    }

    if (
      !canScheduleDate(
        treatment.customerNumber,
        replacementDate,
      )
    ) {
      setRescheduleMessage(
        treatment.id,
        "error",
        "That replacement date is not valid for this active customer.",
      );
      return;
    }

    const linked =
      findLinkedProgrammeVisit(
        programmes,
        treatment,
      ) ??
      findProgrammeVisitBySelection(
        programmes,
        treatment.customerNumber,
        manualProgrammeVisitIds[
          treatment.id
        ],
      );

    if (!linked) {
      setRescheduleMessage(
        treatment.id,
        "error",
        "Choose the programme visit that this failed treatment belongs to before repairing the schedule.",
      );
      return;
    }

    const { programme, visit } = linked;

    if (
      visit.status === "Completed" ||
      visit.status === "Skipped"
    ) {
      setRescheduleMessage(
        treatment.id,
        "error",
        "The linked programme visit is already final and cannot be rescheduled here.",
      );
      return;
    }

    const originalDate =
      treatment.scheduledDate || visit.scheduledDate;

    const updatedProgramme: CustomerProgramme = {
      ...programme,
      visits: programme.visits.map((item) =>
        item.id === visit.id
          ? {
              ...item,
              scheduledDate: replacementDate,
              status: "Scheduled",
              notes: appendProgrammeNote(
                item.notes,
                createRescheduleRepairNote(
                  originalDate,
                  replacementDate,
                ),
              ),
            }
          : item,
      ),
    };

    const programmeResult =
      saveProgramme(updatedProgramme);

    if (!programmeResult.success) {
      setRescheduleMessage(
        treatment.id,
        "error",
        programmeResult.message ||
          "The programme could not be updated.",
      );
      return;
    }

    const treatmentResult =
      updateTreatment({
        ...treatment,
        status: "Rescheduled",
        nextVisitDate: replacementDate,
        notes: appendProgrammeNote(
          treatment.notes,
          `Replacement visit arranged for ${formatDateWithDay(
            replacementDate,
          )}.`,
        ),
      });

    if (!treatmentResult.success) {
      setRescheduleMessage(
        treatment.id,
        "error",
        treatmentResult.message ||
          "The programme was updated, but the treatment record could not be marked as rescheduled. Review Treatment Records.",
      );
      return;
    }

    setSelectedDate(replacementDate);
    setRescheduleMessage(
      treatment.id,
      "success",
      `Replacement visit scheduled for ${formatDateWithDay(
        replacementDate,
      )}. It will now appear in Jobs, Routes and Visit Centre on that date.`,
    );
  }

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
        total + job.price,
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
    treatmentsReady &&
    routeOrderReady;

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
          <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#176b37]">
                Schedule
              </div>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                Jobs
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Review the selected working day in saved route order, then move into route planning or Visit Centre.
              </p>
            </div>

            <Link
              href={`/?date=${selectedDate}`}
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← Dashboard
            </Link>
          </header>

          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Working date
                </div>
                <div className="mt-1 text-xl font-bold text-slate-950">
                  {formatDateWithDay(selectedDate)}
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-[#338b45] focus:ring-4 focus:ring-green-100"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate(getTodayDateValue())}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                >
                  Today
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Remaining jobs"
                value={String(scheduledJobs.length)}
                detail="Programme + Additional Jobs"
              />
              <SummaryCard
                label="Completed"
                value={String(completedTreatments.length)}
                detail="Treatment records on this date"
              />
              <SummaryCard
                label="Remaining area"
                value={`${totalArea.toLocaleString("en-GB")} m²`}
                detail="Scheduled lawn area"
              />
              <SummaryCard
                label="Remaining value"
                value={`£${expectedRevenue.toFixed(2)}`}
                detail="Scheduled work"
              />
            </div>
          </section>

          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#176b37]">
                  Working day
                </div>
                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  Review the day
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  Jobs are already shown in the saved route order. Check the day, adjust the route if needed, then complete the work in Visit Centre.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <JobsWorkflowCard
                number="1"
                title="Review jobs"
                detail={`${scheduledJobs.length} remaining · ${completedTreatments.length} completed`}
                state="current"
              />
              <JobsWorkflowCard
                number="2"
                title="Check route"
                detail="Change the saved working order only if needed."
                state="next"
                href={`/routes?date=${selectedDate}`}
              />
              <JobsWorkflowCard
                number="3"
                title="Complete work"
                detail="Record the day's outcomes in Visit Centre."
                state="later"
                href={`/visit-centre?date=${selectedDate}${
                  requestedGroup > 0 ? `&group=${requestedGroup}` : ""
                }${requestedVan > 0 ? `&van=${requestedVan}` : ""}`}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50 p-4">
              <div>
                <div className="font-bold text-green-950">
                  {scheduledJobs.length === 0
                    ? "No remaining scheduled work"
                    : `${scheduledJobs.length} job${scheduledJobs.length === 1 ? "" : "s"} ready`}
                </div>
                <div className="mt-1 text-sm text-green-800">
                  {scheduledJobs.length === 0
                    ? "This working date has no outstanding scheduled jobs."
                    : "Continue to the route if it needs checking, or go straight to Visit Centre when the order is already right."}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/routes?date=${selectedDate}`}
                  className="inline-flex items-center rounded-xl border border-green-300 bg-white px-4 py-3 text-sm font-bold text-green-800 hover:bg-green-100"
                >
                  Check route
                </Link>
                <Link
                  href={`/visit-centre?date=${selectedDate}${
                    requestedGroup > 0 ? `&group=${requestedGroup}` : ""
                  }${requestedVan > 0 ? `&van=${requestedVan}` : ""}`}
                  className="inline-flex items-center rounded-xl bg-[#176b37] px-5 py-3 text-sm font-bold text-white hover:bg-[#125b2f]"
                >
                  Open Visit Centre →
                </Link>
              </div>
            </div>
          </section>

          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Day tools
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Printing, customer reminders and Additional Jobs stay available without competing with the main workflow.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/jobs/print?date=${selectedDate}${
                    requestedGroup > 0 ? `&group=${requestedGroup}` : ""
                  }${requestedVan > 0 ? `&van=${requestedVan}` : ""}`}
                  className={`rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 ${
                    scheduledJobs.length === 0 ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  Customer sheets
                </Link>
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={scheduledJobs.length === 0}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Daily job sheet
                </button>
                <Link
                  href={`/communications?date=${selectedDate}`}
                  className={`rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 ${
                    scheduledJobs.length === 0 ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  Customer reminders
                </Link>
                <Link
                  href="/additional-jobs"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Additional Jobs
                </Link>
              </div>
            </div>
          </section>

          {showReschedulingAttention && (
            <section
              id="rescheduling"
              className="mb-4 overflow-hidden rounded-2xl border border-amber-300 bg-amber-50 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-amber-200 p-5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                    Requires attention
                  </div>
                  <h2 className="mt-1 text-xl font-bold text-amber-950">
                    Visits needing rescheduling
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-amber-900">
                    These visits need a new appointment. They are shown here
                    regardless of the working date selected above.
                  </p>
                </div>
                <div className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-center">
                  <div className="text-2xl font-bold text-amber-950">
                    {visitsNeedingRescheduling.length}
                  </div>
                  <div className="text-xs font-semibold text-amber-700">
                    outstanding
                  </div>
                </div>
              </div>

              {visitsNeedingRescheduling.length === 0 ? (
                <div className="p-5 text-sm font-semibold text-green-800">
                  ✓ No visits currently need rescheduling.
                </div>
              ) : (
                <div className="divide-y divide-amber-200">
                  {visitsNeedingRescheduling.map(
                    ({ treatment, customer }) => {
                      const automaticLinked =
                        findLinkedProgrammeVisit(
                          programmes,
                          treatment,
                        );

                      const manualCandidates =
                        getManualProgrammeVisitCandidates(
                          programmes,
                          treatment,
                        );

                      const selectedManualLink =
                        findProgrammeVisitBySelection(
                          programmes,
                          treatment.customerNumber,
                          manualProgrammeVisitIds[
                            treatment.id
                          ],
                        );

                      const linked =
                        automaticLinked ??
                        selectedManualLink;

                      const replacementDate =
                        rescheduleDates[treatment.id] ??
                        treatment.nextVisitDate ??
                        "";

                      const message =
                        rescheduleMessages[treatment.id];

                      return (
                        <div
                          key={treatment.id}
                          className="p-5"
                        >
                          <div className="grid gap-4 lg:grid-cols-[1.05fr_1.15fr_1fr] lg:items-start">
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
                                Customer
                              </div>
                              <div className="mt-1 font-bold text-amber-950">
                                {customer?.fullName ??
                                  `Customer ${treatment.customerNumber}`}
                              </div>
                              <div className="mt-0.5 text-xs text-amber-800">
                                Customer {treatment.customerNumber}
                                {customer
                                  ? ` · Group ${customer.groupNumber}${
                                      customer.vanNumber > 0
                                        ? ` · Van ${customer.vanNumber}`
                                        : ""
                                    }`
                                  : ""}
                              </div>

                              {customer && (
                                <Link
                                  href={`/customers/${customer.customerNumber}`}
                                  className="mt-3 inline-flex rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"
                                >
                                  Open customer
                                </Link>
                              )}
                            </div>

                            <div>
                              <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
                                Failed visit
                              </div>
                              <div className="mt-1 font-bold text-amber-950">
                                {treatment.treatmentName}
                              </div>
                              <div className="mt-0.5 text-xs text-amber-800">
                                Original date:{" "}
                                {treatment.scheduledDate
                                  ? formatDateWithDay(
                                      treatment.scheduledDate,
                                    )
                                  : "Not recorded"}
                              </div>

                              {treatment.notes && (
                                <div className="mt-2 whitespace-pre-wrap text-xs leading-5 text-amber-900">
                                  {treatment.notes}
                                </div>
                              )}

                              <div className="mt-3 text-xs text-amber-800">
                                {automaticLinked ? (
                                  <>
                                    Linked programme visit:{" "}
                                    <strong>
                                      {automaticLinked.visit.treatmentName}
                                    </strong>
                                    {" · "}
                                    currently{" "}
                                    <strong>
                                      {formatDateWithDay(
                                        automaticLinked.visit.scheduledDate,
                                      )}
                                    </strong>
                                  </>
                                ) : (
                                  <div className="rounded-xl border border-amber-300 bg-amber-100/60 p-3">
                                    <div className="font-bold text-amber-950">
                                      Programme link needs confirming
                                    </div>
                                    <p className="mt-1 leading-5">
                                      This is an older inconsistent record. Choose the existing programme visit that this failed treatment belongs to.
                                    </p>

                                    <select
                                      value={
                                        manualProgrammeVisitIds[
                                          treatment.id
                                        ] ?? ""
                                      }
                                      onChange={(event) => {
                                        const value =
                                          event.target.value;

                                        setManualProgrammeVisitIds(
                                          (current) => ({
                                            ...current,
                                            [treatment.id]:
                                              value,
                                          }),
                                        );

                                        setRescheduleMessages(
                                          (current) => {
                                            if (
                                              !current[
                                                treatment.id
                                              ]
                                            ) {
                                              return current;
                                            }

                                            const next = {
                                              ...current,
                                            };
                                            delete next[
                                              treatment.id
                                            ];
                                            return next;
                                          },
                                        );
                                      }}
                                      className="mt-2 w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                                    >
                                      <option value="">
                                        Choose programme visit
                                      </option>

                                      {manualCandidates.map(
                                        ({
                                          programme,
                                          visit,
                                        }) => (
                                          <option
                                            key={`${programme.id}::${visit.id}`}
                                            value={`${programme.id}::${visit.id}`}
                                          >
                                            Round {visit.visitNumber} · {visit.treatmentName} · {formatDateWithDay(visit.scheduledDate)} · {visit.status}
                                          </option>
                                        ),
                                      )}
                                    </select>

                                    {manualCandidates.length ===
                                      0 && (
                                      <div className="mt-2 font-semibold text-red-700">
                                        No editable programme visits are available for this customer.
                                      </div>
                                    )}

                                    {selectedManualLink && (
                                      <div className="mt-2 font-semibold text-green-800">
                                        Selected: Round{" "}
                                        {
                                          selectedManualLink
                                            .visit
                                            .visitNumber
                                        }{" "}
                                        ·{" "}
                                        {
                                          selectedManualLink
                                            .visit
                                            .treatmentName
                                        }{" "}
                                        · currently{" "}
                                        {formatDateWithDay(
                                          selectedManualLink
                                            .visit
                                            .scheduledDate,
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="rounded-xl border border-amber-300 bg-white p-4">
                              <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
                                Replacement appointment
                              </div>

                              <input
                                type="date"
                                value={replacementDate}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setRescheduleDates((current) => ({
                                    ...current,
                                    [treatment.id]: value,
                                  }));
                                  setRescheduleMessages((current) => {
                                    if (!current[treatment.id]) {
                                      return current;
                                    }
                                    const next = { ...current };
                                    delete next[treatment.id];
                                    return next;
                                  });
                                }}
                                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                              />

                              {treatment.nextVisitDate && (
                                <div className="mt-2 text-xs text-slate-500">
                                  Recorded replacement:{" "}
                                  <strong>
                                    {formatDateWithDay(
                                      treatment.nextVisitDate,
                                    )}
                                  </strong>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  resolveReschedulingTreatment(
                                    treatment,
                                  )
                                }
                                disabled={!linked}
                                className="mt-3 w-full rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                {treatment.nextVisitDate
                                  ? "Repair schedule"
                                  : "Schedule replacement"}
                              </button>

                              <p className="mt-2 text-xs leading-5 text-slate-500">
                                This moves the existing programme visit. It does not create a duplicate treatment.
                              </p>
                            </div>
                          </div>

                          {message && (
                            <div
                              className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                                message.tone === "success"
                                  ? "border-green-200 bg-green-50 text-green-800"
                                  : "border-red-200 bg-red-50 text-red-800"
                              }`}
                            >
                              {message.text}
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </section>
          )}

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

          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#176b37]">
                  Route-ordered schedule
                </div>
                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  Daily workload
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Jobs follow the saved
                  van route order for this
                  working date.
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

                        <div>
                          <div className="font-semibold">
                            {job.visit.treatmentName}
                          </div>
                          <div className="mt-1">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                job.source === "additional"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {job.source === "additional"
                                ? "Additional Job"
                                : "Programme"}
                            </span>
                          </div>
                        </div>

                        <span>
                          {job.customer.lawnSize.toLocaleString(
                            "en-GB",
                          )}{" "}
                          m²
                        </span>

                        <span className="font-bold">
                          £
                          {job.price.toFixed(
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
                    {job.price.toFixed(
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

function JobsWorkflowCard({
  number,
  title,
  detail,
  state,
  href,
}: {
  number: string;
  title: string;
  detail: string;
  state: "current" | "next" | "later";
  href?: string;
}) {
  const content = (
    <div
      className={`h-full rounded-xl border p-3 ${
        state === "current"
          ? "border-[#338b45] bg-green-50"
          : state === "next"
            ? "border-blue-200 bg-blue-50"
            : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
            state === "current"
              ? "bg-[#176b37] text-white"
              : state === "next"
                ? "bg-blue-700 text-white"
                : "bg-slate-200 text-slate-600"
          }`}
        >
          {number}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-950">{title}</div>
          <div className="mt-0.5 text-xs font-semibold text-slate-500">
            {state === "current" ? "Current step" : state === "next" ? "Next" : "Then"}
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p>
        </div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block transition hover:-translate-y-0.5 hover:shadow-sm">
      {content}
    </Link>
  ) : (
    content
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

function normaliseTreatmentName(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function findLinkedProgrammeVisit(
  programmes: CustomerProgramme[],
  treatment: TreatmentRecord,
): {
  programme: CustomerProgramme;
  visit: ProgrammeVisit;
} | null {
  if (
    treatment.programmeId &&
    treatment.programmeVisitId
  ) {
    const programme = programmes.find(
      (item) =>
        item.id === treatment.programmeId,
    );

    const visit = programme?.visits.find(
      (item) =>
        item.id ===
        treatment.programmeVisitId,
    );

    if (programme && visit) {
      return {
        programme,
        visit,
      };
    }
  }

  const treatmentName =
    normaliseTreatmentName(
      treatment.treatmentName,
    );

  const customerProgrammes =
    programmes.filter(
      (programme) =>
        programme.customerNumber ===
        treatment.customerNumber,
    );

  for (const programme of customerProgrammes) {
    const exactVisit =
      programme.visits.find(
        (visit) =>
          normaliseTreatmentName(
            visit.treatmentName,
          ) === treatmentName &&
          visit.scheduledDate ===
            treatment.scheduledDate,
      );

    if (exactVisit) {
      return {
        programme,
        visit: exactVisit,
      };
    }
  }

  const sameTreatmentCandidates =
    customerProgrammes.flatMap(
      (programme) =>
        programme.visits
          .filter(
            (visit) =>
              normaliseTreatmentName(
                visit.treatmentName,
              ) === treatmentName &&
              visit.status !==
                "Completed" &&
              visit.status !==
                "Skipped",
          )
          .map((visit) => ({
            programme,
            visit,
          })),
    );

  if (
    sameTreatmentCandidates.length ===
    1
  ) {
    return sameTreatmentCandidates[0];
  }

  return null;
}

function getManualProgrammeVisitCandidates(
  programmes: CustomerProgramme[],
  treatment: TreatmentRecord,
) {
  const customerProgrammes =
    programmes.filter(
      (programme) =>
        programme.customerNumber ===
        treatment.customerNumber,
    );

  const editable =
    customerProgrammes.flatMap(
      (programme) =>
        programme.visits
          .filter(
            (visit) =>
              visit.status !==
                "Completed" &&
              visit.status !==
                "Skipped",
          )
          .map((visit) => ({
            programme,
            visit,
          })),
    );

  const treatmentName =
    normaliseTreatmentName(
      treatment.treatmentName,
    );

  return editable.sort(
    (first, second) => {
      const firstSameName =
        normaliseTreatmentName(
          first.visit.treatmentName,
        ) === treatmentName
          ? 0
          : 1;

      const secondSameName =
        normaliseTreatmentName(
          second.visit.treatmentName,
        ) === treatmentName
          ? 0
          : 1;

      if (
        firstSameName !== secondSameName
      ) {
        return (
          firstSameName -
          secondSameName
        );
      }

      return (
        first.visit.visitNumber -
        second.visit.visitNumber
      );
    },
  );
}

function findProgrammeVisitBySelection(
  programmes: CustomerProgramme[],
  customerNumber: string,
  selection: string | undefined,
): {
  programme: CustomerProgramme;
  visit: ProgrammeVisit;
} | null {
  if (!selection) {
    return null;
  }

  const separatorIndex =
    selection.indexOf("::");

  if (separatorIndex <= 0) {
    return null;
  }

  const programmeId =
    selection.slice(0, separatorIndex);
  const visitId =
    selection.slice(separatorIndex + 2);

  const programme = programmes.find(
    (item) =>
      item.id === programmeId &&
      item.customerNumber ===
        customerNumber,
  );

  const visit = programme?.visits.find(
    (item) => item.id === visitId,
  );

  if (
    !programme ||
    !visit ||
    visit.status === "Completed" ||
    visit.status === "Skipped"
  ) {
    return null;
  }

  return {
    programme,
    visit,
  };
}

function createRescheduleRepairNote(
  originalDate: string,
  replacementDate: string,
) {
  if (!originalDate) {
    return `Replacement visit scheduled for ${formatDateWithDay(
      replacementDate,
    )}.`;
  }

  return `Rescheduled from ${formatDateWithDay(
    originalDate,
  )} to ${formatDateWithDay(
    replacementDate,
  )}.`;
}

function appendProgrammeNote(
  existing: string,
  next: string,
) {
  const existingLines = existing
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (
    existingLines.some(
      (line) => line === next.trim(),
    )
  ) {
    return existingLines.join("\n");
  }

  return [...existingLines, next.trim()]
    .filter(Boolean)
    .join("\n");
}

function createAdditionalJobProgramme(
  customer: StoredCustomer,
  job: AdditionalCustomerJob,
): CustomerProgramme {
  return {
    id: `additional-jobs-${customer.customerNumber}`,
    customerNumber:
      customer.customerNumber,
    year:
      Number(
        job.scheduledDate.slice(
          0,
          4,
        ),
      ) ||
      new Date().getFullYear(),
    createdAt: job.createdAt,
    programmeName:
      "Additional Jobs",
    startDate:
      job.scheduledDate,
    avoidWednesdays: false,
    avoidWeekends: false,
    visits: [
      {
        id: job.id,
        visitNumber: 0,
        treatmentName:
          job.treatmentName,
        scheduledDate:
          job.scheduledDate,
        gapAfterPreviousDays: 0,
        status: "Scheduled",
        notes: job.notes,
      },
    ],
  };
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