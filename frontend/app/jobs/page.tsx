"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import {
  type ApplicationRateUnit,
  type ChemicalRecord,
  type ChemicalUnit,
  useChemicalStore,
} from "@/components/chemical-store";
import {
  type StoredCustomer,
  useCustomerStore,
} from "@/components/customer-store";
import {
  type CustomerProgramme,
  type ProgrammeVisit,
  useProgrammeStore,
} from "@/components/programme-store";
import { useSeasonStore } from "@/components/season-store";
import {
  type TreatmentRecord,
  type TreatmentStatus,
  useTreatmentStore,
} from "@/components/treatment-store";

type ScheduledJob = {
  id: string;
  customer: StoredCustomer;
  programme: CustomerProgramme;
  visit: ProgrammeVisit;
  standardGroupDate: string;
  overridden: boolean;
};

type ApplicationCalculation = {
  productRequired: number;
  productUnit: ChemicalUnit;
  calibratedWaterVolumePerHectare: number;
  waterRequiredLitres: number;
  tankFills: number;
  productPerTank: number;
  estimatedProductCost: number;
};

const outcomeStatuses: Array<
  Extract<
    TreatmentStatus,
    | "Completed"
    | "Needs Rescheduling"
    | "Cancelled"
  >
> = [
  "Completed",
  "Needs Rescheduling",
  "Cancelled",
];

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

