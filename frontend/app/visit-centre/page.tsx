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
import { getTodayDateValue } from "@/lib/date-utils";
import { useRouteOrderStore } from "@/components/route-order-store";
import {
  createTreatmentApplication,
  createTreatmentRecord,
  type TreatmentApplication,
  type TreatmentRecord,
  type TreatmentStatus,
  useTreatmentStore,
} from "@/components/treatment-store";

type VisitJob = {
  id: string;
  customer: StoredCustomer;
  programme: CustomerProgramme;
  visit: ProgrammeVisit;
  standardGroupDate: string;
  overridden: boolean;
};

type VisitOutcome =
  | "Completed"
  | "No Access"
  | "Too Wet"
  | "Customer Request"
  | "Cancelled";

type ProductSelection = {
  id: string;
  chemicalId: string;
};

type StandardMix = {
  fertiliserId: string;
  herbicideId: string;
  additionalProductIds: string[];
};

type StandardMixStore = Record<string, StandardMix>;

type ApplicationCalculation = {
  productRequired: number;
  productUnit: ChemicalUnit;
  calibratedWaterVolumePerHectare: number;
  waterRequiredLitres: number;
  tankFills: number;
  productPerTank: number;
  estimatedProductCost: number;
};

type ProductRequirement = {
  chemical: ChemicalRecord;
  requiredAmount: number;
  requiredUnit: ChemicalUnit;
};

type CompletionResult = {
  outcome: VisitOutcome;
  completedAt: string;
  treatmentRecords: Array<{
    treatmentId: string;
    customerNumber: string;
    customerName: string;
    invoiceNumber: string;
  }>;
  stockDeductions: Array<{
    productName: string;
    amount: number;
    unit: ChemicalUnit;
  }>;
};

const observationOptions = [
  "Healthy",
  "Dry",
  "Moss",
  "Weeds",
  "Disease",
  "Shade",
  "Thin",
  "Bare areas",
  "Pet damage",
] as const;

const STANDARD_MIX_STORAGE_KEY =
  "greenflow-visit-centre-standard-mixes-v1";

