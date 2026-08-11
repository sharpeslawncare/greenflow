"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type TreatmentStatus =
  | "Completed"
  | "Needs Rescheduling"
  | "Rescheduled"
  | "Cancelled";

export type HerbicideApplicationMethod =
  | "Full Lawn Spray"
  | "Spot Spray"
  | "";

export type TreatmentApplication = {
  id: string;
  productId: string;
  productName: string;
  productType: string;
  activeIngredients: string;
  registrationNumber: string;
  applicationRate: number;
  applicationRateUnit: string;

  /*
   * `productRequired` remains the quantity GreenFlow
   * records as actually used, preserving compatibility
   * with Chemical Usage, stock and documents.
   */
  productRequired: number;
  productUnit: string;

  /*
   * Herbicide application audit fields.
   *
   * For a full lawn spray:
   * - fullLawnProductRequired and actualProductRequired
   *   will normally be the same.
   * - spotSprayPercentage will normally be 100.
   *
   * For a spot spray:
   * - fullLawnProductRequired stores the normal blanket
   *   calculation.
   * - actualProductRequired stores the reduced quantity.
   * - productRequired will also store the actual quantity.
   */
  applicationMethod: HerbicideApplicationMethod;
  fullLawnProductRequired: number;
  actualProductRequired: number;
  spotSprayPercentage: number;
  calibratedWaterVolumePerHectare: number;
  waterRequiredLitres: number;
  tankCapacityLitres: number;
  tankFills: number;
  productPerTank: number;
  estimatedProductCost: number;
  nozzleColour: string;
  nozzleType: string;
  knapsackMake: string;
  knapsackModel: string;
  walkingSpeedKph: number;
  flowRateLitresPerMinute: number;
  sprayWidthMetres: number;
  pressureBar: number;
};

export type TreatmentRecord = {
  id: string;
  programmeId: string;
  programmeVisitId: string;
  invoiceNumber: string;
  customerNumber: string;
  scheduledDate: string;
  recordedDate: string;
  completedDate: string;
  status: TreatmentStatus;
  treatmentName: string;
  treatmentAreaSquareMetres: number;
  applications: TreatmentApplication[];
  notes: string;
  nextVisitDate: string;

  /*
   * Temporary compatibility fields.
   * Existing pages can continue to compile while
   * they are migrated to `applications`.
   */
  fertiliser: string;
  herbicide: string;
  otherMaterials: string;
  chemicalId: string;
  chemicalName: string;
  chemicalType: string;
  activeIngredients: string;
  registrationNumber: string;
  applicationRate: number;
  applicationRateUnit: string;
  productRequired: number;
  productUnit: string;
  calibratedWaterVolumePerHectare: number;
  waterRequiredLitres: number;
  tankCapacityLitres: number;
  tankFills: number;
  productPerTank: number;
  estimatedProductCost: number;
  nozzleColour: string;
  nozzleType: string;
  knapsackMake: string;
  knapsackModel: string;
  walkingSpeedKph: number;
  flowRateLitresPerMinute: number;
  sprayWidthMetres: number;
  pressureBar: number;
};


export type TreatmentSaveResult = {
  success: boolean;
  reason:
    | "saved"
    | "duplicate-treatment"
    | "duplicate-invoice"
    | "missing-invoice"
    | "not-found";
  message: string;
};

type TreatmentStoreValue = {
  treatments: TreatmentRecord[];
  ready: boolean;
  addTreatment: (
    treatment: TreatmentRecord,
  ) => TreatmentSaveResult;
  addTreatments: (treatments: TreatmentRecord[]) => {
    added: number;
    skipped: number;
  };
  updateTreatment: (
    treatment: TreatmentRecord,
  ) => TreatmentSaveResult;
  deleteTreatment: (treatmentId: string) => void;
  getTreatmentById: (
    treatmentId: string,
  ) => TreatmentRecord | undefined;
  hasTreatmentForProgrammeVisit: (
    programmeId: string,
    programmeVisitId: string,
  ) => boolean;
  hasFinalOutcomeForProgrammeVisit: (
    programmeId: string,
    programmeVisitId: string,
  ) => boolean;
  getTreatmentsForCustomer: (
    customerNumber: string,
  ) => TreatmentRecord[];
  restoreDemoTreatments: () => void;
};