export default function JobsPage() {
  const searchParams =
    useSearchParams();

  const rescheduleMode =
    searchParams.get("view") ===
    "reschedule";

  const requestedDate =
    searchParams.get("date");

  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    programmes,
    ready: programmesReady,
    saveProgramme,
  } = useProgrammeStore();

  const {
    seasons,
    ready: seasonsReady,
  } = useSeasonStore();

  const {
    treatments,
    ready: treatmentsReady,
    addTreatment,
    updateTreatment,
  } = useTreatmentStore();

  const {
    chemicals,
    ready: chemicalsReady,
    deductChemicalStock,
  } = useChemicalStore();

  const availableDates =
    useMemo(() => {
      return Array.from(
        new Set(
          programmes.flatMap(
            (programme) =>
              programme.visits
                .filter(
                  (visit) =>
                    visit.status ===
                      "Scheduled" ||
                    visit.status ===
                      "Planned",
                )
                .map(
                  (visit) =>
                    visit.scheduledDate,
                ),
          ),
        ),
      ).sort();
    }, [programmes]);

  const [selectedDate, setSelectedDate] =
    useState(
      isDateValue(
        requestedDate ?? "",
      )
        ? requestedDate!
        : toDateValue(new Date()),
    );

  const [
    selectedJobId,
    setSelectedJobId,
  ] = useState("");

  const [outcome, setOutcome] =
    useState<
      Extract<
        TreatmentStatus,
        | "Completed"
        | "Needs Rescheduling"
        | "Cancelled"
      >
    >("Completed");

  const [
    selectedChemicalId,
    setSelectedChemicalId,
  ] = useState("");

  const [
    treatmentArea,
    setTreatmentArea,
  ] = useState(0);

  const [fertiliser, setFertiliser] =
    useState("");

  const [herbicide, setHerbicide] =
    useState("");

  const [
    otherMaterials,
    setOtherMaterials,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const [
    suggestedReplacementDate,
    setSuggestedReplacementDate,
  ] = useState("");

  const [
    selectedRescheduleId,
    setSelectedRescheduleId,
  ] = useState("");

  const [
    replacementDate,
    setReplacementDate,
  ] = useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    if (
      isDateValue(
        requestedDate ?? "",
      )
    ) {
      setSelectedDate(
        requestedDate!,
      );
    }
  }, [requestedDate]);

  useEffect(() => {
    if (
      selectedDate !==
        toDateValue(new Date()) ||
      availableDates.length ===
        0 ||
      availableDates.includes(
        selectedDate,
      )
    ) {
      return;
    }

    const today =
      toDateValue(new Date());

    const nextDate =
      availableDates.find(
        (date) =>
          date >= today,
      ) ??
      availableDates[0];

    setSelectedDate(nextDate);
  }, [
    availableDates,
    selectedDate,
  ]);

  const jobs =
    useMemo<ScheduledJob[]>(() => {
      if (!selectedDate) {
        return [];
      }

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
            customer.status !==
              "Active"
          ) {
            return [];
          }

          const season =
            seasons.find(
              (item) =>
                item.year ===
                programme.year,
            );

          const groupDates =
            season?.groupDates.find(
              (group) =>
                group.groupNumber ===
                customer.groupNumber,
            );

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
            .map((visit) => {
              const roundIndex =
                Math.max(
                  0,
                  visit.visitNumber -
                    1,
                );

              const standardGroupDate =
                groupDates
                  ?.treatmentDates[
                    roundIndex
                  ] ??
                visit.scheduledDate;

              return {
                id: `${programme.id}-${visit.id}`,
                customer,
                programme,
                visit,
                standardGroupDate,
                overridden:
                  standardGroupDate !==
                  visit.scheduledDate,
              };
            });
        })
        .sort((first, second) => {
          if (
            first.customer.vanNumber !==
            second.customer.vanNumber
          ) {
            return (
              first.customer.vanNumber -
              second.customer.vanNumber
            );
          }

          if (
            first.customer.groupNumber !==
            second.customer.groupNumber
          ) {
            return (
              first.customer.groupNumber -
              second.customer.groupNumber
            );
          }

          return first.customer.fullName.localeCompare(
            second.customer.fullName,
          );
        });
    }, [
      programmes,
      customers,
      seasons,
      treatments,
      selectedDate,
    ]);

  const selectedJob =
    jobs.find(
      (job) =>
        job.id === selectedJobId,
    ) ??
    jobs[0] ??
    null;

  useEffect(() => {
    if (!selectedJob) {
      setSelectedJobId("");
      return;
    }

    if (
      selectedJobId ===
      selectedJob.id
    ) {
      return;
    }

    initialiseJobForm(
      selectedJob,
    );
  }, [
    selectedJob,
    selectedJobId,
  ]);

  const selectedChemical =
    chemicals.find(
      (chemical) =>
        chemical.id ===
        selectedChemicalId,
    ) ?? null;

  const activeChemicals =
    chemicals
      .filter(
        (chemical) =>
          chemical.active,
      )
      .sort((first, second) =>
        first.name.localeCompare(
          second.name,
        ),
      );

  const calculation =
    selectedChemical
      ? calculateApplication(
          selectedChemical,
          treatmentArea,
        )
      : null;

  const completedOnDate =
    treatments.filter(
      (treatment) =>
        treatment.scheduledDate ===
          selectedDate &&
        treatment.status ===
          "Completed",
    ).length;

  const reschedulingOnDate =
    treatments.filter(
      (treatment) =>
        treatment.scheduledDate ===
          selectedDate &&
        treatment.status ===
          "Needs Rescheduling",
    ).length;

  const cancelledOnDate =
    treatments.filter(
      (treatment) =>
        treatment.scheduledDate ===
          selectedDate &&
        treatment.status ===
          "Cancelled",
    ).length;

  const remainingValue =
    jobs.reduce(
      (total, job) =>
        total +
        job.customer
          .treatmentPrice,
      0,
    );

  const reschedulingTreatments =
    useMemo(
      () =>
        treatments
          .filter(
            (treatment) =>
              treatment.status ===
              "Needs Rescheduling",
          )
          .sort(
            (first, second) =>
              first.scheduledDate.localeCompare(
                second.scheduledDate,
              ),
          ),
      [treatments],
    );

  const selectedReschedulingTreatment =
    reschedulingTreatments.find(
      (treatment) =>
        treatment.id ===
        selectedRescheduleId,
    ) ??
    reschedulingTreatments[0] ??
    null;

  const selectedReschedulingCustomer =
    selectedReschedulingTreatment
      ? customers.find(
          (customer) =>
            customer.customerNumber ===
            selectedReschedulingTreatment.customerNumber,
        ) ?? null
      : null;

  const selectedRescheduleMatch =
    selectedReschedulingTreatment
      ? findProgrammeVisitForTreatment(
          programmes,
          selectedReschedulingTreatment,
        )
      : null;

  const selectedStandardGroupDate =
    selectedRescheduleMatch &&
    selectedReschedulingCustomer
      ? getStandardGroupDate(
          seasons,
          selectedRescheduleMatch
            .programme.year,
          selectedReschedulingCustomer
            .groupNumber,
          selectedRescheduleMatch
            .programmeVisit
            .visitNumber,
        )
      : "";

  useEffect(() => {
    if (!rescheduleMode) {
      return;
    }

    if (
      reschedulingTreatments.length ===
      0
    ) {
      setSelectedRescheduleId("");
      setReplacementDate("");
      return;
    }

    const selectedStillExists =
      reschedulingTreatments.some(
        (treatment) =>
          treatment.id ===
          selectedRescheduleId,
      );

    if (selectedStillExists) {
      return;
    }

    const first =
      reschedulingTreatments[0];

    setSelectedRescheduleId(
      first.id,
    );

    setReplacementDate(
      chooseReplacementDefault(
        first,
      ),
    );
  }, [
    rescheduleMode,
    reschedulingTreatments,
    selectedRescheduleId,
  ]);

  function initialiseJobForm(
    job: ScheduledJob,
  ) {
    setSelectedJobId(job.id);
    setOutcome("Completed");
    setTreatmentArea(
      job.customer.lawnSize,
    );
    setSelectedChemicalId("");
    setFertiliser("");
    setHerbicide("");
    setOtherMaterials("");
    setNotes("");
    setSuggestedReplacementDate(
      findNextProgrammeVisitDate(
        programmes,
        job.customer
          .customerNumber,
        job.visit
          .scheduledDate,
      ),
    );
  }

  function selectJob(
    job: ScheduledJob,
  ) {
    initialiseJobForm(job);
  }

  function selectReschedulingTreatment(
    treatment: TreatmentRecord,
  ) {
    setSelectedRescheduleId(
      treatment.id,
    );

    setReplacementDate(
      chooseReplacementDefault(
        treatment,
      ),
    );
  }

  function saveTreatment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedJob) {
      showMessage(
        "Select a scheduled job first.",
      );
      return;
    }

    if (
      outcome === "Completed" &&
      treatmentArea <= 0
    ) {
      showMessage(
        "Enter the treatment area.",
      );
      return;
    }

    if (
      outcome ===
        "Needs Rescheduling" &&
      suggestedReplacementDate &&
      suggestedReplacementDate <
        toDateValue(new Date())
    ) {
      showMessage(
        "The suggested replacement date cannot be in the past.",
      );
      return;
    }

    const chemicalValues =
      outcome === "Completed" &&
      selectedChemical &&
      calculation
        ? createChemicalTreatmentValues(
            selectedChemical,
            calculation,
          )
        : createEmptyChemicalTreatmentValues();

    if (
      outcome === "Completed" &&
      selectedChemical &&
      calculation
    ) {
      const stockResult =
        deductChemicalStock(
          selectedChemical.id,
          calculation.productRequired,
          calculation.productUnit,
        );

      if (!stockResult.success) {
        showMessage(
          stockResult.message,
        );
        return;
      }
    }

    const treatment:
      TreatmentRecord = {
      id: createTreatmentId(),

      programmeId:
        selectedJob.programme.id,

      programmeVisitId:
        selectedJob.visit.id,

      invoiceNumber:
        outcome === "Completed"
          ? createInvoiceNumber()
          : "",

      customerNumber:
        selectedJob.customer
          .customerNumber,

      scheduledDate:
        selectedJob.visit
          .scheduledDate,

      recordedDate:
        new Date().toISOString(),

      completedDate:
        outcome === "Completed"
          ? toDateValue(new Date())
          : "",

      status: outcome,

      treatmentName:
        selectedJob.visit
          .treatmentName,

      fertiliser:
        outcome === "Completed"
          ? fertiliser.trim()
          : "",

      herbicide:
        outcome === "Completed"
          ? herbicide.trim()
          : "",

      otherMaterials:
        outcome === "Completed"
          ? otherMaterials.trim()
          : "",

      ...chemicalValues,

      treatmentAreaSquareMetres:
        outcome === "Completed"
          ? treatmentArea
          : 0,

      notes: notes.trim(),

      nextVisitDate:
        outcome ===
        "Needs Rescheduling"
          ? suggestedReplacementDate
          : findNextProgrammeVisitDate(
              programmes,
              selectedJob.customer
                .customerNumber,
              selectedJob.visit
                .scheduledDate,
            ),
    };

    const programmeVisitStatus =
      outcome === "Completed"
        ? "Completed"
        : "Skipped";

    saveProgramme({
      ...selectedJob.programme,

      visits:
        selectedJob.programme.visits.map(
          (visit) =>
            visit.id ===
            selectedJob.visit.id
              ? {
                  ...visit,

                  status:
                    programmeVisitStatus,

                  notes: appendNote(
                    visit.notes,
                    createOutcomeNote(
                      outcome,
                      suggestedReplacementDate,
                    ),
                  ),
                }
              : visit,
        ),
    });

    addTreatment(treatment);

    const customerName =
      selectedJob.customer.fullName;

    setSelectedJobId("");
    resetJobForm();

    showMessage(
      outcome === "Completed"
        ? `${customerName}'s treatment has been completed and saved.`
        : outcome ===
            "Needs Rescheduling"
          ? `${customerName}'s visit is now in the rescheduling queue.`
          : `${customerName}'s visit has been cancelled.`,
    );
  }

  function rescheduleVisit() {
    if (
      !selectedReschedulingTreatment ||
      !selectedRescheduleMatch
    ) {
      showMessage(
        "The matching programme visit could not be found.",
      );
      return;
    }

    if (
      !isDateValue(
        replacementDate,
      )
    ) {
      showMessage(
        "Choose a valid replacement date.",
      );
      return;
    }

    const today =
      toDateValue(new Date());

    if (
      replacementDate < today
    ) {
      showMessage(
        "A visit cannot be rescheduled to a date that has already passed.",
      );
      return;
    }

    if (
      replacementDate ===
      selectedReschedulingTreatment.scheduledDate
    ) {
      showMessage(
        "Choose a different date from the failed visit date.",
      );
      return;
    }

    const {
      programme,
      programmeVisit,
    } = selectedRescheduleMatch;

    const conflictingVisit =
      programme.visits.find(
        (visit) =>
          visit.id !==
            programmeVisit.id &&
          visit.status !==
            "Skipped" &&
          visit.scheduledDate ===
            replacementDate,
      );

    if (conflictingVisit) {
      showMessage(
        `This customer already has ${conflictingVisit.treatmentName} scheduled on ${formatDate(
          replacementDate,
        )}.`,
      );
      return;
    }

    const standardGroupDate =
      selectedStandardGroupDate ||
      programmeVisit.scheduledDate;

    saveProgramme({
      ...programme,

      visits:
        programme.visits.map(
          (visit) =>
            visit.id ===
            programmeVisit.id
              ? {
                  ...visit,

                  scheduledDate:
                    replacementDate,

                  status:
                    "Scheduled",

                  notes:
                    addDateOverrideNote(
                      visit.notes,
                      standardGroupDate,
                      replacementDate,
                    ),
                }
              : visit,
        ),
    });

    updateTreatment({
      ...selectedReschedulingTreatment,

      programmeId:
        programme.id,

      programmeVisitId:
        programmeVisit.id,

      status:
        "Rescheduled",

      nextVisitDate:
        replacementDate,

      notes: appendNote(
        selectedReschedulingTreatment.notes,
        `Visit rescheduled to ${formatDate(
          replacementDate,
        )}.`,
      ),
    });

    const customerName =
      selectedReschedulingCustomer
        ?.fullName ??
      selectedReschedulingTreatment
        .customerNumber;

    const confirmedDate =
      replacementDate;

    setSelectedRescheduleId("");
    setReplacementDate("");

    showMessage(
      `${customerName}'s visit has been rescheduled to ${formatDate(
        confirmedDate,
      )}. The other customers in the group are unchanged.`,
    );
  }

  function resetJobForm() {
    setOutcome("Completed");
    setTreatmentArea(0);
    setSelectedChemicalId("");
    setFertiliser("");
    setHerbicide("");
    setOtherMaterials("");
    setNotes("");
    setSuggestedReplacementDate("");
  }

  function showMessage(
    text: string,
  ) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 4500);
  }

  const ready =
    customersReady &&
    programmesReady &&
    seasonsReady &&
    treatmentsReady &&
    chemicalsReady;

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading scheduled jobs...
          </div>
        </main>
      </AppShell>
    );
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
                {rescheduleMode
                  ? "Reschedule Visits"
                  : "Scheduled Jobs"}
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                {rescheduleMode
                  ? "Move only the affected customer visit. The standard group calendar and every other customer in the group remain unchanged."
                  : "Jobs are derived from the shared Season Calendar, customer group assignments and customer-specific overrides."}
              </p>
            </div>

            {rescheduleMode ? (
              <Link
                href="/jobs"
                className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-50"
              >
                Return to jobs
              </Link>
            ) : (
              <Field label="Working date">
                <select
                  value={selectedDate}
                  onChange={(event) => {
                    setSelectedDate(
                      event.target.value,
                    );
                    setSelectedJobId("");
                    resetJobForm();
                  }}
                  className="min-w-[285px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-[#338b45] focus:ring-4 focus:ring-green-100"
                >
                  {!availableDates.includes(
                    selectedDate,
                  ) && (
                    <option
                      value={selectedDate}
                    >
                      {formatDateWithDay(
                        selectedDate,
                      )}
                    </option>
                  )}

                  {availableDates.map(
                    (date) => (
                      <option
                        key={date}
                        value={date}
                      >
                        {formatDateWithDay(
                          date,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>
            )}
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
              {message}
            </div>
          )}

          {rescheduleMode ? (
            <RescheduleView
              treatments={
                reschedulingTreatments
              }
              customers={customers}
              programmes={programmes}
              seasons={seasons}
              selectedTreatment={
                selectedReschedulingTreatment
              }
              selectedCustomer={
                selectedReschedulingCustomer
              }
              selectedMatch={
                selectedRescheduleMatch
              }
              standardGroupDate={
                selectedStandardGroupDate
              }
              replacementDate={
                replacementDate
              }
              onSelect={
                selectReschedulingTreatment
              }
              onDateChange={
                setReplacementDate
              }
              onConfirm={
                rescheduleVisit
              }
            />
          ) : (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryCard
                  label="Remaining jobs"
                  value={String(
                    jobs.length,
                  )}
                  detail={formatDate(
                    selectedDate,
                  )}
                />

                <SummaryCard
                  label="Completed"
                  value={String(
                    completedOnDate,
                  )}
                  detail="Recorded outcomes"
                />

                <SummaryCard
                  label="Rescheduling"
                  value={String(
                    reschedulingOnDate,
                  )}
                  detail="Replacement date needed"
                  warning={
                    reschedulingOnDate >
                    0
                  }
                />

                <SummaryCard
                  label="Cancelled"
                  value={String(
                    cancelledOnDate,
                  )}
                  detail="Not completed"
                />

                <SummaryCard
                  label="Remaining value"
                  value={`£${remainingValue.toFixed(
                    2,
                  )}`}
                  detail="Scheduled work"
                />
              </section>

              <section className="mt-4 grid gap-4 xl:grid-cols-[400px_1fr]">
                <JobList
                  jobs={jobs}
                  selectedJob={
                    selectedJob
                  }
                  onSelect={selectJob}
                />

                <section className="min-w-0">
                  {!selectedJob ? (
                    <EmptyPanel>
                      No unrecorded jobs are due on
                      this date.
                    </EmptyPanel>
                  ) : (
                    <form
                      onSubmit={
                        saveTreatment
                      }
                      className="space-y-4"
                    >
                      <JobHeader
                        job={selectedJob}
                      />

                      <section className="grid gap-4 lg:grid-cols-2">
                        <Panel
                          title="Visit outcome"
                          description="Record the result against this exact customer programme visit."
                        >
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Outcome">
                              <select
                                value={outcome}
                                onChange={(
                                  event,
                                ) =>
                                  setOutcome(
                                    event.target
                                      .value as typeof outcome,
                                  )
                                }
                                className={
                                  inputClass
                                }
                              >
                                {outcomeStatuses.map(
                                  (status) => (
                                    <option
                                      key={
                                        status
                                      }
                                      value={
                                        status
                                      }
                                    >
                                      {
                                        status
                                      }
                                    </option>
                                  ),
                                )}
                              </select>
                            </Field>

                            <NumberField
                              label="Treatment area (m²)"
                              value={
                                treatmentArea
                              }
                              disabled={
                                outcome !==
                                "Completed"
                              }
                              onChange={
                                setTreatmentArea
                              }
                            />

                            {outcome ===
                              "Needs Rescheduling" && (
                              <Field label="Suggested replacement date">
                                <input
                                  type="date"
                                  min={toDateValue(
                                    new Date(),
                                  )}
                                  value={
                                    suggestedReplacementDate
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    setSuggestedReplacementDate(
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  className={
                                    inputClass
                                  }
                                />
                              </Field>
                            )}

                            <InfoBox
                              label="Treatment price"
                              value={`£${selectedJob.customer.treatmentPrice.toFixed(
                                2,
                              )}`}
                              detail={`${selectedJob.customer.lawnSize} m² lawn`}
                            />
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <InfoBox
                              label="Standard group date"
                              value={formatDate(
                                selectedJob.standardGroupDate,
                              )}
                              detail={`Group ${selectedJob.customer.groupNumber}`}
                            />

                            <InfoBox
                              label="Customer visit date"
                              value={formatDate(
                                selectedJob.visit.scheduledDate,
                              )}
                              detail={
                                selectedJob.overridden
                                  ? "Customer-specific override"
                                  : "Inherited group date"
                              }
                              warning={
                                selectedJob.overridden
                              }
                            />
                          </div>

                          {selectedJob.customer
                            .lockedGate && (
                            <WarningBox tone="red">
                              Locked gate warning:
                              confirm access before
                              treatment.
                            </WarningBox>
                          )}

                          {selectedJob.customer
                            .dogOnProperty && (
                            <WarningBox tone="amber">
                              A dog may be present.
                              Confirm the garden is
                              safe before entering.
                            </WarningBox>
                          )}
                        </Panel>

                        <Panel
                          title="Chemical application"
                          description="Chemical use is recorded only when the visit is completed."
                        >
                          <Field label="Chemical or product">
                            <select
                              value={
                                selectedChemicalId
                              }
                              onChange={(
                                event,
                              ) =>
                                setSelectedChemicalId(
                                  event.target
                                    .value,
                                )
                              }
                              disabled={
                                outcome !==
                                "Completed"
                              }
                              className={
                                inputClass
                              }
                            >
                              <option value="">
                                No chemical selected
                              </option>

                              {activeChemicals.map(
                                (chemical) => (
                                  <option
                                    key={
                                      chemical.id
                                    }
                                    value={
                                      chemical.id
                                    }
                                  >
                                    {chemical.name} —{" "}
                                    {
                                      chemical.applicationRate
                                    }{" "}
                                    {
                                      chemical.applicationRateUnit
                                    }
                                  </option>
                                ),
                              )}
                            </select>
                          </Field>

                          {selectedChemical &&
                            calculation &&
                            outcome ===
                              "Completed" && (
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <InfoBox
                                  label="Product required"
                                  value={formatApplicationAmount(
                                    calculation.productRequired,
                                    calculation.productUnit,
                                  )}
                                  detail={`${selectedChemical.applicationRate} ${selectedChemical.applicationRateUnit}`}
                                />

                                <InfoBox
                                  label="Water required"
                                  value={`${calculation.waterRequiredLitres.toFixed(
                                    3,
                                  )} L`}
                                  detail={`${calculation.calibratedWaterVolumePerHectare.toFixed(
                                    2,
                                  )} L/ha`}
                                />

                                <InfoBox
                                  label="Tank fills"
                                  value={calculation.tankFills.toFixed(
                                    3,
                                  )}
                                  detail={`${selectedChemical.tankCapacityLitres} L tank`}
                                />

                                <InfoBox
                                  label="Product per tank"
                                  value={formatApplicationAmount(
                                    calculation.productPerTank,
                                    calculation.productUnit,
                                  )}
                                  detail="Per full-equivalent tank"
                                />

                                <InfoBox
                                  label="Product cost"
                                  value={`£${calculation.estimatedProductCost.toFixed(
                                    2,
                                  )}`}
                                  detail="Based on pack cost"
                                />

                                <InfoBox
                                  label="Equipment"
                                  value={`${selectedChemical.nozzleColour} ${selectedChemical.nozzleType}`}
                                  detail={`${selectedChemical.knapsackMake} ${selectedChemical.knapsackModel}`}
                                />
                              </div>
                            )}
                        </Panel>
                      </section>

                      <section className="grid gap-4 lg:grid-cols-2">
                        <Panel
                          title="Other products"
                          description="Optional additional materials used during a completed visit."
                        >
                          <div className="space-y-4">
                            <Field label="Fertiliser">
                              <input
                                value={
                                  fertiliser
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setFertiliser(
                                    event.target
                                      .value,
                                  )
                                }
                                disabled={
                                  outcome !==
                                  "Completed"
                                }
                                className={
                                  inputClass
                                }
                              />
                            </Field>

                            <Field label="Herbicide">
                              <input
                                value={
                                  herbicide
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setHerbicide(
                                    event.target
                                      .value,
                                  )
                                }
                                disabled={
                                  outcome !==
                                  "Completed"
                                }
                                className={
                                  inputClass
                                }
                              />
                            </Field>

                            <Field label="Other materials">
                              <input
                                value={
                                  otherMaterials
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setOtherMaterials(
                                    event.target
                                      .value,
                                  )
                                }
                                disabled={
                                  outcome !==
                                  "Completed"
                                }
                                className={
                                  inputClass
                                }
                              />
                            </Field>
                          </div>
                        </Panel>

                        <Panel
                          title="Visit notes"
                          description="Record lawn observations, access problems and customer advice."
                        >
                          <Field label="Notes">
                            <textarea
                              rows={9}
                              value={notes}
                              onChange={(
                                event,
                              ) =>
                                setNotes(
                                  event.target
                                    .value,
                                )
                              }
                              className={
                                inputClass
                              }
                            />
                          </Field>
                        </Panel>
                      </section>

                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-sm text-slate-500">
                          Saving records the outcome
                          against this programme visit
                          and removes it from the
                          remaining-jobs list.
                        </p>

                        <button
                          type="submit"
                          className="rounded-xl bg-[#176b37] px-6 py-3 text-sm font-semibold text-white hover:bg-[#125b2f]"
                        >
                          {outcome ===
                          "Completed"
                            ? "Complete and save treatment"
                            : outcome ===
                                "Needs Rescheduling"
                              ? "Add to rescheduling queue"
                              : "Save cancellation"}
                        </button>
                      </div>
                    </form>
                  )}
                </section>
              </section>
            </>
          )}
        </div>
      </main>
    </AppShell>
  );
}

function JobList({
  jobs,
  selectedJob,
  onSelect,
}: {
  jobs: ScheduledJob[];
  selectedJob: ScheduledJob | null;
  onSelect: (job: ScheduledJob) => void;
}) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold">
        Scheduled customers
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Ordered by van, group and customer.
      </p>

      <div className="mt-4 max-h-[72vh] space-y-2 overflow-y-auto pr-1">
        {jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            No unrecorded jobs are due on this
            date.
          </div>
        ) : (
          jobs.map((job) => {
            const selected =
              selectedJob?.id ===
              job.id;

            return (
              <button
                key={job.id}
                type="button"
                onClick={() =>
                  onSelect(job)
                }
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selected
                    ? "border-[#338b45] bg-green-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold">
                      {
                        job.customer.fullName
                      }
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Customer{" "}
                      {
                        job.customer.customerNumber
                      }
                    </div>
                  </div>

                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                    Group{" "}
                    {
                      job.customer.groupNumber
                    }
                  </span>
                </div>

                <div className="mt-3 text-sm text-slate-600">
                  {job.customer.address},{" "}
                  {job.customer.postcode}
                </div>

                <div className="mt-3 font-semibold">
                  {
                    job.visit.treatmentName
                  }
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                    Van{" "}
                    {
                      job.customer.vanNumber
                    }
                  </span>

                  <span className="rounded-full bg-green-100 px-2 py-1 font-semibold text-green-800">
                    {
                      job.customer.lawnSize
                    }{" "}
                    m²
                  </span>

                  {job.overridden && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-800">
                      Date override
                    </span>
                  )}

                  {job.customer
                    .lockedGate && (
                    <span className="rounded-full bg-red-100 px-2 py-1 font-bold text-red-700">
                      Locked gate
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

function JobHeader({
  job,
}: {
  job: ScheduledJob;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold">
              {job.customer.fullName}
            </h2>

            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
              {job.visit.treatmentName}
            </span>

            {job.overridden && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                Customer date override
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Customer{" "}
            {job.customer.customerNumber} · Group{" "}
            {job.customer.groupNumber} · Van{" "}
            {job.customer.vanNumber}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            {job.customer.address},{" "}
            {job.customer.postcode}
          </p>
        </div>

        <Link
          href={`/customers/${job.customer.customerNumber}`}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
        >
          Open customer
        </Link>
      </div>
    </article>
  );
}

function RescheduleView({
  treatments,
  customers,
  programmes,
  seasons,
  selectedTreatment,
  selectedCustomer,
  selectedMatch,
  standardGroupDate,
  replacementDate,
  onSelect,
  onDateChange,
  onConfirm,
}: {
  treatments: TreatmentRecord[];
  customers: StoredCustomer[];
  programmes: CustomerProgramme[];
  seasons: ReturnType<
    typeof useSeasonStore
  >["seasons"];
  selectedTreatment: TreatmentRecord | null;
  selectedCustomer: StoredCustomer | null;
  selectedMatch: {
    programme: CustomerProgramme;
    programmeVisit: ProgrammeVisit;
  } | null;
  standardGroupDate: string;
  replacementDate: string;
  onSelect: (
    treatment: TreatmentRecord,
  ) => void;
  onDateChange: (
    value: string,
  ) => void;
  onConfirm: () => void;
}) {
  const conflict =
    selectedMatch &&
    replacementDate
      ? selectedMatch.programme.visits.find(
          (visit) =>
            visit.id !==
              selectedMatch
                .programmeVisit.id &&
            visit.status !==
              "Skipped" &&
            visit.scheduledDate ===
              replacementDate,
        )
      : undefined;

  if (treatments.length === 0) {
    return (
      <EmptyPanel>
        <h2 className="text-xl font-bold text-green-900">
          No visits need rescheduling
        </h2>

        <p className="mt-2">
          All failed visits have been resolved.
        </p>

        <Link
          href="/jobs"
          className="mt-5 inline-flex rounded-xl bg-[#176b37] px-5 py-2.5 font-semibold text-white"
        >
          Return to jobs
        </Link>
      </EmptyPanel>
    );
  }

  const existingDates =
    selectedMatch
      ? selectedMatch.programme.visits
          .filter(
            (visit) =>
              visit.id !==
                selectedMatch
                  .programmeVisit.id &&
              visit.status !==
                "Skipped",
          )
          .sort(
            (first, second) =>
              first.scheduledDate.localeCompare(
                second.scheduledDate,
              ),
          )
      : [];

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_460px]">
      <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <h2 className="text-xl font-bold text-amber-950">
          Waiting to be rescheduled
        </h2>

        <p className="mt-1 text-sm text-amber-800">
          Selecting a new date creates a
          customer-only override.
        </p>

        <div className="mt-5 space-y-3">
          {treatments.map(
            (treatment) => {
              const customer =
                customers.find(
                  (item) =>
                    item.customerNumber ===
                    treatment.customerNumber,
                );

              const selected =
                selectedTreatment?.id ===
                treatment.id;

              return (
                <button
                  key={treatment.id}
                  type="button"
                  onClick={() =>
                    onSelect(treatment)
                  }
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-amber-500 bg-white shadow-sm"
                      : "border-amber-200 hover:bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-bold">
                        {customer?.fullName ??
                          treatment.customerNumber}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        {customer
                          ? `${customer.address}, ${customer.postcode}`
                          : treatment.customerNumber}
                      </div>
                    </div>

                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      Needs rescheduling
                    </span>
                  </div>

                  <div className="mt-3 font-semibold">
                    {
                      treatment.treatmentName
                    }
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Failed date:{" "}
                    {formatDate(
                      treatment.scheduledDate,
                    )}
                  </div>

                  {treatment.notes && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                      {treatment.notes}
                    </div>
                  )}
                </button>
              );
            },
          )}
        </div>
      </article>

      <article className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {selectedTreatment &&
        selectedCustomer &&
        selectedMatch ? (
          <>
            <h2 className="text-xl font-bold">
              Customer date override
            </h2>

            <div className="mt-5 space-y-4">
              <InformationRow
                label="Customer"
                value={
                  selectedCustomer.fullName
                }
              />

              <InformationRow
                label="Group"
                value={`Group ${selectedCustomer.groupNumber}`}
              />

              <InformationRow
                label="Treatment"
                value={
                  selectedMatch
                    .programmeVisit
                    .treatmentName
                }
              />

              <InformationRow
                label="Standard group date"
                value={formatDate(
                  standardGroupDate,
                )}
              />

              <InformationRow
                label="Failed customer date"
                value={formatDate(
                  selectedTreatment.scheduledDate,
                )}
              />

              <Field label="Replacement date">
                <input
                  type="date"
                  min={toDateValue(
                    new Date(),
                  )}
                  value={
                    replacementDate
                  }
                  onChange={(event) =>
                    onDateChange(
                      event.target.value,
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              {conflict && (
                <WarningBox tone="red">
                  This customer already has{" "}
                  {conflict.treatmentName} on{" "}
                  {formatDate(
                    conflict.scheduledDate,
                  )}
                  .
                </WarningBox>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-bold">
                  Other customer dates
                </h3>

                <div className="mt-3 space-y-2">
                  {existingDates.map(
                    (visit) => (
                      <div
                        key={visit.id}
                        className="flex justify-between gap-4 rounded-lg bg-white px-3 py-2 text-sm"
                      >
                        <span className="font-semibold">
                          {
                            visit.treatmentName
                          }
                        </span>

                        <span className="whitespace-nowrap text-slate-600">
                          {formatDate(
                            visit.scheduledDate,
                          )}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                The group calendar is not changed.
                Only this customer&apos;s exact
                programme visit receives an override.
              </div>

              <button
                type="button"
                onClick={onConfirm}
                disabled={
                  !replacementDate ||
                  Boolean(conflict)
                }
                className="w-full rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Confirm customer override
              </button>
            </div>
          </>
        ) : (
          <div className="p-6 text-center text-sm text-slate-500">
            The matching programme visit could not
            be found. This may be an older demo
            treatment record.
          </div>
        )}
      </article>
    </section>
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
      treatment.status !==
        "Rescheduled" &&
      ((
        treatment.programmeId ===
          programme.id &&
        treatment.programmeVisitId ===
          visit.id
      ) ||
        (
          !treatment.programmeVisitId &&
          treatment.customerNumber ===
            customerNumber &&
          treatment.scheduledDate ===
            visit.scheduledDate &&
          treatment.treatmentName ===
            visit.treatmentName
        )),
  );
}

function findProgrammeVisitForTreatment(
  programmes: CustomerProgramme[],
  treatment: TreatmentRecord,
) {
  if (
    treatment.programmeId &&
    treatment.programmeVisitId
  ) {
    const programme =
      programmes.find(
        (item) =>
          item.id ===
          treatment.programmeId,
      );

    const programmeVisit =
      programme?.visits.find(
        (visit) =>
          visit.id ===
          treatment.programmeVisitId,
      );

    if (
      programme &&
      programmeVisit
    ) {
      return {
        programme,
        programmeVisit,
      };
    }
  }

  for (const programme of programmes) {
    if (
      programme.customerNumber !==
      treatment.customerNumber
    ) {
      continue;
    }

    const programmeVisit =
      programme.visits.find(
        (visit) =>
          visit.visitNumber > 0 &&
          visit.treatmentName ===
            treatment.treatmentName &&
          (
            visit.scheduledDate ===
              treatment.scheduledDate ||
            visit.status ===
              "Skipped"
          ),
      );

    if (programmeVisit) {
      return {
        programme,
        programmeVisit,
      };
    }
  }

  return null;
}

function getStandardGroupDate(
  seasons: ReturnType<
    typeof useSeasonStore
  >["seasons"],
  year: number,
  groupNumber: number,
  visitNumber: number,
) {
  return (
    seasons
      .find(
        (season) =>
          season.year === year,
      )
      ?.groupDates.find(
        (group) =>
          group.groupNumber ===
          groupNumber,
      )
      ?.treatmentDates[
        visitNumber - 1
      ] ?? ""
  );
}

function chooseReplacementDefault(
  treatment: TreatmentRecord,
) {
  const today =
    toDateValue(new Date());

  if (
    isDateValue(
      treatment.nextVisitDate,
    ) &&
    treatment.nextVisitDate >=
      today
  ) {
    return treatment.nextVisitDate;
  }

  return addDaysToDate(
    today,
    7,
  );
}

function findNextProgrammeVisitDate(
  programmes: CustomerProgramme[],
  customerNumber: string,
  currentDate: string,
) {
  return (
    programmes
      .filter(
        (programme) =>
          programme.customerNumber ===
          customerNumber,
      )
      .flatMap(
        (programme) =>
          programme.visits,
      )
      .filter(
        (visit) =>
          visit.scheduledDate >
            currentDate &&
          (visit.status ===
            "Scheduled" ||
            visit.status ===
              "Planned"),
      )
      .map(
        (visit) =>
          visit.scheduledDate,
      )
      .sort()[0] ?? ""
  );
}

function createOutcomeNote(
  outcome: Extract<
    TreatmentStatus,
    | "Completed"
    | "Needs Rescheduling"
    | "Cancelled"
  >,
  suggestedDate: string,
) {
  if (outcome === "Completed") {
    return "Visit completed.";
  }

  if (
    outcome ===
    "Needs Rescheduling"
  ) {
    return suggestedDate
      ? `Visit could not be completed. Suggested replacement date: ${formatDate(
          suggestedDate,
        )}.`
      : "Visit could not be completed and requires rescheduling.";
  }

  return "Visit cancelled.";
}

function addDateOverrideNote(
  notes: string,
  groupDate: string,
  replacementDate: string,
) {
  const cleanNotes =
    notes
      .split("\n")
      .filter(
        (line) =>
          !line.includes(
            "[date override]",
          ),
      )
      .join("\n")
      .trim();

  return appendNote(
    cleanNotes,
    `[date override] Standard group date ${formatDate(
      groupDate,
    )}; customer date ${formatDate(
      replacementDate,
    )}.`,
  );
}

function appendNote(
  existing: string,
  next: string,
) {
  return [
    existing.trim(),
    next.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

function calculateApplication(
  chemical: ChemicalRecord,
  areaSquareMetres: number,
): ApplicationCalculation {
  const safeArea =
    Math.max(
      0,
      areaSquareMetres,
    );

  const areaHectares =
    safeArea / 10000;

  const hasCalibration =
    chemical.flowRateLitresPerMinute >
      0 &&
    chemical.walkingSpeedKph > 0 &&
    chemical.sprayWidthMetres > 0;

  const waterPerHectare =
    hasCalibration
      ? (600 *
          chemical.flowRateLitresPerMinute) /
        (chemical.walkingSpeedKph *
          chemical.sprayWidthMetres)
      : Math.max(
          0,
          chemical.waterVolumePerHectare,
        );

  const productRequired =
    chemical.applicationRateUnit ===
      "kg/ha" ||
    chemical.applicationRateUnit ===
      "L/ha"
      ? chemical.applicationRate *
        areaHectares
      : chemical.applicationRate *
        safeArea;

  const waterRequiredLitres =
    waterPerHectare *
    areaHectares;

  const tankFills =
    chemical.tankCapacityLitres >
    0
      ? waterRequiredLitres /
        chemical.tankCapacityLitres
      : 0;

  const productPerTank =
    tankFills > 0
      ? productRequired /
        tankFills
      : productRequired;

  const estimatedProductCost =
    chemical.packSize > 0
      ? (productRequired /
          chemical.packSize) *
        chemical.costPerPack
      : 0;

  return {
    productRequired:
      roundToThreeDecimals(
        productRequired,
      ),

    productUnit:
      getProductUnit(
        chemical.applicationRateUnit,
      ),

    calibratedWaterVolumePerHectare:
      roundToThreeDecimals(
        waterPerHectare,
      ),

    waterRequiredLitres:
      roundToThreeDecimals(
        waterRequiredLitres,
      ),

    tankFills:
      roundToThreeDecimals(
        tankFills,
      ),

    productPerTank:
      roundToThreeDecimals(
        productPerTank,
      ),

    estimatedProductCost:
      roundToTwoDecimals(
        estimatedProductCost,
      ),
  };
}

function createChemicalTreatmentValues(
  chemical: ChemicalRecord,
  calculation: ApplicationCalculation,
) {
  return {
    chemicalId:
      chemical.id,

    chemicalName:
      chemical.name,

    chemicalType:
      chemical.type,

    activeIngredients:
      chemical.activeIngredients,

    registrationNumber:
      chemical.registrationNumber,

    applicationRate:
      chemical.applicationRate,

    applicationRateUnit:
      chemical.applicationRateUnit,

    productRequired:
      calculation.productRequired,

    productUnit:
      calculation.productUnit,

    calibratedWaterVolumePerHectare:
      calculation.calibratedWaterVolumePerHectare,

    waterRequiredLitres:
      calculation.waterRequiredLitres,

    tankCapacityLitres:
      chemical.tankCapacityLitres,

    tankFills:
      calculation.tankFills,

    productPerTank:
      calculation.productPerTank,

    estimatedProductCost:
      calculation.estimatedProductCost,

    nozzleColour:
      chemical.nozzleColour,

    nozzleType:
      chemical.nozzleType,

    knapsackMake:
      chemical.knapsackMake,

    knapsackModel:
      chemical.knapsackModel,

    walkingSpeedKph:
      chemical.walkingSpeedKph,

    flowRateLitresPerMinute:
      chemical.flowRateLitresPerMinute,

    sprayWidthMetres:
      chemical.sprayWidthMetres,

    pressureBar:
      chemical.pressureBar,
  };
}

function createEmptyChemicalTreatmentValues() {
  return {
    chemicalId: "",
    chemicalName: "",
    chemicalType: "",
    activeIngredients: "",
    registrationNumber: "",
    applicationRate: 0,
    applicationRateUnit: "",
    productRequired: 0,
    productUnit: "",
    calibratedWaterVolumePerHectare:
      0,
    waterRequiredLitres: 0,
    tankCapacityLitres: 0,
    tankFills: 0,
    productPerTank: 0,
    estimatedProductCost: 0,
    nozzleColour: "",
    nozzleType: "",
    knapsackMake: "",
    knapsackModel: "",
    walkingSpeedKph: 0,
    flowRateLitresPerMinute:
      0,
    sprayWidthMetres: 0,
    pressureBar: 0,
  };
}

function getProductUnit(
  rateUnit: ApplicationRateUnit,
): ChemicalUnit {
  if (
    rateUnit === "kg/ha"
  ) {
    return "kg";
  }

  if (
    rateUnit === "g/m²"
  ) {
    return "g";
  }

  if (
    rateUnit === "ml/m²"
  ) {
    return "ml";
  }

  return "L";
}

function formatApplicationAmount(
  amount: number,
  unit: ChemicalUnit,
) {
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

function createTreatmentId() {
  return `treatment-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function createInvoiceNumber() {
  const now = new Date();

  return `INV-${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}-${String(
    now.getHours(),
  ).padStart(2, "0")}${String(
    now.getMinutes(),
  ).padStart(2, "0")}${String(
    now.getSeconds(),
  ).padStart(2, "0")}`;
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

function isDateValue(
  value: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const date =
    parseDate(value);

  return (
    !Number.isNaN(
      date.getTime(),
    ) &&
    toDateValue(date) === value
  );
}

function toDateValue(
  date: Date,
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      date.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDaysToDate(
  value: string,
  days: number,
) {
  const date =
    parseDate(value);

  date.setDate(
    date.getDate() + days,
  );

  return toDateValue(date);
}

function formatDate(
  value: string,
) {
  if (!isDateValue(value)) {
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

function formatDateWithDay(
  value: string,
) {
  if (!isDateValue(value)) {
    return "No date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(parseDate(value));
}

function roundToThreeDecimals(
  value: number,
) {
  return (
    Math.round(
      (value +
        Number.EPSILON) *
        1000,
    ) / 1000
  );
}

function roundToTwoDecimals(
  value: number,
) {
  return (
    Math.round(
      (value +
        Number.EPSILON) *
        100,
    ) / 100
  );
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

function NumberField({
  label,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (
    value: number,
  ) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min="0"
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            Math.max(
              0,
              Number(
                event.target.value,
              ) || 0,
            ),
          )
        }
        className={inputClass}
      />
    </Field>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-5">
        {children}
      </div>
    </article>
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

function InfoBox({
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
    <div
      className={`rounded-xl border p-4 ${
        warning
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-lg font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </div>
  );
}

function WarningBox({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "red" | "amber";
}) {
  return (
    <div
      className={`mt-4 rounded-xl border p-4 text-sm font-semibold ${
        tone === "red"
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      {children}
    </div>
  );
}

function InformationRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-slate-200 pb-3">
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 font-bold">
        {value}
      </div>
    </div>
  );
}

function EmptyPanel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
      {children}
    </article>
  );
}