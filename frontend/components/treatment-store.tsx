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
  | "Cancelled";

export type TreatmentRecord = {
  id: string;

  invoiceNumber: string;

  customerNumber: string;

  scheduledDate: string;
  recordedDate: string;
  completedDate: string;

  status: TreatmentStatus;
  treatmentName: string;

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

  treatmentAreaSquareMetres: number;

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

  notes: string;
  nextVisitDate: string;
};

type TreatmentStoreValue = {
  treatments: TreatmentRecord[];
  ready: boolean;

  addTreatment: (
    treatment: TreatmentRecord,
  ) => void;

  updateTreatment: (
    treatment: TreatmentRecord,
  ) => void;

  deleteTreatment: (
    treatmentId: string,
  ) => void;

  getTreatmentById: (
    treatmentId: string,
  ) => TreatmentRecord | undefined;

  getTreatmentsForCustomer: (
    customerNumber: string,
  ) => TreatmentRecord[];

  restoreDemoTreatments: () => void;
};

const STORAGE_KEY =
  "greenflow-treatments-v2";

const demoTreatments: TreatmentRecord[] = [
  {
    id: "treatment-demo-1",

    invoiceNumber:
      "INV-2026-0001",

    customerNumber: "1001",

    scheduledDate: "2026-07-10",
    recordedDate:
      "2026-07-10T15:30:00.000Z",
    completedDate: "2026-07-10",

    status: "Completed",
    treatmentName:
      "Summer weed and feed",

    fertiliser:
      "ProTurf Spring 21-5-6",
    herbicide: "Pastor Pro",
    otherMaterials: "",

    chemicalId:
      "chemical-demo-2",
    chemicalName: "Pastor Pro",
    chemicalType: "Herbicide",

    activeIngredients:
      "Fluroxypyr, clopyralid and triclopyr",

    registrationNumber:
      "MAPP 18092",

    applicationRate: 2,
    applicationRateUnit: "L/ha",

    treatmentAreaSquareMetres: 250,

    productRequired: 0.05,
    productUnit: "L",

    calibratedWaterVolumePerHectare:
      215.385,

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

    notes:
      "Treatment completed successfully. Lawn condition satisfactory.",

    nextVisitDate: "2026-09-18",
  },

  {
    id: "treatment-demo-2",

    invoiceNumber: "",

    customerNumber: "1002",

    scheduledDate: "2026-07-11",
    recordedDate:
      "2026-07-11T09:15:00.000Z",
    completedDate: "",

    status: "Needs Rescheduling",
    treatmentName:
      "Summer weed and feed",

    fertiliser: "",
    herbicide: "",
    otherMaterials: "",

    chemicalId: "",
    chemicalName: "",
    chemicalType: "",

    activeIngredients: "",
    registrationNumber: "",

    applicationRate: 0,
    applicationRateUnit: "",

    treatmentAreaSquareMetres: 0,

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

    notes:
      "Unable to gain access through the locked gate.",

    nextVisitDate: "2026-07-15",
  },
];

const TreatmentStoreContext =
  createContext<TreatmentStoreValue | null>(
    null,
  );