const STORAGE_KEY = "greenflow-treatments-v3";
const LEGACY_STORAGE_KEYS = [
  "greenflow-treatments-v2",
  "greenflow-treatments-v1",
];

const TreatmentStoreContext =
  createContext<TreatmentStoreValue | null>(null);

const demoTreatments: TreatmentRecord[] = [
  createTreatmentRecord({
    id: "treatment-demo-1",
    programmeId: "",
    programmeVisitId: "",
    invoiceNumber: "INV-2026-0001",
    customerNumber: "1001",
    scheduledDate: "2026-07-10",
    recordedDate: "2026-07-10T15:30:00.000Z",
    completedDate: "2026-07-10",
    status: "Completed",
    treatmentName: "Summer weed and feed",
    treatmentAreaSquareMetres: 250,
    applications: [
      createTreatmentApplication({
        id: "application-demo-fertiliser",
        productId: "chemical-demo-1",
        productName: "ProTurf Spring 21-5-6",
        productType: "Fertiliser",
        applicationRate: 35,
        applicationRateUnit: "g/m²",
        productRequired: 8750,
        productUnit: "g",
        estimatedProductCost: 8.75,
      }),
      createTreatmentApplication({
        id: "application-demo-herbicide",
        productId: "chemical-demo-2",
        productName: "Pastor Pro",
        productType: "Herbicide",
        activeIngredients:
          "Fluroxypyr, clopyralid and triclopyr",
        registrationNumber: "MAPP 18092",
        applicationRate: 2,
        applicationRateUnit: "L/ha",
        productRequired: 0.05,
        productUnit: "L",
        applicationMethod:
          "Full Lawn Spray",
        fullLawnProductRequired:
          0.05,
        actualProductRequired:
          0.05,
        spotSprayPercentage:
          100,
        calibratedWaterVolumePerHectare: 215.385,
        waterRequiredLitres: 5.385,
        tankCapacityLitres: 16,
        tankFills: 0.337,
        productPerTank: 0.148,
        estimatedProductCost: 3.2,
        nozzleColour: "Grey",
        nozzleType: "Deflector Tip",
        knapsackMake: "Berthoud",
        knapsackModel: "Vermorel 2000",
        walkingSpeedKph: 3,
        flowRateLitresPerMinute: 1.4,
        sprayWidthMetres: 1.3,
        pressureBar: 1,
      }),
    ],
    notes:
      "Treatment completed successfully. Lawn condition satisfactory.",
    nextVisitDate: "2026-09-18",
  }),
  createTreatmentRecord({
    id: "treatment-demo-2",
    programmeId: "",
    programmeVisitId: "",
    invoiceNumber: "",
    customerNumber: "1002",
    scheduledDate: "2026-07-11",
    recordedDate: "2026-07-11T09:15:00.000Z",
    completedDate: "",
    status: "Needs Rescheduling",
    treatmentName: "Summer weed and feed",
    treatmentAreaSquareMetres: 0,
    applications: [],
    notes:
      "Unable to gain access through the locked gate.",
    nextVisitDate: "2026-07-15",
  }),
];

