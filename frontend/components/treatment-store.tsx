"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type TreatmentStatus =
  | "Completed"
  | "Needs Rescheduling"
  | "Rescheduled"
  | "Cancelled";

export type TreatmentApplication = {
  id: string;
  productId: string;
  productName: string;
  productType: string;
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

type TreatmentStoreValue = {
  treatments: TreatmentRecord[];
  ready: boolean;
  addTreatment: (treatment: TreatmentRecord) => void;
  addTreatments: (treatments: TreatmentRecord[]) => {
    added: number;
    skipped: number;
  };
  updateTreatment: (treatment: TreatmentRecord) => void;
  deleteTreatment: (treatmentId: string) => void;
  getTreatmentById: (
    treatmentId: string,
  ) => TreatmentRecord | undefined;
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = getSavedData();

    if (!saved) {
      setTreatments(cloneDemoTreatments());
      setReady(true);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Array<
        Partial<TreatmentRecord>
      >;

      setTreatments(
        Array.isArray(parsed)
          ? parsed.map(normaliseTreatmentRecord)
          : cloneDemoTreatments(),
      );
    } catch {
      clearStoredData();
      setTreatments(cloneDemoTreatments());
    }

    setReady(true);
  }, []);

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
  ) {
    const normalised =
      normaliseTreatmentRecord(treatment);

    setTreatments((current) =>
      current.some(
        (item) => item.id === normalised.id,
      )
        ? current
        : [normalised, ...current],
    );
  }

  function addTreatments(
    incoming: TreatmentRecord[],
  ) {
    const normalised = incoming.map(
      normaliseTreatmentRecord,
    );
    const existingIds = new Set(
      treatments.map((item) => item.id),
    );
    const unique = normalised.filter(
      (item) => !existingIds.has(item.id),
    );

    setTreatments((current) => [
      ...unique,
      ...current,
    ]);

    return {
      added: unique.length,
      skipped:
        normalised.length - unique.length,
    };
  }

  function updateTreatment(
    treatment: TreatmentRecord,
  ) {
    const normalised =
      normaliseTreatmentRecord(treatment);

    setTreatments((current) =>
      current.map((item) =>
        item.id === normalised.id
          ? normalised
          : item,
      ),
    );
  }

  function deleteTreatment(
    treatmentId: string,
  ) {
    setTreatments((current) =>
      current.filter(
        (item) => item.id !== treatmentId,
      ),
    );
  }

  function getTreatmentById(
    treatmentId: string,
  ) {
    return treatments.find(
      (item) => item.id === treatmentId,
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
    setTreatments(cloneDemoTreatments());
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
      treatment.invoiceNumber ?? "",
    customerNumber:
      treatment.customerNumber ?? "",
    scheduledDate:
      treatment.scheduledDate ?? "",
    recordedDate:
      treatment.recordedDate ??
      new Date().toISOString(),
    completedDate:
      treatment.completedDate ?? "",
    status: normaliseStatus(treatment.status),
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
  return {
    id:
      application.id ?? createApplicationId(),
    productId: application.productId ?? "",
    productName:
      application.productName ?? "",
    productType:
      application.productType ?? "",
    activeIngredients:
      application.activeIngredients ?? "",
    registrationNumber:
      application.registrationNumber ?? "",
    applicationRate: safeNumber(
      application.applicationRate,
    ),
    applicationRateUnit:
      application.applicationRateUnit ?? "",
    productRequired: safeNumber(
      application.productRequired,
    ),
    productUnit:
      application.productUnit ?? "",
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

  return "Completed";
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