export function TreatmentStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [treatments, setTreatments] =
    useState<TreatmentRecord[]>([]);

  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    const saved =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (saved) {
      try {
        const parsed = JSON.parse(
          saved,
        ) as Array<
          Partial<TreatmentRecord>
        >;

        if (Array.isArray(parsed)) {
          setTreatments(
            parsed.map(
              normaliseTreatmentRecord,
            ),
          );
        } else {
          setTreatments(
            cloneDemoTreatments(),
          );
        }
      } catch {
        window.localStorage.removeItem(
          STORAGE_KEY,
        );

        setTreatments(
          cloneDemoTreatments(),
        );
      }
    } else {
      setTreatments(
        cloneDemoTreatments(),
      );
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(treatments),
    );
  }, [treatments, ready]);

  function addTreatment(
    treatment: TreatmentRecord,
  ) {
    const normalised =
      normaliseTreatmentRecord(
        treatment,
      );

    setTreatments((current) => [
      normalised,
      ...current,
    ]);
  }

  function updateTreatment(
    treatment: TreatmentRecord,
  ) {
    const normalised =
      normaliseTreatmentRecord(
        treatment,
      );

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
        (treatment) =>
          treatment.id !==
          treatmentId,
      ),
    );
  }

  function getTreatmentById(
    treatmentId: string,
  ) {
    return treatments.find(
      (treatment) =>
        treatment.id ===
        treatmentId,
    );
  }

  function getTreatmentsForCustomer(
    customerNumber: string,
  ) {
    return treatments
      .filter(
        (treatment) =>
          treatment.customerNumber ===
          customerNumber,
      )
      .sort((first, second) => {
        const firstDate =
          first.completedDate ||
          first.scheduledDate;

        const secondDate =
          second.completedDate ||
          second.scheduledDate;

        return secondDate.localeCompare(
          firstDate,
        );
      });
  }

  function restoreDemoTreatments() {
    setTreatments(
      cloneDemoTreatments(),
    );
  }

  const value =
    useMemo<TreatmentStoreValue>(
      () => ({
        treatments,
        ready,

        addTreatment,
        updateTreatment,
        deleteTreatment,

        getTreatmentById,
        getTreatmentsForCustomer,

        restoreDemoTreatments,
      }),
      [treatments, ready],
    );

  return (
    <TreatmentStoreContext.Provider
      value={value}
    >
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

function normaliseTreatmentRecord(
  treatment: Partial<TreatmentRecord>,
): TreatmentRecord {
  return {
    id:
      treatment.id ??
      createTreatmentId(),

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

    status:
      treatment.status ??
      "Completed",

    treatmentName:
      treatment.treatmentName ?? "",

    fertiliser:
      treatment.fertiliser ?? "",

    herbicide:
      treatment.herbicide ?? "",

    otherMaterials:
      treatment.otherMaterials ?? "",

    chemicalId:
      treatment.chemicalId ?? "",

    chemicalName:
      treatment.chemicalName ?? "",

    chemicalType:
      treatment.chemicalType ?? "",

    activeIngredients:
      treatment.activeIngredients ?? "",

    registrationNumber:
      treatment.registrationNumber ?? "",

    applicationRate:
      safeNumber(
        treatment.applicationRate,
      ),

    applicationRateUnit:
      treatment.applicationRateUnit ?? "",

    treatmentAreaSquareMetres:
      safeNumber(
        treatment.treatmentAreaSquareMetres,
      ),

    productRequired:
      safeNumber(
        treatment.productRequired,
      ),

    productUnit:
      treatment.productUnit ?? "",

    calibratedWaterVolumePerHectare:
      safeNumber(
        treatment.calibratedWaterVolumePerHectare,
      ),

    waterRequiredLitres:
      safeNumber(
        treatment.waterRequiredLitres,
      ),

    tankCapacityLitres:
      safeNumber(
        treatment.tankCapacityLitres,
      ),

    tankFills:
      safeNumber(
        treatment.tankFills,
      ),

    productPerTank:
      safeNumber(
        treatment.productPerTank,
      ),

    estimatedProductCost:
      safeNumber(
        treatment.estimatedProductCost,
      ),

    nozzleColour:
      treatment.nozzleColour ?? "",

    nozzleType:
      treatment.nozzleType ?? "",

    knapsackMake:
      treatment.knapsackMake ?? "",

    knapsackModel:
      treatment.knapsackModel ?? "",

    walkingSpeedKph:
      safeNumber(
        treatment.walkingSpeedKph,
      ),

    flowRateLitresPerMinute:
      safeNumber(
        treatment.flowRateLitresPerMinute,
      ),

    sprayWidthMetres:
      safeNumber(
        treatment.sprayWidthMetres,
      ),

    pressureBar:
      safeNumber(
        treatment.pressureBar,
      ),

    notes:
      treatment.notes ?? "",

    nextVisitDate:
      treatment.nextVisitDate ?? "",
  };
}

function cloneDemoTreatments() {
  return demoTreatments.map(
    (treatment) => ({
      ...treatment,
    }),
  );
}

function createTreatmentId() {
  return `treatment-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function safeNumber(
  value: number | undefined,
) {
  if (
    typeof value !== "number" ||
    Number.isNaN(value)
  ) {
    return 0;
  }

  return Math.max(0, value);
}