export function TreatmentStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [treatments, setTreatments] =
    useState<TreatmentRecord[]>([]);
  const treatmentsRef =
    useRef<TreatmentRecord[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = getSavedData();

    if (!saved) {
      const demo =
        cloneDemoTreatments();

      treatmentsRef.current =
        demo;
      setTreatments(demo);
      setReady(true);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Array<
        Partial<TreatmentRecord>
      >;

      const loadedTreatments =
        Array.isArray(parsed)
          ? parsed.map(
              normaliseTreatmentRecord,
            )
          : cloneDemoTreatments();

      treatmentsRef.current =
        loadedTreatments;
      setTreatments(
        loadedTreatments,
      );
    } catch {
      clearStoredData();

      const demo =
        cloneDemoTreatments();

      treatmentsRef.current =
        demo;
      setTreatments(demo);
    }

    setReady(true);
  }, []);

  useEffect(() => {
    treatmentsRef.current =
      treatments;
  }, [treatments]);

  useEffect(() => {
    if (!ready) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(treatments),
    );

    LEGACY_STORAGE_KEYS.forEach((key) =>
      window.localStorage.removeItem(key),
    );
  }, [treatments, ready]);

  function addTreatment(
    treatment: TreatmentRecord,
  ): TreatmentSaveResult {
    const normalised =
      normaliseTreatmentRecord(treatment);

    if (
      normalised.status ===
        "Completed" &&
      !normalised.invoiceNumber
    ) {
      return {
        success: false,
        reason: "missing-invoice",
        message:
          "A completed treatment must have a reserved invoice number before it can be saved.",
      };
    }

    const current =
      treatmentsRef.current;

    const duplicateIdentity =
      current.some((item) =>
        isSameTreatmentIdentity(
          item,
          normalised,
        ),
      );

    if (duplicateIdentity) {
      return {
        success: false,
        reason: "duplicate-treatment",
        message:
          "A treatment record already exists for this programme visit.",
      };
    }

    const duplicateInvoice =
      current.some((item) =>
        hasSameInvoiceNumber(
          item,
          normalised,
        ),
      );

    if (duplicateInvoice) {
      return {
        success: false,
        reason: "duplicate-invoice",
        message:
          `Invoice number ${normalised.invoiceNumber} is already attached to another treatment record.`,
      };
    }

    const next = [
      normalised,
      ...current,
    ];

    treatmentsRef.current =
      next;
    setTreatments(next);

    return {
      success: true,
      reason: "saved",
      message:
        "Treatment record saved.",
    };
  }

  function addTreatments(
    incoming: TreatmentRecord[],
  ) {
    const normalised =
      incoming.map(
        normaliseTreatmentRecord,
      );

    const current =
      treatmentsRef.current;

    const unique:
      TreatmentRecord[] = [];

    for (
      const candidate of normalised
    ) {
      if (
        candidate.status ===
          "Completed" &&
        !candidate.invoiceNumber
      ) {
        continue;
      }

      const duplicateIdentity =
        current.some((item) =>
          isSameTreatmentIdentity(
            item,
            candidate,
          ),
        ) ||
        unique.some((item) =>
          isSameTreatmentIdentity(
            item,
            candidate,
          ),
        );

      const duplicateInvoice =
        current.some((item) =>
          hasSameInvoiceNumber(
            item,
            candidate,
          ),
        ) ||
        unique.some((item) =>
          hasSameInvoiceNumber(
            item,
            candidate,
          ),
        );

      if (
        !duplicateIdentity &&
        !duplicateInvoice
      ) {
        unique.push(candidate);
      }
    }

    if (unique.length > 0) {
      const next = [
        ...unique,
        ...current,
      ];

      treatmentsRef.current =
        next;
      setTreatments(next);
    }

    return {
      added: unique.length,
      skipped:
        normalised.length -
        unique.length,
    };
  }

  function updateTreatment(
    treatment: TreatmentRecord,
  ): TreatmentSaveResult {
    const normalised =
      normaliseTreatmentRecord(treatment);

    const current =
      treatmentsRef.current;

    const existing =
      current.find(
        (item) =>
          item.id === normalised.id,
      );

    if (!existing) {
      return {
        success: false,
        reason: "not-found",
        message:
          "The treatment record could not be found, so no changes were saved.",
      };
    }

    if (
      normalised.status ===
        "Completed" &&
      !normalised.invoiceNumber
    ) {
      return {
        success: false,
        reason: "missing-invoice",
        message:
          "A completed treatment must have a reserved invoice number before it can be saved.",
      };
    }

    const identityCollision =
      current.some(
        (item) =>
          item.id !==
            normalised.id &&
          isSameTreatmentIdentity(
            item,
            normalised,
          ),
      );

    if (identityCollision) {
      return {
        success: false,
        reason: "duplicate-treatment",
        message:
          "Another treatment record already exists for this programme visit.",
      };
    }

    const invoiceCollision =
      current.some(
        (item) =>
          item.id !==
            normalised.id &&
          hasSameInvoiceNumber(
            item,
            normalised,
          ),
      );

    if (invoiceCollision) {
      return {
        success: false,
        reason: "duplicate-invoice",
        message:
          `Invoice number ${normalised.invoiceNumber} is already attached to another treatment record.`,
      };
    }

    const next =
      current.map(
        (item) =>
          item.id ===
          normalised.id
            ? normalised
            : item,
      );

    treatmentsRef.current =
      next;
    setTreatments(next);

    return {
      success: true,
      reason: "saved",
      message:
        "Treatment record updated.",
    };
  }

  function deleteTreatment(
    treatmentId: string,
  ) {
    const next =
      treatmentsRef.current.filter(
        (item) =>
          item.id !== treatmentId,
      );

    treatmentsRef.current =
      next;
    setTreatments(next);
  }

  function getTreatmentById(
    treatmentId: string,
  ) {
    return treatments.find(
      (item) => item.id === treatmentId,
    );
  }

  function hasTreatmentForProgrammeVisit(
    programmeId: string,
    programmeVisitId: string,
  ) {
    if (
      !programmeId ||
      !programmeVisitId
    ) {
      return false;
    }

    return treatments.some(
      (item) =>
        item.programmeId === programmeId &&
        item.programmeVisitId ===
          programmeVisitId,
    );
  }

  function hasFinalOutcomeForProgrammeVisit(
    programmeId: string,
    programmeVisitId: string,
  ) {
    if (
      !programmeId ||
      !programmeVisitId
    ) {
      return false;
    }

    return treatments.some(
      (item) =>
        item.programmeId === programmeId &&
        item.programmeVisitId ===
          programmeVisitId &&
        isFinalTreatmentStatus(
          item.status,
        ),
    );
  }

  function getTreatmentsForCustomer(
    customerNumber: string,
  ) {
    return treatments
      .filter(
        (item) =>
          item.customerNumber === customerNumber,
      )
      .sort((first, second) =>
        getRecordDate(second).localeCompare(
          getRecordDate(first),
        ),
      );
  }

  function restoreDemoTreatments() {
    const demo =
      cloneDemoTreatments();

    treatmentsRef.current =
      demo;
    setTreatments(demo);
  }

  const value = useMemo<TreatmentStoreValue>(
    () => ({
      treatments,
      ready,
      addTreatment,
      addTreatments,
      updateTreatment,
      deleteTreatment,
      getTreatmentById,
      hasTreatmentForProgrammeVisit,
      hasFinalOutcomeForProgrammeVisit,
      getTreatmentsForCustomer,
      restoreDemoTreatments,
    }),
    [treatments, ready],
  );

  return (
    <TreatmentStoreContext.Provider value={value}>
      {children}
    </TreatmentStoreContext.Provider>
  );
}