const emptyStandardMix: StandardMix = {
  fertiliserId: "",
  herbicideId: "",
  additionalProductIds: [],
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

export default function VisitCentrePage() {
  const searchParams = useSearchParams();
  const requestedDate = searchParams.get("date");
  const requestedCustomer = searchParams.get("customer");

  const requestedGroupValue =
    searchParams.get("group");

  const requestedGroup =
    requestedGroupValue &&
    /^\d+$/.test(
      requestedGroupValue,
    )
      ? Number(
          requestedGroupValue,
        )
      : 0;


  const requestedVanValue =
    searchParams.get("van");

  const requestedVan =
    requestedVanValue &&
    /^\d+$/.test(
      requestedVanValue,
    )
      ? Number(
          requestedVanValue,
        )
      : 0;

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
    addTreatments,
  } = useTreatmentStore();

  const {
    chemicals,
    ready: chemicalsReady,
    deductChemicalStock,
  } = useChemicalStore();

  const {
    ready: routeOrderReady,
    sortBySavedRoute,
  } = useRouteOrderStore();

  const [selectedDate, setSelectedDate] = useState(
    isDateValue(requestedDate ?? "")
      ? requestedDate!
      : getTodayDateValue(),
  );

  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<VisitOutcome>("Completed");
  const [observations, setObservations] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const [fertiliserId, setFertiliserId] = useState("");
  const [herbicideId, setHerbicideId] = useState("");
  const [additionalProducts, setAdditionalProducts] = useState<
    ProductSelection[]
  >([]);

  const [standardMix, setStandardMix] =
    useState<StandardMix>(emptyStandardMix);

  const [standardMixReady, setStandardMixReady] =
    useState(false);

  const [replacementDate, setReplacementDate] = useState("");
  const [message, setMessage] = useState("");

  const [reviewOpen, setReviewOpen] = useState(false);

  const [
    completionResult,
    setCompletionResult,
  ] = useState<CompletionResult | null>(null);

  useEffect(() => {
    if (isDateValue(requestedDate ?? "")) {
      setSelectedDate(requestedDate!);
    }
  }, [requestedDate]);

  useEffect(() => {
    const savedMixes = readStandardMixStore();
    setStandardMix(
      savedMixes[selectedDate] ?? emptyStandardMix,
    );
    setStandardMixReady(true);
  }, [selectedDate]);

  const jobs = useMemo<VisitJob[]>(() => {
    const items = programmes
      .flatMap((programme) => {
        const customer = customers.find(
          (item) => item.customerNumber === programme.customerNumber,
        );

        if (!customer || customer.status !== "Active") {
          return [];
        }

        const season = seasons.find((item) => item.year === programme.year);
        const groupDates = season?.groupDates.find(
          (group) => group.groupNumber === customer.groupNumber,
        );

        return programme.visits
          .filter(
            (visit) =>
              visit.scheduledDate === selectedDate &&
              (visit.status === "Scheduled" || visit.status === "Planned"),
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
          .filter(
            () =>
              (
                requestedGroup === 0 ||
                customer.groupNumber ===
                  requestedGroup
              ) &&
              (
                requestedVan === 0 ||
                customer.vanNumber ===
                  requestedVan
              ),
          )
          .map((visit) => {
            const standardGroupDate =
              groupDates?.treatmentDates[visit.visitNumber - 1] ??
              visit.scheduledDate;

            return {
              id: `${programme.id}-${visit.id}`,
              customer,
              programme,
              visit,
              standardGroupDate,
              overridden: standardGroupDate !== visit.scheduledDate,
            };
          });
      })
      ;

    return sortBySavedRoute(
      items,
      selectedDate,
    );
  }, [
    programmes,
    customers,
    seasons,
    treatments,
    selectedDate,
    requestedGroup,
    requestedVan,
    sortBySavedRoute,
  ]);

  useEffect(() => {
    if (jobs.length === 0) {
      setSelectedJobIds(
        (current) =>
          current.length === 0
            ? current
            : [],
      );
      return;
    }

    const validIds = new Set(jobs.map((job) => job.id));

    setSelectedJobIds((current) => {
      const stillValid = current.filter((id) => validIds.has(id));

      if (stillValid.length > 0) {
        return stillValid;
      }

      const requestedJob = requestedCustomer
        ? jobs.find(
            (job) =>
              job.customer.customerNumber === requestedCustomer,
          )
        : undefined;

      return [requestedJob?.id ?? jobs[0].id];
    });
  }, [jobs, requestedCustomer]);

  const selectedJobs = jobs.filter((job) =>
    selectedJobIds.includes(job.id),
  );

  const activeChemicals = useMemo(
    () =>
      chemicals
        .filter((chemical) => chemical.active)
        .sort((first, second) =>
          first.name.localeCompare(second.name),
        ),
    [chemicals],
  );

  const fertilisers = activeChemicals.filter((chemical) =>
    isProductType(chemical.type, "fertiliser"),
  );

  const herbicides = activeChemicals.filter((chemical) =>
    isProductType(chemical.type, "herbicide"),
  );

  const selectedProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          [
            fertiliserId,
            herbicideId,
            ...additionalProducts.map((item) => item.chemicalId),
          ].filter(Boolean),
        ),
      ),
    [fertiliserId, herbicideId, additionalProducts],
  );

  const selectedProducts = selectedProductIds
    .map(
      (id) =>
        activeChemicals.find((chemical) => chemical.id === id) ?? null,
    )
    .filter((chemical): chemical is ChemicalRecord => Boolean(chemical));

  const standardMixProductIds = Array.from(
    new Set(
      [
        standardMix.fertiliserId,
        standardMix.herbicideId,
        ...standardMix.additionalProductIds,
      ].filter(Boolean),
    ),
  );

  const standardMixProducts = standardMixProductIds
    .map(
      (id) =>
        activeChemicals.find((chemical) => chemical.id === id) ?? null,
    )
    .filter((chemical): chemical is ChemicalRecord => Boolean(chemical));

  const totalSelectedArea = selectedJobs.reduce(
    (total, job) => total + job.customer.lawnSize,
    0,
  );

  const combinedPreview = selectedProducts.map((chemical) => {
    const calculation = calculateApplication(
      chemical,
      totalSelectedArea,
    );

    return {
      chemical,
      calculation,
    };
  });

  const completedOnDate = treatments.filter(
    (treatment) =>
      treatment.scheduledDate === selectedDate &&
      treatment.status === "Completed",
  ).length;

  const totalScheduled = jobs.length + completedOnDate;

  const progress =
    totalScheduled > 0
      ? Math.round((completedOnDate / totalScheduled) * 100)
      : 0;

  const allSelected =
    jobs.length > 0 &&
    jobs.every((job) => selectedJobIds.includes(job.id));

  const ready =
    customersReady &&
    programmesReady &&
    seasonsReady &&
    treatmentsReady &&
    chemicalsReady &&
    routeOrderReady;

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading Visit Centre...
          </div>
        </main>
      </AppShell>
    );
  }

  function toggleJob(jobId: string) {
    setSelectedJobIds((current) =>
      current.includes(jobId)
        ? current.filter((id) => id !== jobId)
        : [...current, jobId],
    );
  }

  function toggleAllJobs() {
    setSelectedJobIds(
      allSelected ? [] : jobs.map((job) => job.id),
    );
  }

  function toggleObservation(observation: string) {
    setObservations((current) =>
      current.includes(observation)
        ? current.filter((item) => item !== observation)
        : [...current, observation],
    );
  }

  function addAdditionalProduct() {
    setAdditionalProducts((current) => [
      ...current,
      {
        id: createSelectionId(),
        chemicalId: "",
      },
    ]);
  }

  function updateAdditionalProduct(id: string, chemicalId: string) {
    setAdditionalProducts((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              chemicalId,
            }
          : item,
      ),
    );
  }

  function removeAdditionalProduct(id: string) {
    setAdditionalProducts((current) =>
      current.filter((item) => item.id !== id),
    );
  }

  function updateStandardMix(
    updates: Partial<StandardMix>,
  ) {
    setStandardMix((current) => ({
      ...current,
      ...updates,
    }));
  }

  function addStandardAdditionalProduct() {
    setStandardMix((current) => ({
      ...current,
      additionalProductIds: [
        ...current.additionalProductIds,
        "",
      ],
    }));
  }

  function updateStandardAdditionalProduct(
    index: number,
    chemicalId: string,
  ) {
    setStandardMix((current) => ({
      ...current,
      additionalProductIds:
        current.additionalProductIds.map(
          (item, itemIndex) =>
            itemIndex === index
              ? chemicalId
              : item,
        ),
    }));
  }

  function removeStandardAdditionalProduct(
    index: number,
  ) {
    setStandardMix((current) => ({
      ...current,
      additionalProductIds:
        current.additionalProductIds.filter(
          (_item, itemIndex) =>
            itemIndex !== index,
        ),
    }));
  }

  function saveStandardMix() {
    const cleanedMix: StandardMix = {
      fertiliserId:
        standardMix.fertiliserId,
      herbicideId:
        standardMix.herbicideId,
      additionalProductIds:
        Array.from(
          new Set(
            standardMix.additionalProductIds.filter(
              Boolean,
            ),
          ),
        ),
    };

    const savedMixes =
      readStandardMixStore();

    savedMixes[selectedDate] =
      cleanedMix;

    window.localStorage.setItem(
      STANDARD_MIX_STORAGE_KEY,
      JSON.stringify(savedMixes),
    );

    setStandardMix(cleanedMix);

    showMessage(
      `Standard mix saved for ${formatDateWithDay(
        selectedDate,
      )}.`,
    );
  }

  function applyStandardMix() {
    if (
      standardMixProductIds.length === 0
    ) {
      showMessage(
        "Choose and save at least one product in the standard mix first.",
      );
      return;
    }

    setFertiliserId(
      standardMix.fertiliserId,
    );

    setHerbicideId(
      standardMix.herbicideId,
    );

    setAdditionalProducts(
      standardMix.additionalProductIds
        .filter(Boolean)
        .map((chemicalId) => ({
          id: createSelectionId(),
          chemicalId,
        })),
    );

    showMessage(
      `Standard mix applied to ${selectedJobs.length} selected visit${
        selectedJobs.length === 1
          ? ""
          : "s"
      }.`,
    );
  }

  function clearStandardMix() {
    const savedMixes =
      readStandardMixStore();

    delete savedMixes[selectedDate];

    window.localStorage.setItem(
      STANDARD_MIX_STORAGE_KEY,
      JSON.stringify(savedMixes),
    );

    setStandardMix(
      emptyStandardMix,
    );

    showMessage(
      `Standard mix cleared for ${formatDateWithDay(
        selectedDate,
      )}.`,
    );
  }

  function saveVisits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedJobs.length === 0) {
      showMessage("Select at least one scheduled customer.");
      return;
    }

    const needsReplacement =
      outcome === "No Access" ||
      outcome === "Too Wet" ||
      outcome === "Customer Request";

    if (outcome !== "Completed" && selectedJobs.length > 1) {
      showMessage(
        "Failed or cancelled visits must be recorded one customer at a time.",
      );
      return;
    }

    if (needsReplacement && !isDateValue(replacementDate)) {
      showMessage("Choose a valid replacement date.");
      return;
    }

    if (needsReplacement && replacementDate < getTodayDateValue()) {
      showMessage("The replacement date cannot be in the past.");
      return;
    }

    if (outcome === "Completed" && selectedProducts.length === 0) {
      const confirmed = window.confirm(
        "No products are selected. Complete these visits with no products recorded?",
      );

      if (!confirmed) {
        return;
      }
    }

    const requirements = aggregateProductRequirements(
      selectedJobs,
      selectedProducts,
    );

    const stockProblem = findStockProblem(requirements);

    if (outcome === "Completed" && stockProblem) {
      showMessage(stockProblem);
      return;
    }

    const notesWithObservations = [
      observations.length > 0
        ? `Observations: ${observations.join(", ")}.`
        : "",
      notes.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    const treatmentStatus: TreatmentStatus =
      outcome === "Completed"
        ? "Completed"
        : outcome === "Cancelled"
          ? "Cancelled"
          : "Needs Rescheduling";

    const createdTreatments: TreatmentRecord[] = [];

    for (const [index, job] of selectedJobs.entries()) {
      const applications =
        outcome === "Completed"
          ? selectedProducts.map((chemical) =>
              createApplicationForCustomer(
                chemical,
                job.customer.lawnSize,
              ),
            )
          : [];

      createdTreatments.push(
        createTreatmentRecord({
          id: createTreatmentId(index),
          programmeId: job.programme.id,
          programmeVisitId: job.visit.id,
          invoiceNumber:
            outcome === "Completed"
              ? createInvoiceNumber(index)
              : "",
          customerNumber: job.customer.customerNumber,
          scheduledDate: job.visit.scheduledDate,
          recordedDate: new Date().toISOString(),
          completedDate:
            outcome === "Completed"
              ? getTodayDateValue()
              : "",
          status: treatmentStatus,
          treatmentName: job.visit.treatmentName,
          treatmentAreaSquareMetres:
            outcome === "Completed"
              ? job.customer.lawnSize
              : 0,
          applications,
          notes: appendNote(
            notesWithObservations,
            createOutcomeNote(outcome, replacementDate),
          ),
          nextVisitDate: needsReplacement
            ? replacementDate
            : findNextProgrammeVisitDate(
                programmes,
                job.customer.customerNumber,
                job.visit.scheduledDate,
              ),
        }),
      );
    }

    if (outcome === "Completed") {
      for (const requirement of requirements) {
        const stockResult = deductChemicalStock(
          requirement.chemical.id,
          requirement.requiredAmount,
          requirement.requiredUnit,
        );

        if (!stockResult.success) {
          showMessage(stockResult.message);
          return;
        }
      }
    }

    for (const job of selectedJobs) {
      saveProgramme({
        ...job.programme,
        visits: job.programme.visits.map((visit) =>
          visit.id === job.visit.id
            ? {
                ...visit,
                status:
                  outcome === "Completed"
                    ? "Completed"
                    : "Skipped",
                notes: appendNote(
                  visit.notes,
                  createOutcomeNote(outcome, replacementDate),
                ),
              }
            : visit,
        ),
      });
    }

    const result = addTreatments(createdTreatments);

    const completedCount = selectedJobs.length;

    setCompletionResult({
      outcome,
      completedAt: new Date().toISOString(),
      treatmentRecords: createdTreatments.map(
        (treatment) => {
          const customer = selectedJobs.find(
            (job) =>
              job.customer.customerNumber ===
              treatment.customerNumber,
          )?.customer;

          return {
            treatmentId: treatment.id,
            customerNumber:
              treatment.customerNumber,
            customerName:
              customer?.fullName ??
              treatment.customerNumber,
            invoiceNumber:
              treatment.invoiceNumber,
          };
        },
      ),
      stockDeductions:
        outcome === "Completed"
          ? requirements.map(
              (requirement) => ({
                productName:
                  requirement.chemical.name,
                amount:
                  requirement.requiredAmount,
                unit:
                  requirement.requiredUnit,
              }),
            )
          : [],
    });

    setSelectedJobIds([]);
    setReviewOpen(false);
    resetSharedForm();

    showMessage(
      outcome === "Completed"
        ? `${completedCount} visit${
            completedCount === 1 ? "" : "s"
          } completed with ${selectedProducts.length} product${
            selectedProducts.length === 1 ? "" : "s"
          } recorded for each customer.`
        : outcome === "Cancelled"
          ? "Visit cancellation saved."
          : "Visit added to the rescheduling queue.",
    );

    if (result.skipped > 0) {
      window.setTimeout(() => {
        showMessage(
          `${result.skipped} duplicate treatment record${
            result.skipped === 1 ? " was" : "s were"
          } skipped.`,
        );
      }, 4500);
    }
  }

  function resetSharedForm() {
    setOutcome("Completed");
    setObservations([]);
    setNotes("");
    setFertiliserId("");
    setHerbicideId("");
    setAdditionalProducts([]);
    setReplacementDate("");
  }

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 4200);
  }

  return (
    <AppShell>
      <main className="p-4 md:p-6">
        <div className="mx-auto max-w-[1550px]">
          <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link
                href="/jobs"
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Back to Jobs
              </Link>

              <h1 className="mt-2 text-3xl font-bold">
                Visit Centre
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Select one or several customers, choose the products used once,
                and create an individual treatment record and invoice for every
                selected visit.
              </p>
            </div>

            <Field label="Working date">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => {
                    setSelectedDate(event.target.value);
                    setSelectedJobIds([]);
                    resetSharedForm();
                  }}
                  className="min-w-[190px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-[#338b45] focus:ring-4 focus:ring-green-100"
                />

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(getTodayDateValue());
                    setSelectedJobIds([]);
                    resetSharedForm();
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Today
                </button>
              </div>
            </Field>
          </header>

          {(requestedGroup > 0 ||
            requestedVan > 0) && (
            <section className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
                    Route filter active
                  </div>

                  <h2 className="mt-1 text-xl font-bold text-green-950">
                    {requestedGroup > 0 &&
                    requestedVan > 0
                      ? `Viewing Group ${requestedGroup}, Van ${requestedVan}`
                      : requestedGroup > 0
                        ? `Viewing Group ${requestedGroup}`
                        : `Viewing Van ${requestedVan}`}
                  </h2>

                  <p className="mt-1 text-sm text-green-800">
                    Showing only matching visits scheduled for{" "}
                    <strong>
                      {formatDateWithDay(
                        selectedDate,
                      )}
                    </strong>
                    .
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/routes?date=${selectedDate}`}
                    className="rounded-xl border border-green-300 bg-white px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100"
                  >
                    Back to Groups & Routes
                  </Link>

                  <Link
                    href={`/visit-centre?date=${selectedDate}`}
                    className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
                  >
                    Clear route filter
                  </Link>
                </div>
              </div>
            </section>
          )}

          {jobs.length === 0 && (
            <section className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
              {requestedGroup > 0 ||
              requestedVan > 0
                ? `No remaining visits match this route filter on ${formatDateWithDay(
                    selectedDate,
                  )}.`
                : `No visits are scheduled for ${formatDateWithDay(
                    selectedDate,
                  )}.`}{" "}
              Choose another calendar date
              {requestedGroup > 0 ||
              requestedVan > 0
                ? " or clear the route filter."
                : " or return to Today’s Jobs."}
            </section>
          )}

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          {completionResult && (
            <section className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
                    Visit processing complete
                  </div>

                  <h2 className="mt-2 text-xl font-bold text-green-950">
                    {completionResult.treatmentRecords.length} visit
                    {completionResult.treatmentRecords.length === 1
                      ? ""
                      : "s"}{" "}
                    saved successfully
                  </h2>

                  <p className="mt-1 text-sm text-green-800">
                    Treatment records, programme updates and internal product usage have been saved.
                    {completionResult.outcome === "Completed"
                      ? " Customer documents are now available from each treatment record."
                      : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCompletionResult(null)
                  }
                  className="rounded-xl border border-green-300 bg-white px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-100"
                >
                  Dismiss
                </button>
              </div>

              {completionResult.stockDeductions.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-bold text-green-950">
                    Stock deducted
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {completionResult.stockDeductions.map(
                      (item) => (
                        <span
                          key={`${item.productName}-${item.unit}`}
                          className="rounded-full border border-green-200 bg-white px-3 py-1.5 text-xs font-semibold text-green-800"
                        >
                          {item.productName}:{" "}
                          {formatApplicationAmount(
                            item.amount,
                            item.unit,
                          )}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {completionResult.treatmentRecords.map(
                  (record) => (
                    <div
                      key={record.treatmentId}
                      className="rounded-xl border border-green-200 bg-white p-3"
                    >
                      <div className="font-bold text-slate-900">
                        {record.customerName}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Customer {record.customerNumber}
                        {record.invoiceNumber
                          ? ` · ${record.invoiceNumber}`
                          : ""}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/customers/${record.customerNumber}`}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                        >
                          Customer
                        </Link>

                        {completionResult.outcome === "Completed" && (
                          <Link
                            href={`/documents/${record.treatmentId}`}
                            className="rounded-lg bg-[#176b37] px-3 py-2 text-xs font-semibold text-white hover:bg-[#125b2f]"
                          >
                            Open document
                          </Link>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/treatments"
                  className="rounded-xl border border-green-300 bg-white px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100"
                >
                  Open treatment records
                </Link>

                {completionResult.outcome === "Completed" && (
                  <Link
                    href="/documents"
                    className="rounded-xl border border-green-300 bg-white px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100"
                  >
                    Open document centre
                  </Link>
                )}

                <Link
                  href="/chemical-usage"
                  className="rounded-xl border border-green-300 bg-white px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100"
                >
                  Review product usage
                </Link>
              </div>
            </section>
          )}

          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-500">
                  Route progress
                </div>

                <div className="mt-1 text-xl font-bold">
                  {completedOnDate} / {totalScheduled} completed
                </div>
              </div>

              <div className="min-w-[260px] flex-1">
                <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[#176b37] transition-all"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <div className="mt-1 text-right text-xs font-semibold text-slate-500">
                  {progress}%
                </div>
              </div>
            </div>
          </section>

          <form onSubmit={saveVisits}>
            <section className="grid gap-4 xl:grid-cols-[390px_1fr]">
              <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3 px-2 pt-1">
                  <div>
                    <h2 className="text-lg font-bold">
                      Remaining visits
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {selectedJobs.length} selected
                      {requestedGroup > 0
                        ? ` · Group ${requestedGroup}`
                        : ""}
                      {requestedVan > 0
                        ? ` · Van ${requestedVan}`
                        : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleAllJobs}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                  >
                    {allSelected ? "Clear all" : "Select all"}
                  </button>
                </div>

                <div className="mt-3 max-h-[72vh] space-y-2 overflow-y-auto">
                  {jobs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                      No visits remain on this date.
                    </div>
                  ) : (
                    jobs.map((job) => {
                      const selected = selectedJobIds.includes(job.id);

                      return (
                        <label
                          key={job.id}
                          className={`block cursor-pointer rounded-xl border p-3 transition ${
                            selected
                              ? "border-[#338b45] bg-green-50"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleJob(job.id)}
                              className="mt-1 h-5 w-5"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="font-bold">
                                  {job.customer.fullName}
                                </div>

                                {job.overridden && (
                                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">
                                    Override
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                Group {job.customer.groupNumber} · Van{" "}
                                {job.customer.vanNumber} ·{" "}
                                {job.customer.lawnSize.toLocaleString("en-GB")} m²
                              </div>

                              <div className="mt-2 text-sm text-slate-600">
                                {job.customer.address}, {job.customer.postcode}
                              </div>

                              <div className="mt-2 text-sm font-semibold text-[#176b37]">
                                {job.visit.treatmentName}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {job.customer.lockedGate && (
                                  <WarningPill tone="red">
                                    Locked gate
                                  </WarningPill>
                                )}

                                {job.customer.dogOnProperty && (
                                  <WarningPill tone="amber">
                                    Dog
                                  </WarningPill>
                                )}
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </aside>

              <section className="min-w-0 space-y-4">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {selectedJobs.length === 1
                          ? selectedJobs[0].customer.fullName
                          : `${selectedJobs.length} selected customers`}
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        Combined lawn area:{" "}
                        <strong className="text-slate-900">
                          {totalSelectedArea.toLocaleString("en-GB")} m²
                        </strong>
                      </p>
                    </div>

                    {selectedJobs.length === 1 && (
                      <Link
                        href={`/customers/${selectedJobs[0].customer.customerNumber}`}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                      >
                        Open customer
                      </Link>
                    )}
                  </div>
                </article>

                <section className="grid gap-4 lg:grid-cols-2">
                  <Panel title="Visit outcome">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {(
                        [
                          "Completed",
                          "No Access",
                          "Too Wet",
                          "Customer Request",
                          "Cancelled",
                        ] as VisitOutcome[]
                      ).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setOutcome(option)}
                          className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                            outcome === option
                              ? "border-[#176b37] bg-green-50 text-[#176b37]"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    {outcome !== "Completed" &&
                      outcome !== "Cancelled" && (
                        <div className="mt-4">
                          <Field label="Replacement date">
                            <input
                              type="date"
                              min={getTodayDateValue()}
                              value={replacementDate}
                              onChange={(event) =>
                                setReplacementDate(event.target.value)
                              }
                              className={inputClass}
                            />
                          </Field>
                        </div>
                      )}

                    {outcome !== "Completed" && selectedJobs.length > 1 && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        Failed and cancelled visits must be recorded one customer
                        at a time.
                      </div>
                    )}
                  </Panel>

                  <Panel title="Quick observations">
                    <div className="flex flex-wrap gap-2">
                      {observationOptions.map((observation) => {
                        const active = observations.includes(observation);

                        return (
                          <button
                            key={observation}
                            type="button"
                            onClick={() => toggleObservation(observation)}
                            className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                              active
                                ? "border-[#176b37] bg-[#176b37] text-white"
                                : "border-slate-300 bg-white hover:bg-slate-50"
                            }`}
                          >
                            {observation}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4">
                      <Field label="Shared visit notes">
                        <textarea
                          rows={5}
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                          placeholder="These notes will be saved to every selected visit."
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </Panel>
                </section>

                {outcome === "Completed" && standardMixReady && (
                  <Panel title="Today’s Standard Mix">
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-green-900">
                            Reusable products for {formatDateWithDay(selectedDate)}
                          </div>

                          <p className="mt-1 text-sm leading-6 text-green-800">
                            Save the products used for this working date, then
                            apply them to the selected customers in one click.
                          </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-green-800">
                          {standardMixProducts.length} product
                          {standardMixProducts.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <Field label="Standard fertiliser">
                        <select
                          value={standardMix.fertiliserId}
                          onChange={(event) =>
                            updateStandardMix({
                              fertiliserId: event.target.value,
                            })
                          }
                          className={inputClass}
                        >
                          <option value="">No fertiliser</option>

                          {fertilisers.map((chemical) => (
                            <option key={chemical.id} value={chemical.id}>
                              {chemical.name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Standard herbicide">
                        <select
                          value={standardMix.herbicideId}
                          onChange={(event) =>
                            updateStandardMix({
                              herbicideId: event.target.value,
                            })
                          }
                          className={inputClass}
                        >
                          <option value="">No herbicide</option>

                          {herbicides.map((chemical) => (
                            <option key={chemical.id} value={chemical.id}>
                              {chemical.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <div className="mt-4 space-y-3">
                      {standardMix.additionalProductIds.map(
                        (chemicalId, index) => (
                          <div
                            key={`${index}-${chemicalId}`}
                            className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto] sm:items-end"
                          >
                            <Field label={`Standard additional product ${index + 1}`}>
                              <select
                                value={chemicalId}
                                onChange={(event) =>
                                  updateStandardAdditionalProduct(
                                    index,
                                    event.target.value,
                                  )
                                }
                                className={inputClass}
                              >
                                <option value="">Choose product</option>

                                {activeChemicals.map((chemical) => (
                                  <option key={chemical.id} value={chemical.id}>
                                    {chemical.name} — {chemical.type}
                                  </option>
                                ))}
                              </select>
                            </Field>

                            <button
                              type="button"
                              onClick={() =>
                                removeStandardAdditionalProduct(index)
                              }
                              className="h-11 rounded-xl border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        ),
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={addStandardAdditionalProduct}
                        className="rounded-xl border border-[#338b45] bg-white px-4 py-2.5 text-sm font-semibold text-[#176b37] hover:bg-green-50"
                      >
                        + Add another standard product
                      </button>

                      <button
                        type="button"
                        onClick={saveStandardMix}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                      >
                        Save standard mix
                      </button>

                      <button
                        type="button"
                        onClick={applyStandardMix}
                        disabled={standardMixProductIds.length === 0}
                        className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#125b2f] disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        Apply to {selectedJobs.length} selected
                      </button>

                      <button
                        type="button"
                        onClick={clearStandardMix}
                        className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        Clear saved mix
                      </button>
                    </div>
                  </Panel>
                )}

                {outcome === "Completed" && (
                  <Panel title="Products used">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Fertiliser">
                        <select
                          value={fertiliserId}
                          onChange={(event) =>
                            setFertiliserId(event.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="">No fertiliser</option>

                          {fertilisers.map((chemical) => (
                            <option key={chemical.id} value={chemical.id}>
                              {chemical.name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Herbicide">
                        <select
                          value={herbicideId}
                          onChange={(event) =>
                            setHerbicideId(event.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="">No herbicide</option>

                          {herbicides.map((chemical) => (
                            <option key={chemical.id} value={chemical.id}>
                              {chemical.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <div className="mt-4 space-y-3">
                      {additionalProducts.map((selection, index) => (
                        <div
                          key={selection.id}
                          className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto] sm:items-end"
                        >
                          <Field label={`Additional product ${index + 1}`}>
                            <select
                              value={selection.chemicalId}
                              onChange={(event) =>
                                updateAdditionalProduct(
                                  selection.id,
                                  event.target.value,
                                )
                              }
                              className={inputClass}
                            >
                              <option value="">Choose product</option>

                              {activeChemicals.map((chemical) => (
                                <option key={chemical.id} value={chemical.id}>
                                  {chemical.name} — {chemical.type}
                                </option>
                              ))}
                            </select>
                          </Field>

                          <button
                            type="button"
                            onClick={() =>
                              removeAdditionalProduct(selection.id)
                            }
                            className="h-11 rounded-xl border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={addAdditionalProduct}
                      className="mt-4 rounded-xl border border-[#338b45] bg-white px-4 py-2.5 text-sm font-semibold text-[#176b37] hover:bg-green-50"
                    >
                      + Add wetting agent, seaweed or another product
                    </button>

                    {combinedPreview.length > 0 && (
                      <div className="mt-5">
                        <h3 className="font-bold">
                          Combined requirement for selected customers
                        </h3>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {combinedPreview.map(({ chemical, calculation }) => (
                            <div
                              key={chemical.id}
                              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="font-bold">
                                {chemical.name}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {chemical.type}
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <InfoBox
                                  label="Product"
                                  value={formatApplicationAmount(
                                    calculation.productRequired,
                                    calculation.productUnit,
                                  )}
                                />

                                <InfoBox
                                  label="Cost"
                                  value={`£${calculation.estimatedProductCost.toFixed(
                                    2,
                                  )}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Panel>
                )}

                <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-200 bg-white p-4 shadow-xl">
                  <div className="text-sm text-slate-500">
                    {selectedJobs.length === 0
                      ? "Select customers from the route list."
                      : outcome === "Completed"
                        ? `${selectedJobs.length} individual treatment record${
                            selectedJobs.length === 1 ? "" : "s"
                          } and invoice${
                            selectedJobs.length === 1 ? "" : "s"
                          } will be created.`
                        : "This outcome will be recorded for the selected customer."}
                  </div>

                  <button
                    type="button"
                    onClick={() => setReviewOpen(true)}
                    disabled={
                      selectedJobs.length === 0 ||
                      (outcome !== "Completed" && selectedJobs.length > 1)
                    }
                    className="rounded-xl bg-[#176b37] px-8 py-3 text-base font-bold text-white hover:bg-[#125b2f] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {outcome === "Completed"
                      ? `Review ${selectedJobs.length || ""} visit${
                          selectedJobs.length === 1 ? "" : "s"
                        }`
                      : outcome === "Cancelled"
                        ? "Review cancellation"
                        : "Review reschedule"}
                  </button>
                </div>
              </section>
            </section>

            {reviewOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                  <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
                    <div>
                      <h2 className="text-2xl font-bold">
                        Review bulk completion
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Check the customers, outcome and products before GreenFlow creates the individual records.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReviewOpen(false)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>

                  <div className="space-y-5 p-5">
                    <div className="grid gap-3 sm:grid-cols-4">
                      <ReviewStat label="Working date" value={formatDateWithDay(selectedDate)} />
                      <ReviewStat label="Customers" value={String(selectedJobs.length)} />
                      <ReviewStat label="Combined area" value={`${totalSelectedArea.toLocaleString("en-GB")} m²`} />
                      <ReviewStat label="Outcome" value={outcome} />
                    </div>

                    <section className="rounded-xl border border-slate-200">
                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-bold">
                        Selected customers
                      </div>

                      <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                        {selectedJobs.map((job) => (
                          <div
                            key={job.id}
                            className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_120px_120px]"
                          >
                            <div>
                              <div className="font-bold">{job.customer.fullName}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                {job.customer.address}, {job.customer.postcode}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-500">Group</div>
                              <div className="mt-1 font-semibold">{job.customer.groupNumber}</div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-500">Area</div>
                              <div className="mt-1 font-semibold">
                                {job.customer.lawnSize.toLocaleString("en-GB")} m²
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {outcome === "Completed" && (
                      <section className="rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold">Products to record</h3>

                        {selectedProducts.length === 0 ? (
                          <p className="mt-3 text-sm text-amber-700">
                            No products are selected. You will be asked to confirm this when completing.
                          </p>
                        ) : (
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {combinedPreview.map(({ chemical, calculation }) => (
                              <div
                                key={chemical.id}
                                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                              >
                                <div className="font-bold">{chemical.name}</div>
                                <div className="mt-1 text-xs text-slate-500">{chemical.type}</div>
                                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                                  <span className="text-slate-500">Combined requirement</span>
                                  <span className="font-bold">
                                    {formatApplicationAmount(
                                      calculation.productRequired,
                                      calculation.productUnit,
                                    )}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    )}

                    {(observations.length > 0 || notes.trim()) && (
                      <section className="rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold">Shared visit information</h3>

                        {observations.length > 0 && (
                          <p className="mt-3 text-sm text-slate-700">
                            <strong>Observations:</strong> {observations.join(", ")}
                          </p>
                        )}

                        {notes.trim() && (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {notes.trim()}
                          </p>
                        )}
                      </section>
                    )}
                  </div>

                  <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4">
                    <p className="text-sm text-slate-500">
                      GreenFlow will create one separate treatment record and invoice for every selected completed visit.
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewOpen(false)}
                        className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50"
                      >
                        Go back
                      </button>

                      <button
                        type="submit"
                        className="rounded-xl bg-[#176b37] px-6 py-3 text-sm font-bold text-white hover:bg-[#125b2f]"
                      >
                        {outcome === "Completed"
                          ? `Complete ${selectedJobs.length} visit${selectedJobs.length === 1 ? "" : "s"}`
                          : outcome === "Cancelled"
                            ? "Confirm cancellation"
                            : "Confirm and reschedule"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>
    </AppShell>
  );
}

function ReviewStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}

function readStandardMixStore(): StandardMixStore {
  if (
    typeof window === "undefined"
  ) {
    return {};
  }

  const saved =
    window.localStorage.getItem(
      STANDARD_MIX_STORAGE_KEY,
    );

  if (!saved) {
    return {};
  }

  try {
    const parsed =
      JSON.parse(saved) as StandardMixStore;

    return parsed &&
      typeof parsed === "object"
      ? parsed
      : {};
  } catch {
    window.localStorage.removeItem(
      STANDARD_MIX_STORAGE_KEY,
    );

    return {};
  }
}

function aggregateProductRequirements(
  jobs: VisitJob[],
  products: ChemicalRecord[],
): ProductRequirement[] {
  return products.map((chemical) => {
    const calculations = jobs.map((job) =>
      calculateApplication(
        chemical,
        job.customer.lawnSize,
      ),
    );

    return {
      chemical,
      requiredAmount: roundToThreeDecimals(
        calculations.reduce(
          (total, calculation) =>
            total + calculation.productRequired,
          0,
        ),
      ),
      requiredUnit: getProductUnit(
        chemical.applicationRateUnit,
      ),
    };
  });
}

function findStockProblem(
  requirements: ProductRequirement[],
) {
  for (const requirement of requirements) {
    const available = getAvailableStockAmount(
      requirement.chemical,
      requirement.requiredUnit,
    );

    if (available === null) {
      continue;
    }

    if (
      requirement.requiredAmount >
      available + 0.000001
    ) {
      return `${requirement.chemical.name} requires ${formatApplicationAmount(
        requirement.requiredAmount,
        requirement.requiredUnit,
      )}, but only ${formatApplicationAmount(
        available,
        requirement.requiredUnit,
      )} is available in stock.`;
    }
  }

  return "";
}

function getAvailableStockAmount(
  chemical: ChemicalRecord,
  requiredUnit: ChemicalUnit,
) {
  const packAmount = convertAmount(
    chemical.packSize,
    chemical.packUnit,
    requiredUnit,
  );

  if (packAmount === null) {
    return null;
  }

  return chemical.currentStock * packAmount;
}

function convertAmount(
  amount: number,
  fromUnit: ChemicalUnit,
  toUnit: ChemicalUnit,
) {
  if (fromUnit === toUnit) {
    return amount;
  }

  if (fromUnit === "kg" && toUnit === "g") {
    return amount * 1000;
  }

  if (fromUnit === "g" && toUnit === "kg") {
    return amount / 1000;
  }

  if (fromUnit === "L" && toUnit === "ml") {
    return amount * 1000;
  }

  if (fromUnit === "ml" && toUnit === "L") {
    return amount / 1000;
  }

  return null;
}

function createApplicationForCustomer(
  chemical: ChemicalRecord,
  areaSquareMetres: number,
): TreatmentApplication {
  const calculation = calculateApplication(
    chemical,
    areaSquareMetres,
  );

  return createTreatmentApplication({
    productId: chemical.id,
    productName: chemical.name,
    productType: chemical.type,
    activeIngredients: chemical.activeIngredients,
    registrationNumber: chemical.registrationNumber,
    applicationRate: chemical.applicationRate,
    applicationRateUnit: chemical.applicationRateUnit,
    productRequired: calculation.productRequired,
    productUnit: calculation.productUnit,
    calibratedWaterVolumePerHectare:
      calculation.calibratedWaterVolumePerHectare,
    waterRequiredLitres: calculation.waterRequiredLitres,
    tankCapacityLitres: chemical.tankCapacityLitres,
    tankFills: calculation.tankFills,
    productPerTank: calculation.productPerTank,
    estimatedProductCost: calculation.estimatedProductCost,
    nozzleColour: chemical.nozzleColour,
    nozzleType: chemical.nozzleType,
    knapsackMake: chemical.knapsackMake,
    knapsackModel: chemical.knapsackModel,
    walkingSpeedKph: chemical.walkingSpeedKph,
    flowRateLitresPerMinute: chemical.flowRateLitresPerMinute,
    sprayWidthMetres: chemical.sprayWidthMetres,
    pressureBar: chemical.pressureBar,
  });
}

function hasRecordedOutcome(
  treatments: TreatmentRecord[],
  programme: CustomerProgramme,
  visit: ProgrammeVisit,
  customerNumber: string,
) {
  return treatments.some(
    (treatment) =>
      treatment.status !== "Rescheduled" &&
      ((treatment.programmeId === programme.id &&
        treatment.programmeVisitId === visit.id) ||
        (!treatment.programmeVisitId &&
          treatment.customerNumber === customerNumber &&
          treatment.scheduledDate === visit.scheduledDate &&
          treatment.treatmentName === visit.treatmentName)),
  );
}

function findNextProgrammeVisitDate(
  programmes: CustomerProgramme[],
  customerNumber: string,
  currentDate: string,
) {
  return (
    programmes
      .filter((programme) => programme.customerNumber === customerNumber)
      .flatMap((programme) => programme.visits)
      .filter(
        (visit) =>
          visit.scheduledDate > currentDate &&
          (visit.status === "Scheduled" || visit.status === "Planned"),
      )
      .map((visit) => visit.scheduledDate)
      .sort()[0] ?? ""
  );
}

function createOutcomeNote(
  outcome: VisitOutcome,
  replacementDate: string,
) {
  if (outcome === "Completed") {
    return "Visit completed.";
  }

  if (outcome === "Cancelled") {
    return "Visit cancelled.";
  }

  const reason =
    outcome === "No Access"
      ? "No access."
      : outcome === "Too Wet"
        ? "Conditions were too wet."
        : "Customer requested a different date.";

  return replacementDate
    ? `${reason} Suggested replacement date: ${formatDate(
        replacementDate,
      )}.`
    : reason;
}

function appendNote(existing: string, next: string) {
  return [existing.trim(), next.trim()]
    .filter(Boolean)
    .join("\n");
}

function calculateApplication(
  chemical: ChemicalRecord,
  areaSquareMetres: number,
): ApplicationCalculation {
  const safeArea = Math.max(0, areaSquareMetres);
  const areaHectares = safeArea / 10000;

  const hasCalibration =
    chemical.flowRateLitresPerMinute > 0 &&
    chemical.walkingSpeedKph > 0 &&
    chemical.sprayWidthMetres > 0;

  const waterPerHectare = hasCalibration
    ? (600 * chemical.flowRateLitresPerMinute) /
      (chemical.walkingSpeedKph * chemical.sprayWidthMetres)
    : Math.max(0, chemical.waterVolumePerHectare);

  const productRequired =
    chemical.applicationRateUnit === "kg/ha" ||
    chemical.applicationRateUnit === "L/ha"
      ? chemical.applicationRate * areaHectares
      : chemical.applicationRate * safeArea;

  const waterRequiredLitres =
    chemical.applicationRateUnit === "g/m²"
      ? 0
      : waterPerHectare * areaHectares;

  const tankFills =
    chemical.tankCapacityLitres > 0 && waterRequiredLitres > 0
      ? waterRequiredLitres / chemical.tankCapacityLitres
      : 0;

  const productPerTank =
    tankFills > 0
      ? productRequired / tankFills
      : productRequired;

  const productInPackUnit = convertAmount(
    productRequired,
    getProductUnit(chemical.applicationRateUnit),
    chemical.packUnit,
  );

  const estimatedProductCost =
    chemical.packSize > 0 && productInPackUnit !== null
      ? (productInPackUnit / chemical.packSize) *
        chemical.costPerPack
      : 0;

  return {
    productRequired: roundToThreeDecimals(productRequired),
    productUnit: getProductUnit(chemical.applicationRateUnit),
    calibratedWaterVolumePerHectare:
      roundToThreeDecimals(waterPerHectare),
    waterRequiredLitres:
      roundToThreeDecimals(waterRequiredLitres),
    tankFills: roundToThreeDecimals(tankFills),
    productPerTank: roundToThreeDecimals(productPerTank),
    estimatedProductCost: roundToTwoDecimals(
      estimatedProductCost,
    ),
  };
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
  if (unit === "L" && amount < 1) {
    return `${(amount * 1000).toFixed(1)} ml`;
  }

  if (unit === "kg" && amount < 1) {
    return `${(amount * 1000).toFixed(1)} g`;
  }

  return `${amount.toFixed(3)} ${unit}`;
}

function createTreatmentId(index: number) {
  return `treatment-${Date.now()}-${index}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function createSelectionId() {
  return `selection-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function createInvoiceNumber(index: number) {
  const now = new Date();

  return `INV-${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}${String(now.getDate()).padStart(
    2,
    "0",
  )}-${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes(),
  ).padStart(2, "0")}${String(now.getSeconds()).padStart(
    2,
    "0",
  )}-${String(index + 1).padStart(2, "0")}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = parseDate(value);

  return (
    !Number.isNaN(date.getTime()) &&
    toDateValue(date) === value
  );
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  if (!isDateValue(value)) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseDate(value));
}

function formatDateWithDay(value: string) {
  if (!isDateValue(value)) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDate(value));
}

function isProductType(value: string, expected: string) {
  return value
    .trim()
    .toLowerCase()
    .includes(expected);
}

function roundToThreeDecimals(value: number) {
  return (
    Math.round((value + Number.EPSILON) * 1000) / 1000
  );
}

function roundToTwoDecimals(value: number) {
  return (
    Math.round((value + Number.EPSILON) * 100) / 100
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

function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">
        {title}
      </h2>

      <div className="mt-4">
        {children}
      </div>
    </article>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 font-bold">
        {value}
      </div>
    </div>
  );
}

function WarningPill({
  tone,
  children,
}: {
  tone: "red" | "amber";
  children: ReactNode;
}) {
  const styles =
    tone === "red"
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-800";

  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-bold ${styles}`}
    >
      {children}
    </span>
  );
}