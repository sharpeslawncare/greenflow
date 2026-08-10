"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
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
import { useSettingsStore } from "@/components/settings-store";
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

type HerbicideApplicationMethod =
  | "Full Lawn Spray"
  | "Spot Spray";

type VisitProductMode =
  | "today"
  | "custom";

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

const SPOT_SPRAY_PERCENTAGE = 20;

const emptyStandardMix: StandardMix = {
  fertiliserId: "",
  herbicideId: "",
  additionalProductIds: [],
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

export default function VisitCentrePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <main className="p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
              Loading Visit Centre...
            </div>
          </main>
        </AppShell>
      }
    >
      <VisitCentrePageContent />
    </Suspense>
  );
}

function VisitCentrePageContent() {
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
    hasTreatmentForProgrammeVisit,
  } = useTreatmentStore();

  const {
    chemicals,
    ready: chemicalsReady,
    deductChemicalStockBatch,
  } = useChemicalStore();

  const {
    ready: routeOrderReady,
    sortBySavedRoute,
  } = useRouteOrderStore();

  const {
    ready: settingsReady,
    reserveInvoiceNumbers,
  } = useSettingsStore();

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
  const [herbicideApplicationMethod, setHerbicideApplicationMethod] =
    useState<HerbicideApplicationMethod>("Full Lawn Spray");

  const [visitProductMode, setVisitProductMode] =
    useState<VisitProductMode>("today");

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
  const [reviewError, setReviewError] = useState("");

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

  const spotSprayAvailable =
    selectedJobs.length > 0 &&
    selectedJobs.every((job) =>
      isSeasonalWeedAndFeed(job.visit.treatmentName),
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

  const effectiveFertiliserId =
    visitProductMode === "today"
      ? standardMix.fertiliserId
      : fertiliserId;

  const effectiveHerbicideId =
    visitProductMode === "today"
      ? standardMix.herbicideId
      : herbicideId;

  const effectiveAdditionalProductIds =
    visitProductMode === "today"
      ? standardMix.additionalProductIds
      : additionalProducts.map(
          (item) =>
            item.chemicalId,
        );

  useEffect(() => {
    if (
      !spotSprayAvailable ||
      !effectiveHerbicideId
    ) {
      setHerbicideApplicationMethod(
        "Full Lawn Spray",
      );
    }
  }, [
    spotSprayAvailable,
    effectiveHerbicideId,
  ]);

  const selectedProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          [
            effectiveFertiliserId,
            effectiveHerbicideId,
            ...effectiveAdditionalProductIds,
          ].filter(Boolean),
        ),
      ),
    [
      effectiveFertiliserId,
      effectiveHerbicideId,
      effectiveAdditionalProductIds,
    ],
  );

  const selectedProducts = selectedProductIds
    .map(
      (id) =>
        activeChemicals.find((chemical) => chemical.id === id) ?? null,
    )
    .filter((chemical): chemical is ChemicalRecord => Boolean(chemical));

  const reviewRequirements =
    aggregateProductRequirements(
      selectedJobs,
      selectedProducts,
      herbicideApplicationMethod,
      spotSprayAvailable,
    );

  const reviewReorderWarnings =
    getReorderWarnings(
      reviewRequirements,
    );

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

  const todayMixAvailable =
    standardMixProductIds.length > 0;

  useEffect(() => {
    if (
      standardMixReady &&
      !todayMixAvailable &&
      visitProductMode === "today"
    ) {
      setVisitProductMode(
        "custom",
      );
    }
  }, [
    standardMixReady,
    todayMixAvailable,
    visitProductMode,
  ]);

  const totalSelectedArea = selectedJobs.reduce(
    (total, job) => total + job.customer.lawnSize,
    0,
  );

  const combinedPreview = selectedProducts.map((chemical) => {
    const fullLawnCalculation =
      calculateApplication(
        chemical,
        totalSelectedArea,
      );

    const calculation =
      applyHerbicideApplicationMethod(
        chemical,
        fullLawnCalculation,
        herbicideApplicationMethod,
        spotSprayAvailable,
      );

    return {
      chemical,
      calculation,
      fullLawnCalculation,
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
    routeOrderReady &&
    settingsReady;

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
    setVisitProductMode(
      "today",
    );

    showMessage(
      `Today's mix saved and selected for ${formatDateWithDay(
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

    setVisitProductMode(
      "custom",
    );

    showMessage(
      `Today's mix cleared for ${formatDateWithDay(
        selectedDate,
      )}.`,
    );
  }

  function saveVisits(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setReviewError("");

    if (selectedJobs.length === 0) {
      const error =
        "Select at least one scheduled customer.";
      setReviewError(error);
      showMessage(error);
      return;
    }

    const needsReplacement =
      outcome === "No Access" ||
      outcome === "Too Wet" ||
      outcome === "Customer Request";

    if (outcome !== "Completed" && selectedJobs.length > 1) {
      const error =
        "Failed or cancelled visits must be recorded one customer at a time.";
      setReviewError(error);
      showMessage(error);
      return;
    }

    if (needsReplacement && !isDateValue(replacementDate)) {
      const error =
        "Choose a valid replacement date.";
      setReviewError(error);
      showMessage(error);
      return;
    }

    if (needsReplacement && replacementDate < getTodayDateValue()) {
      const error =
        "The replacement date cannot be in the past.";
      setReviewError(error);
      showMessage(error);
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
      herbicideApplicationMethod,
      spotSprayAvailable,
    );

    const stockProblem = findStockProblem(requirements);

    if (outcome === "Completed" && stockProblem) {
      setReviewError(stockProblem);
      showMessage(stockProblem);
      return;
    }

    const alreadyRecordedJobs =
      selectedJobs.filter((job) =>
        hasTreatmentForProgrammeVisit(
          job.programme.id,
          job.visit.id,
        ),
      );

    if (alreadyRecordedJobs.length > 0) {
      const names =
        alreadyRecordedJobs
          .map(
            (job) =>
              job.customer.fullName,
          )
          .join(", ");

      const error =
        alreadyRecordedJobs.length === 1
          ? `A treatment record already exists for ${names}. No stock has been deducted. Refresh the Visit Centre before trying again.`
          : `Treatment records already exist for ${names}. No stock has been deducted. Refresh the Visit Centre before trying again.`;

      setReviewError(error);
      showMessage(error);
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

    let reservedInvoiceNumbers: string[] = [];

    if (outcome === "Completed") {
      const stockResult =
        deductChemicalStockBatch(
          requirements.map(
            (requirement) => ({
              chemicalId:
                requirement.chemical.id,
              productAmount:
                requirement.requiredAmount,
              productUnit:
                requirement.requiredUnit,
            }),
          ),
          {
            date:
              selectedDate,
            reference:
              selectedJobs.length === 1
                ? `Visit completion · ${selectedJobs[0].customer.customerNumber}`
                : `Bulk visit completion · ${selectedJobs.length} customers`,
            notes:
              selectedJobs.length === 1
                ? `${selectedJobs[0].customer.fullName} · ${selectedJobs[0].visit.treatmentName}`
                : `${selectedJobs.length} completed visits · ${totalSelectedArea.toLocaleString(
                    "en-GB",
                  )} m² combined area`,
          },
        );

      if (!stockResult.success) {
        setReviewError(
          stockResult.message,
        );
        showMessage(
          stockResult.message,
        );
        return;
      }
    }

    if (outcome === "Completed") {
      reservedInvoiceNumbers =
        reserveInvoiceNumbers(
          selectedJobs.length,
        );

      if (
        reservedInvoiceNumbers.length !==
        selectedJobs.length
      ) {
        const error =
          "GreenFlow could not reserve the required invoice numbers. The visit has not been recorded.";

        setReviewError(error);
        showMessage(error);
        return;
      }
    }

    const createdTreatments:
      TreatmentRecord[] = [];

    for (const [index, job] of selectedJobs.entries()) {
      const applications =
        outcome === "Completed"
          ? selectedProducts.map((chemical) =>
              createApplicationForCustomer(
                chemical,
                job.customer.lawnSize,
                herbicideApplicationMethod,
                spotSprayAvailable,
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
              ? reservedInvoiceNumbers[index] ?? ""
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
            createOutcomeNote(
              outcome,
              replacementDate,
            ),
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

    for (const job of selectedJobs) {
      saveProgramme({
        ...job.programme,
        visits: job.programme.visits.map((visit) => {
          if (visit.id !== job.visit.id) {
            return visit;
          }

          if (outcome === "Completed") {
            return {
              ...visit,
              status: "Completed",
              notes: appendNote(
                visit.notes,
                createOutcomeNote(
                  outcome,
                  replacementDate,
                ),
              ),
            };
          }

          if (needsReplacement) {
            return {
              ...visit,
              scheduledDate:
                replacementDate,
              status: "Scheduled",
              notes: appendNote(
                visit.notes,
                createProgrammeRescheduleNote(
                  job.visit.scheduledDate,
                  replacementDate,
                  outcome,
                ),
              ),
            };
          }

          return {
            ...visit,
            status: "Skipped",
            notes: appendNote(
              visit.notes,
              createOutcomeNote(
                outcome,
                replacementDate,
              ),
            ),
          };
        }),
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
    setReviewError("");
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
          : "Visit rescheduled successfully.",
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
    setHerbicideApplicationMethod("Full Lawn Spray");
    setVisitProductMode(
      todayMixAvailable
        ? "today"
        : "custom",
    );
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
                  <Panel title="Today’s Mix">
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-green-900">
                            Products planned for {formatDateWithDay(selectedDate)}
                          </div>

                          <p className="mt-1 text-sm leading-6 text-green-800">
                            Set this once for the working day. Selected visits use it automatically unless you choose a custom mix below.
                          </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-green-800">
                          {standardMixProducts.length} product
                          {standardMixProducts.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <Field label="Today’s fertiliser">
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

                      <Field label="Today’s herbicide">
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
                            <Field label={`Today’s additional product ${index + 1}`}>
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
                        + Add another product
                      </button>

                      <button
                        type="button"
                        onClick={saveStandardMix}
                        className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#125b2f]"
                      >
                        Save today’s mix
                      </button>

                      <button
                        type="button"
                        onClick={clearStandardMix}
                        className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        Clear today’s mix
                      </button>
                    </div>
                  </Panel>
                )}

                {outcome === "Completed" && (
                  <Panel title="Visit Products">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ProductModeOption
                        label="Use Today’s Mix"
                        detail={
                          todayMixAvailable
                            ? `${standardMixProducts.length} saved product${
                                standardMixProducts.length === 1 ? "" : "s"
                              } will be used for every selected visit.`
                            : "No mix has been saved for this working date."
                        }
                        checked={
                          visitProductMode ===
                          "today"
                        }
                        disabled={
                          !todayMixAvailable
                        }
                        onChange={() =>
                          setVisitProductMode(
                            "today",
                          )
                        }
                      />

                      <ProductModeOption
                        label="Custom Products"
                        detail="Choose different products for the currently selected visits."
                        checked={
                          visitProductMode ===
                          "custom"
                        }
                        onChange={() =>
                          setVisitProductMode(
                            "custom",
                          )
                        }
                      />
                    </div>

                    {visitProductMode === "today" &&
                      todayMixAvailable && (
                        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                          <div className="font-bold text-green-950">
                            Using Today’s Mix
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {standardMixProducts.map(
                              (chemical) => (
                                <span
                                  key={chemical.id}
                                  className="rounded-full border border-green-200 bg-white px-3 py-1.5 text-xs font-semibold text-green-800"
                                >
                                  {chemical.name}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {visitProductMode === "custom" && (
                      <>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                      </>
                    )}

                    {effectiveHerbicideId &&
                      spotSprayAvailable && (
                        <section className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                          <div className="font-bold text-green-950">
                            Herbicide application
                          </div>

                          <p className="mt-1 text-sm text-green-800">
                            This choice applies to every selected Spring, Summer or Autumn weed-and-feed visit.
                          </p>

                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <ApplicationMethodOption
                              label="Full lawn spray"
                              detail="Use the normal whole-lawn herbicide calculation."
                              checked={
                                herbicideApplicationMethod ===
                                "Full Lawn Spray"
                              }
                              onChange={() =>
                                setHerbicideApplicationMethod(
                                  "Full Lawn Spray",
                                )
                              }
                            />

                            <ApplicationMethodOption
                              label="Spot spray"
                              detail={`${SPOT_SPRAY_PERCENTAGE}% of normal herbicide usage.`}
                              checked={
                                herbicideApplicationMethod ===
                                "Spot Spray"
                              }
                              onChange={() =>
                                setHerbicideApplicationMethod(
                                  "Spot Spray",
                                )
                              }
                            />
                          </div>
                        </section>
                      )}

                    {effectiveHerbicideId &&
                      !spotSprayAvailable &&
                      selectedJobs.length > 0 && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                          Spot spray is available only when all selected visits are Spring, Summer or Autumn weed-and-feed treatments.
                        </div>
                      )}

                    {combinedPreview.length > 0 && (
                      <div className="mt-5">
                        <h3 className="font-bold">
                          Requirement for selected customers
                        </h3>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {combinedPreview.map(
                            ({
                              chemical,
                              calculation,
                              fullLawnCalculation,
                            }) => (
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

                                {isProductType(
                                  chemical.type,
                                  "herbicide",
                                ) &&
                                  herbicideApplicationMethod ===
                                    "Spot Spray" &&
                                  spotSprayAvailable && (
                                    <div className="mt-3 text-xs text-slate-500">
                                      Spot-spray quantity shown above. Full-lawn equivalent:{" "}
                                      <strong>
                                        {formatApplicationAmount(
                                          fullLawnCalculation.productRequired,
                                          fullLawnCalculation.productUnit,
                                        )}
                                      </strong>
                                    </div>
                                  )}
                              </div>
                            ),
                          )}
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
                    onClick={() => {
                      setReviewError("");
                      setReviewOpen(true);
                    }}
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
                      onClick={() => {
                        setReviewError("");
                        setReviewOpen(false);
                      }}
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

                    {reviewError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                        {reviewError}
                      </div>
                    )}

                    {!reviewError &&
                      reviewReorderWarnings.length >
                        0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          <div className="font-bold">
                            Reorder warning
                          </div>

                          <div className="mt-1 space-y-1">
                            {reviewReorderWarnings.map(
                              (warning) => (
                                <div key={warning}>
                                  {warning}
                                </div>
                              ),
                            )}
                          </div>

                          <div className="mt-2 font-semibold">
                            These visits can still be completed.
                          </div>
                        </div>
                      )}

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
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="font-bold">Products to record</h3>

                          {herbicideId && spotSprayAvailable && (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                              Herbicide: {herbicideApplicationMethod}
                            </span>
                          )}
                        </div>

                        {selectedProducts.length === 0 ? (
                          <p className="mt-3 text-sm text-amber-700">
                            No products are selected. You will be asked to confirm this when completing.
                          </p>
                        ) : (
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {combinedPreview.map(
                              ({
                                chemical,
                                calculation,
                                fullLawnCalculation,
                              }) => (
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

                                {isProductType(
                                  chemical.type,
                                  "herbicide",
                                ) &&
                                  herbicideApplicationMethod ===
                                    "Spot Spray" &&
                                  spotSprayAvailable && (
                                    <div className="mt-2 text-xs text-slate-500">
                                      Full-lawn equivalent:{" "}
                                      <strong>
                                        {formatApplicationAmount(
                                          fullLawnCalculation.productRequired,
                                          fullLawnCalculation.productUnit,
                                        )}
                                      </strong>
                                    </div>
                                  )}
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
                        onClick={() => {
                        setReviewError("");
                        setReviewOpen(false);
                      }}
                        className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50"
                      >
                        Go back
                      </button>

                      <button
                        type="button"
                        onClick={() => saveVisits()}
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
  herbicideApplicationMethod:
    HerbicideApplicationMethod,
  spotSprayAvailable: boolean,
): ProductRequirement[] {
  return products.map((chemical) => {
    const calculations = jobs.map((job) => {
      const fullLawnCalculation =
        calculateApplication(
          chemical,
          job.customer.lawnSize,
        );

      return applyHerbicideApplicationMethod(
        chemical,
        fullLawnCalculation,
        herbicideApplicationMethod,
        spotSprayAvailable,
      );
    });

    return {
      chemical,
      requiredAmount: roundToThreeDecimals(
        calculations.reduce(
          (total, calculation) =>
            total +
            calculation.productRequired,
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
  if (chemical.packSize <= 0) {
    return null;
  }

  const availableInPackUnit =
    chemical.currentStock *
    chemical.packSize;

  return convertAmount(
    availableInPackUnit,
    chemical.packUnit,
    requiredUnit,
  );
}

function getReorderWarnings(
  requirements: ProductRequirement[],
) {
  return requirements
    .map((requirement) => {
      const requiredInPackUnit =
        convertAmount(
          requirement.requiredAmount,
          requirement.requiredUnit,
          requirement.chemical.packUnit,
        );

      if (
        requiredInPackUnit === null ||
        requirement.chemical.packSize <= 0
      ) {
        return "";
      }

      const packsRequired =
        requiredInPackUnit /
        requirement.chemical.packSize;

      const remainingPacks =
        requirement.chemical.currentStock -
        packsRequired;

      if (
        remainingPacks >= 0 &&
        remainingPacks <
          requirement.chemical.reorderLevel
      ) {
        const remainingPhysicalAmount =
          remainingPacks *
          requirement.chemical.packSize;

        return `${requirement.chemical.name} will fall below its reorder level after these visits. Remaining: ${remainingPacks.toFixed(
          3,
        )} pack equivalents (${formatApplicationAmount(
          remainingPhysicalAmount,
          requirement.chemical.packUnit,
        )}). Reorder level: ${requirement.chemical.reorderLevel.toFixed(
          3,
        )} pack equivalents.`;
      }

      return "";
    })
    .filter(Boolean);
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
  herbicideApplicationMethod:
    HerbicideApplicationMethod,
  spotSprayAvailable: boolean,
): TreatmentApplication {
  const fullLawnCalculation =
    calculateApplication(
      chemical,
      areaSquareMetres,
    );

  const calculation =
    applyHerbicideApplicationMethod(
      chemical,
      fullLawnCalculation,
      herbicideApplicationMethod,
      spotSprayAvailable,
    );

  const herbicide =
    isProductType(
      chemical.type,
      "herbicide",
    );

  const applicationMethod =
    herbicide
      ? herbicideApplicationMethod
      : "";

  return createTreatmentApplication({
    productId: chemical.id,
    productName: chemical.name,
    productType: chemical.type,
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

    applicationMethod,
    fullLawnProductRequired:
      fullLawnCalculation.productRequired,
    actualProductRequired:
      calculation.productRequired,
    spotSprayPercentage:
      herbicide &&
      applicationMethod ===
        "Spot Spray"
        ? SPOT_SPRAY_PERCENTAGE
        : 100,

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

function createProgrammeRescheduleNote(
  originalDate: string,
  replacementDate: string,
  outcome: VisitOutcome,
) {
  const reason =
    outcome === "No Access"
      ? "No access"
      : outcome === "Too Wet"
        ? "Too wet"
        : "Customer request";

  return `Rescheduled from ${formatDate(
    originalDate,
  )} to ${formatDate(
    replacementDate,
  )}. Reason: ${reason}.`;
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

function applyHerbicideApplicationMethod(
  chemical: ChemicalRecord,
  fullLawnCalculation:
    ApplicationCalculation,
  herbicideApplicationMethod:
    HerbicideApplicationMethod,
  spotSprayAvailable: boolean,
): ApplicationCalculation {
  const spotSpray =
    spotSprayAvailable &&
    herbicideApplicationMethod ===
      "Spot Spray" &&
    isProductType(
      chemical.type,
      "herbicide",
    );

  if (!spotSpray) {
    return fullLawnCalculation;
  }

  const factor =
    SPOT_SPRAY_PERCENTAGE /
    100;

  return {
    ...fullLawnCalculation,
    productRequired:
      roundToThreeDecimals(
        fullLawnCalculation.productRequired *
          factor,
      ),
    waterRequiredLitres:
      roundToThreeDecimals(
        fullLawnCalculation.waterRequiredLitres *
          factor,
      ),
    tankFills:
      roundToThreeDecimals(
        fullLawnCalculation.tankFills *
          factor,
      ),
    estimatedProductCost:
      roundToTwoDecimals(
        fullLawnCalculation.estimatedProductCost *
          factor,
      ),
  };
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

function ProductModeOption({
  label,
  detail,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`rounded-xl border p-4 text-left transition ${
        checked
          ? "border-[#176b37] bg-green-50"
          : "border-slate-200 bg-white hover:bg-slate-50"
      } disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            checked
              ? "border-[#176b37]"
              : "border-slate-300"
          }`}
        >
          {checked && (
            <span className="h-2.5 w-2.5 rounded-full bg-[#176b37]" />
          )}
        </span>

        <span>
          <span className="block font-bold">
            {label}
          </span>

          <span className="mt-1 block text-sm text-slate-500">
            {detail}
          </span>
        </span>
      </div>
    </button>
  );
}

function ApplicationMethodOption({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`cursor-pointer rounded-xl border bg-white p-4 transition ${
        checked
          ? "border-[#338b45] ring-2 ring-green-100"
          : "border-slate-200 hover:border-green-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="radio"
          name="herbicide-application-method"
          checked={checked}
          onChange={onChange}
          className="mt-1 h-4 w-4"
        />

        <div>
          <div className="font-bold text-slate-900">
            {label}
          </div>

          <div className="mt-1 text-xs leading-5 text-slate-500">
            {detail}
          </div>
        </div>
      </div>
    </label>
  );
}

function isSeasonalWeedAndFeed(treatmentName: string) {
  const normalised = treatmentName
    .trim()
    .toLowerCase();

  const seasonal =
    normalised.includes("spring") ||
    normalised.includes("summer") ||
    normalised.includes("autumn");

  const weedAndFeed =
    normalised.includes("weed") &&
    normalised.includes("feed");

  return seasonal && weedAndFeed;
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