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

import { useCustomerStore } from "@/components/customer-store";

import {
  type CustomerProgramme,
  type ProgrammeVisit,
  useProgrammeStore,
} from "@/components/programme-store";

import {
  type TreatmentRecord,
  type TreatmentStatus,
  useTreatmentStore,
} from "@/components/treatment-store";

type ScheduledJob = {
  id: string;

  customerNumber: string;
  customerName: string;

  address: string;
  postcode: string;

  groupNumber: number;
  vanNumber: number;

  lawnSize: number;
  treatmentPrice: number;

  lockedGate: boolean;
  dogOnProperty: boolean;

  programmeId: string;
  visit: ProgrammeVisit;
};

type ApplicationCalculation = {
  productRequired: number;
  productUnit: ChemicalUnit;

  calibratedWaterVolumePerHectare: number;
  waterRequiredLitres: number;

  tankFills: number;
  productPerTank: number;

  estimatedProductCost: number;
  calibrationUsed: boolean;
};

const treatmentStatuses: TreatmentStatus[] =
  [
    "Completed",
    "Needs Rescheduling",
    "Cancelled",
  ];

export default function JobsPage() {
  const searchParams =
    useSearchParams();

  const rescheduleMode =
    searchParams.get("view") ===
    "reschedule";

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
      const dates =
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
        );

      return Array.from(
        new Set(dates),
      ).sort();
    }, [programmes]);

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(() =>
    toDateValue(new Date()),
  );

  const [
    selectedJobId,
    setSelectedJobId,
  ] = useState("");

  const [status, setStatus] =
    useState<TreatmentStatus>(
      "Completed",
    );

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
    nextVisitDate,
    setNextVisitDate,
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

  const jobs = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return programmes
      .flatMap((programme) =>
        programme.visits
          .filter(
            (visit) =>
              visit.scheduledDate ===
                selectedDate &&
              (visit.status ===
                "Scheduled" ||
                visit.status ===
                  "Planned"),
          )
          .map((visit) => {
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
              return null;
            }

            const alreadyRecorded =
              treatments.some(
                (treatment) =>
                  treatment.programmeId ===
                    programme.id &&
                  treatment.programmeVisitId ===
                    visit.id &&
                  treatment.status !==
                    "Rescheduled",
              ) ||
              treatments.some(
                (treatment) =>
                  !treatment.programmeVisitId &&
                  treatment.customerNumber ===
                    customer.customerNumber &&
                  treatment.scheduledDate ===
                    visit.scheduledDate &&
                  treatment.treatmentName ===
                    visit.treatmentName &&
                  treatment.status !==
                    "Rescheduled",
              );

            if (alreadyRecorded) {
              return null;
            }

            const job: ScheduledJob = {
              id: `${programme.id}-${visit.id}`,

              customerNumber:
                customer.customerNumber,

              customerName:
                customer.fullName,

              address:
                customer.address,

              postcode:
                customer.postcode,

              groupNumber:
                customer.groupNumber,

              vanNumber:
                customer.vanNumber,

              lawnSize:
                customer.lawnSize,

              treatmentPrice:
                customer.treatmentPrice,

              lockedGate:
                customer.lockedGate,

              dogOnProperty:
                customer.dogOnProperty,

              programmeId:
                programme.id,

              visit,
            };

            return job;
          }),
      )
      .filter(
        (
          job,
        ): job is ScheduledJob =>
          Boolean(job),
      )
      .sort((first, second) => {
        if (
          first.vanNumber !==
          second.vanNumber
        ) {
          return (
            first.vanNumber -
            second.vanNumber
          );
        }

        if (
          first.groupNumber !==
          second.groupNumber
        ) {
          return (
            first.groupNumber -
            second.groupNumber
          );
        }

        return first.customerName.localeCompare(
          second.customerName,
        );
      });
  }, [
    programmes,
    customers,
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

  const selectedChemical =
    chemicals.find(
      (chemical) =>
        chemical.id ===
        selectedChemicalId,
    ) ?? null;

  const activeChemicals =
    chemicals.filter(
      (chemical) =>
        chemical.active,
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
    );

  const needsReschedulingOnDate =
    treatments.filter(
      (treatment) =>
        treatment.scheduledDate ===
          selectedDate &&
        treatment.status ===
          "Needs Rescheduling",
    );

  const cancelledOnDate =
    treatments.filter(
      (treatment) =>
        treatment.scheduledDate ===
          selectedDate &&
        treatment.status ===
          "Cancelled",
    );

  const expectedIncome =
    jobs.reduce(
      (total, job) =>
        total +
        job.treatmentPrice,
      0,
    );

  const reschedulingTreatments =
    useMemo(() => {
      return treatments
        .filter(
          (treatment) =>
            treatment.status ===
            "Needs Rescheduling",
        )
        .sort((first, second) =>
          first.scheduledDate.localeCompare(
            second.scheduledDate,
          ),
        );
    }, [treatments]);

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
        )
      : undefined;

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

    const stillExists =
      reschedulingTreatments.some(
        (treatment) =>
          treatment.id ===
          selectedRescheduleId,
      );

    if (stillExists) {
      return;
    }

    const firstTreatment =
      reschedulingTreatments[0];

    setSelectedRescheduleId(
      firstTreatment.id,
    );

    setReplacementDate(
      firstTreatment.nextVisitDate ||
        addDaysToDate(
          firstTreatment.scheduledDate,
          7,
        ),
    );
  }, [
    rescheduleMode,
    reschedulingTreatments,
    selectedRescheduleId,
  ]);

  function selectJob(
    job: ScheduledJob,
  ) {
    setSelectedJobId(job.id);

    setTreatmentArea(
      job.lawnSize,
    );

    setStatus("Completed");

    setSelectedChemicalId("");

    setFertiliser("");
    setHerbicide("");
    setOtherMaterials("");
    setNotes("");

    setNextVisitDate(
      findNextProgrammeVisitDate(
        programmes,
        job.customerNumber,
        job.visit.scheduledDate,
      ),
    );
  }

  function selectReschedulingTreatment(
    treatment: TreatmentRecord,
  ) {
    setSelectedRescheduleId(
      treatment.id,
    );

    setReplacementDate(
      treatment.nextVisitDate ||
        addDaysToDate(
          treatment.scheduledDate,
          7,
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
      status === "Completed" &&
      treatmentArea <= 0
    ) {
      showMessage(
        "Enter the treatment area.",
      );
      return;
    }

    const chemicalValues =
      selectedChemical &&
      calculation
        ? createChemicalTreatmentValues(
            selectedChemical,
            calculation,
          )
        : createEmptyChemicalTreatmentValues();

    if (
      status === "Completed" &&
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

    const treatment: TreatmentRecord =
      {
        id: createTreatmentId(),

        programmeId:
          selectedJob.programmeId,

        programmeVisitId:
          selectedJob.visit.id,

        invoiceNumber:
          status === "Completed"
            ? createInvoiceNumber()
            : "",

        customerNumber:
          selectedJob.customerNumber,

        scheduledDate:
          selectedJob.visit
            .scheduledDate,

        recordedDate:
          new Date().toISOString(),

        completedDate:
          status === "Completed"
            ? toDateValue(new Date())
            : "",

        status,

        treatmentName:
          selectedJob.visit
            .treatmentName,

        fertiliser:
          fertiliser.trim(),

        herbicide:
          herbicide.trim(),

        otherMaterials:
          otherMaterials.trim(),

        ...chemicalValues,

        treatmentAreaSquareMetres:
          treatmentArea,

        notes: notes.trim(),

        nextVisitDate,
      };

    const programme =
      programmes.find(
        (item) =>
          item.id ===
          selectedJob.programmeId,
      );

    if (!programme) {
      showMessage(
        "The annual programme could not be found.",
      );
      return;
    }

    const programmeVisitStatus =
      status === "Completed"
        ? "Completed"
        : "Skipped";

    const updatedProgramme:
      CustomerProgramme = {
      ...programme,

      visits: programme.visits.map(
        (visit) =>
          visit.id ===
          selectedJob.visit.id
            ? {
                ...visit,

                status:
                  programmeVisitStatus,

                notes: appendNote(
                  visit.notes,
                  createProgrammeOutcomeNote(
                    status,
                    nextVisitDate,
                  ),
                ),
              }
            : visit,
      ),
    };

    saveProgramme(
      updatedProgramme,
    );

    addTreatment(treatment);

    const customerName =
      selectedJob.customerName;

    setSelectedJobId("");
    setSelectedChemicalId("");

    setFertiliser("");
    setHerbicide("");
    setOtherMaterials("");
    setNotes("");

    setTreatmentArea(0);
    setNextVisitDate("");
    setStatus("Completed");

    showMessage(
      status === "Completed"
        ? `${customerName}'s treatment has been completed and saved.`
        : status ===
            "Needs Rescheduling"
          ? `${customerName}'s visit has been added to the rescheduling queue.`
          : `${customerName}'s visit has been cancelled.`,
    );
  }

  function rescheduleVisit() {
    if (
      !selectedReschedulingTreatment
    ) {
      showMessage(
        "Select a visit to reschedule.",
      );
      return;
    }

    if (!replacementDate) {
      showMessage(
        "Choose a new visit date.",
      );
      return;
    }

    if (
      replacementDate ===
      selectedReschedulingTreatment.scheduledDate
    ) {
      showMessage(
        "Choose a different date from the original visit date.",
      );
      return;
    }

    const match =
      findProgrammeVisitForTreatment(
        programmes,
        selectedReschedulingTreatment,
      );

    if (!match) {
      showMessage(
        "The matching annual programme visit could not be found.",
      );
      return;
    }

    const {
      programme,
      programmeVisit,
    } = match;

    const conflictingVisit =
      programme.visits.find(
        (visit) =>
          visit.id !==
            programmeVisit.id &&
          visit.scheduledDate ===
            replacementDate &&
          visit.status !==
            "Skipped",
      );

    if (conflictingVisit) {
      showMessage(
        `This customer already has "${conflictingVisit.treatmentName}" scheduled on ${formatDate(
          replacementDate,
        )}. Please choose another date.`,
      );
      return;
    }

    const updatedProgramme:
      CustomerProgramme = {
      ...programme,

      visits: programme.visits.map(
        (visit) => {
          if (
            visit.id !==
            programmeVisit.id
          ) {
            return visit;
          }

          return {
            ...visit,

            scheduledDate:
              replacementDate,

            status: "Scheduled",

            notes: appendNote(
              visit.notes,
              `Rescheduled from ${formatDate(
                selectedReschedulingTreatment.scheduledDate,
              )} to ${formatDate(
                replacementDate,
              )}.`,
            ),
          };
        },
      ),
    };

    saveProgramme(
      updatedProgramme,
    );

    updateTreatment({
      ...selectedReschedulingTreatment,

      programmeId:
        programme.id,

      programmeVisitId:
        programmeVisit.id,

      status: "Rescheduled",

      nextVisitDate:
        replacementDate,

      notes: appendNote(
        selectedReschedulingTreatment.notes,
        `Visit successfully rescheduled to ${formatDate(
          replacementDate,
        )}.`,
      ),
    });

    const customerName =
      selectedReschedulingCustomer?.fullName ??
      selectedReschedulingTreatment.customerNumber;

    const confirmedDate =
      replacementDate;

    setSelectedRescheduleId("");
    setReplacementDate("");

    showMessage(
      `${customerName}'s visit has been rescheduled to ${formatDate(
        confirmedDate,
      )}.`,
    );
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
                  : "Today’s Jobs"}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {rescheduleMode
                  ? "Choose replacement dates without conflicting with the customer’s annual programme."
                  : "Complete scheduled treatments, calculate chemical requirements and record visits that need rearranging."}
              </p>
            </div>

            {rescheduleMode ? (
              <Link
                href="/jobs"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
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
                  }}
                  className="min-w-[280px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-[#338b45] focus:ring-4 focus:ring-green-100"
                >
                  {!availableDates.includes(
                    selectedDate,
                  ) && (
                    <option
                      value={selectedDate}
                    >
                      {formatDate(
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
            <ReschedulingScreen
              treatments={
                reschedulingTreatments
              }
              customers={customers}
              programmes={programmes}
              selectedTreatment={
                selectedReschedulingTreatment
              }
              selectedCustomer={
                selectedReschedulingCustomer
              }
              replacementDate={
                replacementDate
              }
              onSelect={
                selectReschedulingTreatment
              }
              onReplacementDateChange={
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
                    completedOnDate.length,
                  )}
                  detail="Saved treatments"
                />

                <SummaryCard
                  label="Rescheduling"
                  value={String(
                    needsReschedulingOnDate.length,
                  )}
                  detail="Replacement visit needed"
                  warning={
                    needsReschedulingOnDate.length >
                    0
                  }
                />

                <SummaryCard
                  label="Cancelled"
                  value={String(
                    cancelledOnDate.length,
                  )}
                  detail="Visits not completed"
                />

                <SummaryCard
                  label="Remaining value"
                  value={`£${expectedIncome.toFixed(
                    2,
                  )}`}
                  detail="Unrecorded scheduled jobs"
                />
              </section>

              <section className="mt-4 grid gap-4 xl:grid-cols-[390px_1fr]">
                <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-lg font-bold">
                    Scheduled customers
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Select a customer to
                    record the visit.
                  </p>

                  <div className="mt-4 max-h-[72vh] space-y-2 overflow-y-auto pr-1">
                    {jobs.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                        All scheduled jobs
                        for this date have
                        been recorded, or no
                        programme visits are
                        scheduled.
                      </div>
                    ) : (
                      jobs.map((job) => {
                        const isSelected =
                          selectedJob?.id ===
                          job.id;

                        return (
                          <button
                            key={job.id}
                            type="button"
                            onClick={() =>
                              selectJob(job)
                            }
                            className={`w-full rounded-xl border p-4 text-left transition ${
                              isSelected
                                ? "border-[#338b45] bg-green-50"
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-bold">
                                  {
                                    job.customerName
                                  }
                                </div>

                                <div className="mt-1 text-xs text-slate-500">
                                  Customer{" "}
                                  {
                                    job.customerNumber
                                  }
                                </div>
                              </div>

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                                Van{" "}
                                {
                                  job.vanNumber
                                }
                              </span>
                            </div>

                            <div className="mt-3 text-sm text-slate-600">
                              {job.address},{" "}
                              {job.postcode}
                            </div>

                            <div className="mt-3 font-semibold text-slate-800">
                              {
                                job.visit
                                  .treatmentName
                              }
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full bg-blue-100 px-2 py-1 font-semibold text-blue-800">
                                Group{" "}
                                {
                                  job.groupNumber
                                }
                              </span>

                              <span className="rounded-full bg-green-100 px-2 py-1 font-semibold text-green-800">
                                {job.lawnSize} m²
                              </span>

                              {job.lockedGate && (
                                <span className="rounded-full bg-red-100 px-2 py-1 font-bold text-red-700">
                                  Locked gate
                                </span>
                              )}

                              {job.dogOnProperty && (
                                <span className="rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-800">
                                  Dog
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </aside>

                <section className="min-w-0">
                  {!selectedJob ? (
                    <article className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                      <h2 className="text-xl font-bold">
                        Select a scheduled
                        customer
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        Choose a job from the
                        left to record the
                        treatment.
                      </p>
                    </article>
                  ) : (
                    <form
                      onSubmit={
                        saveTreatment
                      }
                      className="space-y-4"
                    >
                      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h2 className="text-2xl font-bold">
                                {
                                  selectedJob.customerName
                                }
                              </h2>

                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                                {
                                  selectedJob.visit
                                    .treatmentName
                                }
                              </span>
                            </div>

                            <p className="mt-2 text-sm text-slate-500">
                              Customer{" "}
                              {
                                selectedJob.customerNumber
                              }{" "}
                              · Group{" "}
                              {
                                selectedJob.groupNumber
                              }{" "}
                              · Van{" "}
                              {
                                selectedJob.vanNumber
                              }
                            </p>

                            <p className="mt-1 text-sm text-slate-600">
                              {
                                selectedJob.address
                              }
                              ,{" "}
                              {
                                selectedJob.postcode
                              }
                            </p>
                          </div>

                          <Link
                            href={`/customers/${selectedJob.customerNumber}`}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                          >
                            Open customer
                          </Link>
                        </div>
                      </article>

                      <section className="grid gap-4 lg:grid-cols-2">
                        <Panel>
                          <SectionHeading
                            title="Visit outcome"
                            description="Record whether the job was completed, needs rearranging or was cancelled."
                          />

                          <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <Field label="Visit status">
                              <select
                                value={status}
                                onChange={(
                                  event,
                                ) =>
                                  setStatus(
                                    event.target
                                      .value as TreatmentStatus,
                                  )
                                }
                                className={
                                  inputClass
                                }
                              >
                                {treatmentStatuses.map(
                                  (
                                    treatmentStatus,
                                  ) => (
                                    <option
                                      key={
                                        treatmentStatus
                                      }
                                      value={
                                        treatmentStatus
                                      }
                                    >
                                      {
                                        treatmentStatus
                                      }
                                    </option>
                                  ),
                                )}
                              </select>
                            </Field>

                            <Field label="Suggested replacement / next visit date">
                              <input
                                type="date"
                                value={
                                  nextVisitDate
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setNextVisitDate(
                                    event.target
                                      .value,
                                  )
                                }
                                className={
                                  inputClass
                                }
                              />
                            </Field>

                            <NumberField
                              label="Treatment area (m²)"
                              value={
                                treatmentArea
                              }
                              step="1"
                              onChange={
                                setTreatmentArea
                              }
                            />

                            <ResultBox
                              label="Treatment price"
                              value={`£${selectedJob.treatmentPrice.toFixed(
                                2,
                              )}`}
                              detail={`${selectedJob.lawnSize} m² customer lawn`}
                            />
                          </div>

                          {selectedJob.lockedGate && (
                            <WarningBox tone="red">
                              This customer has
                              a locked gate.
                              Confirm access
                              before beginning
                              the treatment.
                            </WarningBox>
                          )}

                          {selectedJob.dogOnProperty && (
                            <WarningBox tone="amber">
                              A dog may be
                              present at this
                              property. Confirm
                              the garden is safe
                              before entering.
                            </WarningBox>
                          )}
                        </Panel>

                        <Panel>
                          <SectionHeading
                            title="Chemical selection"
                            description="Choose a product from the Chemical Centre to calculate the exact dose and water required."
                          />

                          <div className="mt-5">
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
                                  status !==
                                  "Completed"
                                }
                                className={
                                  inputClass
                                }
                              >
                                <option value="">
                                  No chemical
                                  selected
                                </option>

                                {activeChemicals.map(
                                  (
                                    chemical,
                                  ) => (
                                    <option
                                      key={
                                        chemical.id
                                      }
                                      value={
                                        chemical.id
                                      }
                                    >
                                      {
                                        chemical.name
                                      }{" "}
                                      —{" "}
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
                          </div>

                          {selectedChemical &&
                            calculation && (
                              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                <ResultBox
                                  label="Product required"
                                  value={formatApplicationAmount(
                                    calculation.productRequired,
                                    calculation.productUnit,
                                  )}
                                  detail={`${selectedChemical.applicationRate} ${selectedChemical.applicationRateUnit}`}
                                />

                                <ResultBox
                                  label="Water required"
                                  value={`${calculation.waterRequiredLitres.toFixed(
                                    3,
                                  )} L`}
                                  detail={`${calculation.calibratedWaterVolumePerHectare.toFixed(
                                    2,
                                  )} L/ha`}
                                />

                                <ResultBox
                                  label="Tank fills"
                                  value={calculation.tankFills.toFixed(
                                    3,
                                  )}
                                  detail={`${selectedChemical.tankCapacityLitres} L tank`}
                                />

                                <ResultBox
                                  label="Product per tank"
                                  value={formatApplicationAmount(
                                    calculation.productPerTank,
                                    calculation.productUnit,
                                  )}
                                  detail="Per full-equivalent tank"
                                />

                                <ResultBox
                                  label="Chemical cost"
                                  value={`£${calculation.estimatedProductCost.toFixed(
                                    2,
                                  )}`}
                                  detail="Based on pack cost"
                                />

                                <ResultBox
                                  label="Equipment"
                                  value={`${selectedChemical.nozzleColour} ${selectedChemical.nozzleType}`}
                                  detail={`${selectedChemical.knapsackMake} ${selectedChemical.knapsackModel}`}
                                />
                              </div>
                            )}
                        </Panel>
                      </section>

                      <section className="grid gap-4 lg:grid-cols-2">
                        <Panel>
                          <SectionHeading
                            title="Other products and materials"
                            description="Record fertilisers, herbicides and other materials used during the visit."
                          />

                          <div className="mt-5 space-y-4">
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
                                  status !==
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
                                  status !==
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
                                  status !==
                                  "Completed"
                                }
                                className={
                                  inputClass
                                }
                              />
                            </Field>
                          </div>
                        </Panel>

                        <Panel>
                          <SectionHeading
                            title="Treatment notes"
                            description="Record observations, access problems, lawn condition and advice for the next visit."
                          />

                          <div className="mt-5">
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
                                placeholder="Record information about the visit and any preparation needed before the next treatment."
                                className={
                                  inputClass
                                }
                              />
                            </Field>
                          </div>
                        </Panel>
                      </section>

                      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-sm text-slate-500">
                          Saving the visit
                          updates the matching
                          annual programme
                          entry.
                        </div>

                        <button
                          type="submit"
                          className="rounded-xl bg-[#176b37] px-6 py-3 text-sm font-semibold text-white hover:bg-[#125b2f]"
                        >
                          {status ===
                          "Completed"
                            ? "Complete and save treatment"
                            : status ===
                                "Needs Rescheduling"
                              ? "Add to rescheduling queue"
                              : "Save cancellation"}
                        </button>
                      </section>
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

function ReschedulingScreen({
  treatments,
  customers,
  programmes,
  selectedTreatment,
  selectedCustomer,
  replacementDate,
  onSelect,
  onReplacementDateChange,
  onConfirm,
}: {
  treatments: TreatmentRecord[];

  customers: Array<{
    customerNumber: string;
    fullName: string;
    address: string;
    postcode: string;
  }>;

  programmes: CustomerProgramme[];

  selectedTreatment:
    | TreatmentRecord
    | null;

  selectedCustomer:
    | {
        customerNumber: string;
        fullName: string;
        address: string;
        postcode: string;
      }
    | undefined;

  replacementDate: string;

  onSelect: (
    treatment: TreatmentRecord,
  ) => void;

  onReplacementDateChange: (
    value: string,
  ) => void;

  onConfirm: () => void;
}) {
  if (treatments.length === 0) {
    return (
      <section className="rounded-2xl border border-green-200 bg-green-50 p-10 text-center shadow-sm">
        <h2 className="text-xl font-bold text-green-900">
          No visits need
          rescheduling
        </h2>

        <p className="mt-2 text-sm text-green-800">
          All failed visits have
          been resolved.
        </p>

        <Link
          href="/jobs"
          className="mt-5 inline-flex rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Return to jobs
        </Link>
      </section>
    );
  }

  const programmeMatch =
    selectedTreatment
      ? findProgrammeVisitForTreatment(
          programmes,
          selectedTreatment,
        )
      : null;

  const existingVisits =
    programmeMatch
      ? programmeMatch.programme.visits
          .filter(
            (visit) =>
              visit.id !==
                programmeMatch
                  .programmeVisit.id &&
              visit.status !==
                "Skipped",
          )
          .sort((first, second) =>
            first.scheduledDate.localeCompare(
              second.scheduledDate,
            ),
          )
      : [];

  const conflict =
    existingVisits.find(
      (visit) =>
        visit.scheduledDate ===
        replacementDate,
    );

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_450px]">
      <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <h2 className="text-xl font-bold text-amber-950">
          Waiting to be
          rescheduled
        </h2>

        <p className="mt-1 text-sm text-amber-800">
          Select a visit to choose
          a new annual programme
          date.
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

              const isSelected =
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
                    isSelected
                      ? "border-amber-500 bg-white shadow-sm"
                      : "border-amber-200 bg-amber-50 hover:bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900">
                        {customer?.fullName ??
                          `Customer ${treatment.customerNumber}`}
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
                    Original date:{" "}
                    {formatDate(
                      treatment.scheduledDate,
                    )}
                  </div>

                  {treatment.notes && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
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
        {selectedTreatment ? (
          <>
            <h2 className="text-xl font-bold">
              Reschedule visit
            </h2>

            <div className="mt-5 space-y-4">
              <InformationRow
                label="Customer"
                value={
                  selectedCustomer?.fullName ??
                  selectedTreatment.customerNumber
                }
              />

              <InformationRow
                label="Treatment"
                value={
                  selectedTreatment.treatmentName
                }
              />

              <InformationRow
                label="Original date"
                value={formatDate(
                  selectedTreatment.scheduledDate,
                )}
              />

              <Field label="New visit date">
                <input
                  type="date"
                  value={replacementDate}
                  onChange={(event) =>
                    onReplacementDateChange(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </Field>

              {conflict && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">
                  This customer already
                  has “
                  {conflict.treatmentName}
                  ” scheduled on{" "}
                  {formatDate(
                    conflict.scheduledDate,
                  )}
                  . Choose another date.
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold">
                  Existing annual dates
                </div>

                {existingVisits.length ===
                0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    No other active annual
                    visits were found.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {existingVisits.map(
                      (visit) => (
                        <div
                          key={visit.id}
                          className="flex items-start justify-between gap-3 rounded-lg bg-white p-3 text-sm"
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
                )}
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                The exact annual
                programme visit will be
                moved. The failed visit
                will remain in history
                with the status
                Rescheduled.
              </div>

              <button
                type="button"
                onClick={onConfirm}
                disabled={
                  Boolean(conflict) ||
                  !replacementDate
                }
                className="w-full rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Confirm reschedule
              </button>
            </div>
          </>
        ) : (
          <div className="p-6 text-center text-sm text-slate-500">
            Select a visit from
            the list.
          </div>
        )}
      </article>
    </section>
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
          visit.scheduledDate ===
            treatment.scheduledDate &&
          visit.treatmentName ===
            treatment.treatmentName,
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

function calculateApplication(
  chemical: ChemicalRecord,
  areaSquareMetres: number,
): ApplicationCalculation {
  const safeArea = Math.max(
    0,
    areaSquareMetres,
  );

  const areaHectares =
    safeArea / 10000;

  const calibrationUsed =
    chemical.flowRateLitresPerMinute >
      0 &&
    chemical.walkingSpeedKph > 0 &&
    chemical.sprayWidthMetres > 0;

  const calibratedWaterVolumePerHectare =
    calibrationUsed
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
    calibratedWaterVolumePerHectare *
    areaHectares;

  const tankFills =
    chemical.tankCapacityLitres > 0
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
        calibratedWaterVolumePerHectare,
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

    calibrationUsed,
  };
}

function createChemicalTreatmentValues(
  chemical: ChemicalRecord,
  calculation: ApplicationCalculation,
) {
  return {
    chemicalId: chemical.id,
    chemicalName: chemical.name,
    chemicalType: chemical.type,

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
      .map(
        (visit) =>
          visit.scheduledDate,
      )
      .filter(
        (date) =>
          date > currentDate,
      )
      .sort()[0] ?? ""
  );
}

function createProgrammeOutcomeNote(
  status: TreatmentStatus,
  nextVisitDate: string,
) {
  if (status === "Completed") {
    return "Visit completed.";
  }

  if (
    status ===
    "Needs Rescheduling"
  ) {
    return nextVisitDate
      ? `Visit could not be completed and requires rescheduling. Suggested replacement date: ${formatDate(
          nextVisitDate,
        )}.`
      : "Visit could not be completed and requires rescheduling.";
  }

  return "Visit cancelled.";
}

function appendNote(
  existingNote: string,
  newNote: string,
) {
  return [
    existingNote.trim(),
    newNote.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

function getProductUnit(
  rateUnit: ApplicationRateUnit,
): ChemicalUnit {
  if (rateUnit === "kg/ha") {
    return "kg";
  }

  if (rateUnit === "g/m²") {
    return "g";
  }

  if (rateUnit === "ml/m²") {
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

  const year =
    now.getFullYear();

  const datePart = [
    String(
      now.getMonth() + 1,
    ).padStart(2, "0"),

    String(
      now.getDate(),
    ).padStart(2, "0"),
  ].join("");

  const timePart = [
    String(
      now.getHours(),
    ).padStart(2, "0"),

    String(
      now.getMinutes(),
    ).padStart(2, "0"),

    String(
      now.getSeconds(),
    ).padStart(2, "0"),
  ].join("");

  return `INV-${year}-${datePart}-${timePart}`;
}

function toDateValue(
  date: Date,
) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
  if (!value) {
    return "No date selected";
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

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

function Panel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {children}
    </article>
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
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: string;
  onChange: (
    value: number,
  ) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) =>
          onChange(
            Number(
              event.target.value,
            ) || 0,
          )
        }
        className={inputClass}
      />
    </Field>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
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

function ResultBox({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-xl font-bold">
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
  const styles =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div
      className={`mt-4 rounded-xl border p-4 text-sm font-semibold ${styles}`}
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