export function useTreatmentStore() {
  const context = useContext(
    TreatmentStoreContext,
  );

  if (!context) {
    throw new Error(
      "useTreatmentStore must be used inside TreatmentStoreProvider.",
    );
  }

  return context;
}

export function createTreatmentRecord(
  treatment: Partial<TreatmentRecord>,
): TreatmentRecord {
  return normaliseTreatmentRecord(treatment);
}

export function createTreatmentApplication(
  application: Partial<TreatmentApplication>,
): TreatmentApplication {
  return normaliseApplication(application);
}

export function getTreatmentApplications(
  treatment: TreatmentRecord,
) {
  return treatment.applications;
}

export function getTreatmentProductNames(
  treatment: TreatmentRecord,
) {
  return treatment.applications
    .map((item) => item.productName)
    .filter(Boolean);
}

export function getTreatmentTotalProductCost(
  treatment: TreatmentRecord,
) {
  return roundMoney(
    treatment.applications.reduce(
      (total, item) =>
        total + item.estimatedProductCost,
      0,
    ),
  );
}

function normaliseTreatmentRecord(
  treatment: Partial<TreatmentRecord>,
): TreatmentRecord {
  const applications =
    normaliseApplications(treatment);
  const legacy = createLegacyProjection(
    applications,
    treatment,
  );

  return {
    id: treatment.id ?? createTreatmentId(),
    programmeId: treatment.programmeId ?? "",
    programmeVisitId:
      treatment.programmeVisitId ?? "",
    invoiceNumber:
      treatment.invoiceNumber?.trim() ?? "",
    customerNumber:
      treatment.customerNumber ?? "",
    scheduledDate:
      treatment.scheduledDate ?? "",
    recordedDate:
      treatment.recordedDate ??
      new Date().toISOString(),
    completedDate:
      treatment.completedDate ?? "",
    status:
      normalisePersistedStatus(
        treatment.status,
        treatment.invoiceNumber,
      ),
    treatmentName:
      treatment.treatmentName ?? "",
    treatmentAreaSquareMetres: safeNumber(
      treatment.treatmentAreaSquareMetres,
    ),
    applications,
    notes: treatment.notes ?? "",
    nextVisitDate:
      treatment.nextVisitDate ?? "",
    ...legacy,
  };
}

