"use client";

import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
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

const treatmentStatuses: TreatmentStatus[] = [
  "Completed",
  "Needs Rescheduling",
  "Cancelled",
];

export default function JobsPage() {
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
    addTreatment,
  } = useTreatmentStore();

  const {
  chemicals,
  ready: chemicalsReady,
  deductChemicalStock,
} = useChemicalStore();

  const availableDates = useMemo(() => {
    const dates = programmes.flatMap(
      (programme) =>
        programme.visits
          .filter(
            (visit) =>
              visit.status ===
                "Scheduled" ||
              visit.status === "Planned",
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

  const [selectedDate, setSelectedDate] =
    useState(() => {
      const today = toDateValue(
        new Date(),
      );

      return today;
    });

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
                  treatment.customerNumber ===
                    customer.customerNumber &&
                  treatment.scheduledDate ===
                    visit.scheduledDate &&
                  treatment.treatmentName ===
                    visit.treatmentName,
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

  const rescheduledOnDate =
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

        nextVisitDate:
          status ===
          "Needs Rescheduling"
            ? nextVisitDate
            : nextVisitDate,
      };

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
          ? `${customerName}'s visit has been marked for rescheduling.`
          : `${customerName}'s visit has been cancelled.`,
    );
  }

  function showMessage(
    text: string,
  ) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3500);
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
                Today&apos;s Jobs
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Complete scheduled treatments,
                calculate chemical requirements and
                record visits that need rearranging.
              </p>
            </div>

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
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

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
                rescheduledOnDate.length,
              )}
              detail="Replacement visit needed"
              warning={
                rescheduledOnDate.length >
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
              <div>
                <h2 className="text-lg font-bold">
                  Scheduled customers
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Select a customer to record the
                  visit.
                </p>
              </div>

              <div className="mt-4 max-h-[72vh] space-y-2 overflow-y-auto pr-1">
                {jobs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                    All scheduled jobs for this date
                    have been recorded, or no
                    programme visits are scheduled.
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
                              {job.customerName}
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
                            {job.vanNumber}
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
                    Select a scheduled customer
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Choose a job from the left to
                    record the treatment.
                  </p>
                </article>
              ) : (
                <form
                  onSubmit={saveTreatment}
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
                          {selectedJob.address},{" "}
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

                        <Field label="Next visit / replacement date">
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
                          This customer has a locked
                          gate. Confirm access before
                          beginning the treatment.
                        </WarningBox>
                      )}

                      {selectedJob.dogOnProperty && (
                        <WarningBox tone="amber">
                          A dog may be present at this
                          property. Confirm the garden
                          is safe before entering.
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

                      {selectedChemical && (
                        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                          <div className="font-bold">
                            {
                              selectedChemical.name
                            }
                          </div>

                          <div className="mt-2">
                            Active ingredients:{" "}
                            {selectedChemical.activeIngredients ||
                              "Not recorded"}
                          </div>

                          {selectedChemical.registrationNumber && (
                            <div className="mt-1">
                              Registration:{" "}
                              {
                                selectedChemical.registrationNumber
                              }
                            </div>
                          )}

                          <Link
                            href={`/chemicals/${selectedChemical.id}`}
                            className="mt-3 inline-flex font-bold text-blue-800 hover:underline"
                          >
                            Open chemical sheet →
                          </Link>
                        </div>
                      )}
                    </Panel>
                  </section>

                  <section className="grid gap-4 lg:grid-cols-2">
                    <Panel>
                      <SectionHeading
                        title="Other products and materials"
                        description="Use these fields for granular fertilisers, seed or materials not selected through the Chemical Centre."
                      />

                      <div className="mt-5 space-y-4">
                        <Field label="Fertiliser">
                          <input
                            value={fertiliser}
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
                            value={herbicide}
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
                      Saving this visit removes it
                      from the remaining scheduled
                      jobs list.
                    </div>

                    <button
                      type="submit"
                      className="rounded-xl bg-[#176b37] px-6 py-3 text-sm font-semibold text-white hover:bg-[#125b2f]"
                    >
                      {status === "Completed"
                        ? "Complete and save treatment"
                        : status ===
                            "Needs Rescheduling"
                          ? "Save for rescheduling"
                          : "Save cancellation"}
                    </button>
                  </section>
                </form>
              )}
            </section>
          </section>
        </div>
      </main>
    </AppShell>
  );
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
    flowRateLitresPerMinute: 0,
    sprayWidthMetres: 0,
    pressureBar: 0,
  };
}

function findNextProgrammeVisitDate(
  programmes: Array<{
    customerNumber: string;
    visits: ProgrammeVisit[];
  }>,
  customerNumber: string,
  currentDate: string,
) {
  return programmes
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
    .sort()[0] ?? "";
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
  onChange: (value: number) => void;
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