function normaliseApplications(
  treatment: Partial<TreatmentRecord>,
) {
  if (Array.isArray(treatment.applications)) {
    return treatment.applications
      .map(normaliseApplication)
      .filter(
        (item) =>
          Boolean(
            item.productId ||
              item.productName,
          ),
      );
  }

  const migrated: TreatmentApplication[] = [];

  if (
    treatment.chemicalId ||
    treatment.chemicalName
  ) {
    migrated.push(
      createTreatmentApplication({
        productId: treatment.chemicalId,
        productName: treatment.chemicalName,
        productType: treatment.chemicalType,
        activeIngredients:
          treatment.activeIngredients,
        registrationNumber:
          treatment.registrationNumber,
        applicationRate:
          treatment.applicationRate,
        applicationRateUnit:
          treatment.applicationRateUnit,
        productRequired:
          treatment.productRequired,
        productUnit: treatment.productUnit,
        calibratedWaterVolumePerHectare:
          treatment.calibratedWaterVolumePerHectare,
        waterRequiredLitres:
          treatment.waterRequiredLitres,
        tankCapacityLitres:
          treatment.tankCapacityLitres,
        tankFills: treatment.tankFills,
        productPerTank:
          treatment.productPerTank,
        estimatedProductCost:
          treatment.estimatedProductCost,
        nozzleColour:
          treatment.nozzleColour,
        nozzleType: treatment.nozzleType,
        knapsackMake:
          treatment.knapsackMake,
        knapsackModel:
          treatment.knapsackModel,
        walkingSpeedKph:
          treatment.walkingSpeedKph,
        flowRateLitresPerMinute:
          treatment.flowRateLitresPerMinute,
        sprayWidthMetres:
          treatment.sprayWidthMetres,
        pressureBar: treatment.pressureBar,
      }),
    );
  }

  addLegacyNamedProduct(
    migrated,
    treatment.fertiliser,
    "Fertiliser",
  );
  addLegacyNamedProduct(
    migrated,
    treatment.herbicide,
    "Herbicide",
  );
  addLegacyNamedProduct(
    migrated,
    treatment.otherMaterials,
    "Other",
  );

  return migrated;
}

function addLegacyNamedProduct(
  applications: TreatmentApplication[],
  name: string | undefined,
  productType: string,
) {
  const trimmed = name?.trim();

  if (
    !trimmed ||
    applications.some(
      (item) =>
        item.productName === trimmed,
    )
  ) {
    return;
  }

  applications.push(
    createTreatmentApplication({
      productName: trimmed,
      productType,
    }),
  );
}

function normaliseApplication(
  application: Partial<TreatmentApplication>,
): TreatmentApplication {
  const productRequired =
    safeNumber(
      application.productRequired,
    );

  const productType =
    application.productType ?? "";

  const herbicide =
    productType
      .toLowerCase()
      .includes(
        "herbicide",
      );

  const applicationMethod =
    normaliseApplicationMethod(
      application.applicationMethod,
      herbicide,
    );

  const fullLawnProductRequired =
    typeof application.fullLawnProductRequired ===
      "number" &&
    Number.isFinite(
      application.fullLawnProductRequired,
    )
      ? Math.max(
          0,
          application.fullLawnProductRequired,
        )
      : productRequired;

  const actualProductRequired =
    typeof application.actualProductRequired ===
      "number" &&
    Number.isFinite(
      application.actualProductRequired,
    )
      ? Math.max(
          0,
          application.actualProductRequired,
        )
      : productRequired;

  const spotSprayPercentage =
    normaliseSpotSprayPercentage(
      application.spotSprayPercentage,
      applicationMethod,
    );

  return {
    id:
      application.id ?? createApplicationId(),
    productId: application.productId ?? "",
    productName:
      application.productName ?? "",
    productType,
    activeIngredients:
      application.activeIngredients ?? "",
    registrationNumber:
      application.registrationNumber ?? "",
    applicationRate: safeNumber(
      application.applicationRate,
    ),
    applicationRateUnit:
      application.applicationRateUnit ?? "",
    productRequired,
    productUnit:
      application.productUnit ?? "",
    applicationMethod,
    fullLawnProductRequired,
    actualProductRequired,
    spotSprayPercentage,
    calibratedWaterVolumePerHectare:
      safeNumber(
        application.calibratedWaterVolumePerHectare,
      ),
    waterRequiredLitres: safeNumber(
      application.waterRequiredLitres,
    ),
    tankCapacityLitres: safeNumber(
      application.tankCapacityLitres,
    ),
    tankFills: safeNumber(
      application.tankFills,
    ),
    productPerTank: safeNumber(
      application.productPerTank,
    ),
    estimatedProductCost: safeNumber(
      application.estimatedProductCost,
    ),
    nozzleColour:
      application.nozzleColour ?? "",
    nozzleType: application.nozzleType ?? "",
    knapsackMake:
      application.knapsackMake ?? "",
    knapsackModel:
      application.knapsackModel ?? "",
    walkingSpeedKph: safeNumber(
      application.walkingSpeedKph,
    ),
    flowRateLitresPerMinute:
      safeNumber(
        application.flowRateLitresPerMinute,
      ),
    sprayWidthMetres: safeNumber(
      application.sprayWidthMetres,
    ),
    pressureBar: safeNumber(
      application.pressureBar,
    ),
  };
}

function createLegacyProjection(
  applications: TreatmentApplication[],
  treatment: Partial<TreatmentRecord>,
) {
  const fertiliser = findType(
    applications,
    "fertiliser",
  );
  const herbicide = findType(
    applications,
    "herbicide",
  );
  const primary =
    applications.find(
      (item) =>
        item.productId ||
        item.productRequired > 0,
    ) ??
    applications[0];

  const otherMaterials = applications
    .filter(
      (item) =>
        item.id !== fertiliser?.id &&
        item.id !== herbicide?.id &&
        item.id !== primary?.id,
    )
    .map((item) => item.productName)
    .filter(Boolean)
    .join(", ");

  return {
    fertiliser:
      fertiliser?.productName ??
      treatment.fertiliser ??
      "",
    herbicide:
      herbicide?.productName ??
      treatment.herbicide ??
      "",
    otherMaterials:
      otherMaterials ||
      treatment.otherMaterials ||
      "",
    chemicalId:
      primary?.productId ??
      treatment.chemicalId ??
      "",
    chemicalName:
      primary?.productName ??
      treatment.chemicalName ??
      "",
    chemicalType:
      primary?.productType ??
      treatment.chemicalType ??
      "",
    activeIngredients:
      primary?.activeIngredients ??
      treatment.activeIngredients ??
      "",
    registrationNumber:
      primary?.registrationNumber ??
      treatment.registrationNumber ??
      "",
    applicationRate:
      primary?.applicationRate ??
      safeNumber(treatment.applicationRate),
    applicationRateUnit:
      primary?.applicationRateUnit ??
      treatment.applicationRateUnit ??
      "",
    productRequired:
      primary?.productRequired ??
      safeNumber(treatment.productRequired),
    productUnit:
      primary?.productUnit ??
      treatment.productUnit ??
      "",
    calibratedWaterVolumePerHectare:
      primary?.calibratedWaterVolumePerHectare ??
      safeNumber(
        treatment.calibratedWaterVolumePerHectare,
      ),
    waterRequiredLitres:
      primary?.waterRequiredLitres ??
      safeNumber(
        treatment.waterRequiredLitres,
      ),
    tankCapacityLitres:
      primary?.tankCapacityLitres ??
      safeNumber(treatment.tankCapacityLitres),
    tankFills:
      primary?.tankFills ??
      safeNumber(treatment.tankFills),
    productPerTank:
      primary?.productPerTank ??
      safeNumber(treatment.productPerTank),
    estimatedProductCost:
      applications.length > 0
        ? roundMoney(
            applications.reduce(
              (total, item) =>
                total +
                item.estimatedProductCost,
              0,
            ),
          )
        : safeNumber(
            treatment.estimatedProductCost,
          ),
    nozzleColour:
      primary?.nozzleColour ??
      treatment.nozzleColour ??
      "",
    nozzleType:
      primary?.nozzleType ??
      treatment.nozzleType ??
      "",
    knapsackMake:
      primary?.knapsackMake ??
      treatment.knapsackMake ??
      "",
    knapsackModel:
      primary?.knapsackModel ??
      treatment.knapsackModel ??
      "",
    walkingSpeedKph:
      primary?.walkingSpeedKph ??
      safeNumber(treatment.walkingSpeedKph),
    flowRateLitresPerMinute:
      primary?.flowRateLitresPerMinute ??
      safeNumber(
        treatment.flowRateLitresPerMinute,
      ),
    sprayWidthMetres:
      primary?.sprayWidthMetres ??
      safeNumber(treatment.sprayWidthMetres),
    pressureBar:
      primary?.pressureBar ??
      safeNumber(treatment.pressureBar),
  };
}

function findType(
  applications: TreatmentApplication[],
  type: string,
) {
  return applications.find((item) =>
    item.productType
      .toLowerCase()
      .includes(type),
  );
}

function normaliseApplicationMethod(
  method:
    | HerbicideApplicationMethod
    | string
    | undefined,
  herbicide: boolean,
): HerbicideApplicationMethod {
  if (
    method === "Full Lawn Spray" ||
    method === "Spot Spray"
  ) {
    return method;
  }

  return herbicide
    ? "Full Lawn Spray"
    : "";
}

function normaliseSpotSprayPercentage(
  value: number | undefined,
  method: HerbicideApplicationMethod,
) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.min(
      100,
      Math.max(
        0,
        value,
      ),
    );
  }

  return method === "Spot Spray"
    ? 20
    : 100;
}

function normalisePersistedStatus(
  status:
    | TreatmentStatus
    | string
    | undefined,
  invoiceNumber:
    | string
    | undefined,
): TreatmentStatus {
  const normalised =
    normaliseStatus(status);

  if (
    normalised === "Completed" &&
    !invoiceNumber?.trim()
  ) {
    /*
     * Legacy/corrupt records must not silently remain
     * completed without an invoice number now that
     * invoice allocation is a required completion step.
     */
    return "Needs Rescheduling";
  }

  return normalised;
}

function normaliseStatus(
  status:
    | TreatmentStatus
    | string
    | undefined,
): TreatmentStatus {
  if (
    status === "Completed" ||
    status === "Needs Rescheduling" ||
    status === "Rescheduled" ||
    status === "Cancelled"
  ) {
    return status;
  }

  /*
   * Older treatment records may pre-date explicit status
   * values. Preserve that legacy behaviour for a genuinely
   * missing status, but do not turn an unrecognised/corrupt
   * status into a completed treatment.
   */
  if (
    status === undefined ||
    status === ""
  ) {
    return "Completed";
  }

  return "Needs Rescheduling";
}

function isFinalTreatmentStatus(
  status: TreatmentStatus,
) {
  return (
    status === "Completed" ||
    status === "Cancelled"
  );
}

function getSavedData() {
  const current =
    window.localStorage.getItem(STORAGE_KEY);

  if (current) return current;

  for (const key of LEGACY_STORAGE_KEYS) {
    const legacy =
      window.localStorage.getItem(key);

    if (legacy) return legacy;
  }

  return null;
}

function clearStoredData() {
  window.localStorage.removeItem(STORAGE_KEY);
  LEGACY_STORAGE_KEYS.forEach((key) =>
    window.localStorage.removeItem(key),
  );
}

function cloneDemoTreatments() {
  return demoTreatments.map((item) =>
    createTreatmentRecord({
      ...item,
      applications: item.applications.map(
        (application) => ({
          ...application,
        }),
      ),
    }),
  );
}

function getRecordDate(
  treatment: TreatmentRecord,
) {
  return (
    treatment.completedDate ||
    treatment.scheduledDate ||
    treatment.recordedDate.slice(0, 10)
  );
}

function isSameTreatmentIdentity(
  first: TreatmentRecord,
  second: TreatmentRecord,
) {
  const firstHasProgrammeVisit =
    Boolean(
      first.programmeId &&
      first.programmeVisitId,
    );

  const secondHasProgrammeVisit =
    Boolean(
      second.programmeId &&
      second.programmeVisitId,
    );

  if (
    firstHasProgrammeVisit &&
    secondHasProgrammeVisit
  ) {
    return (
      first.programmeId ===
        second.programmeId &&
      first.programmeVisitId ===
        second.programmeVisitId
    );
  }

  return first.id === second.id;
}

function normaliseInvoiceNumber(
  value: string,
) {
  return value
    .trim()
    .toUpperCase();
}

function hasSameInvoiceNumber(
  first: TreatmentRecord,
  second: TreatmentRecord,
) {
  const firstInvoice =
    normaliseInvoiceNumber(
      first.invoiceNumber,
    );

  const secondInvoice =
    normaliseInvoiceNumber(
      second.invoiceNumber,
    );

  return (
    Boolean(firstInvoice) &&
    Boolean(secondInvoice) &&
    firstInvoice === secondInvoice
  );
}

function createTreatmentId() {
  return `treatment-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function createApplicationId() {
  return `application-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function safeNumber(
  value: number | undefined,
) {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

function roundMoney(value: number) {
  return (
    Math.round(
      (value + Number.EPSILON) * 100,
    ) / 100
  );
}