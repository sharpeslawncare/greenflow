"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ChemicalType =
  | "Fertiliser"
  | "Herbicide"
  | "Moss Control"
  | "Wetting Agent"
  | "Biostimulant"
  | "Seed"
  | "Other";

export type ChemicalUnit =
  | "kg"
  | "L"
  | "g"
  | "ml";

export type ApplicationRateUnit =
  | "kg/ha"
  | "L/ha"
  | "g/m²"
  | "ml/m²";

export type ChemicalRecord = {
  id: string;

  name: string;
  manufacturer: string;
  type: ChemicalType;

  activeIngredients: string;
  registrationNumber: string;

  packSize: number;
  packUnit: ChemicalUnit;

  costPerPack: number;

  currentStock: number;
  reorderLevel: number;

  applicationRate: number;
  applicationRateUnit: ApplicationRateUnit;

  waterVolumePerHectare: number;

  maximumAnnualApplications: number;
  maximumAnnualDose: number;

  targetUse: string;

  nozzleColour: string;
  nozzleType: string;

  knapsackMake: string;
  knapsackModel: string;
  tankCapacityLitres: number;

  walkingSpeedKph: number;
  flowRateLitresPerMinute: number;
  pressureBar: number;

  ppeRequirements: string;
  coshhNotes: string;
  environmentalWarnings: string;

  active: boolean;

  createdAt: string;
  updatedAt: string;
};

type NewChemicalInput = Partial<
  Omit<
    ChemicalRecord,
    "id" | "createdAt" | "updatedAt"
  >
>;

type ChemicalStoreValue = {
  chemicals: ChemicalRecord[];
  ready: boolean;

  addChemical: (
    input?: NewChemicalInput,
  ) => ChemicalRecord;

  updateChemical: (
    chemical: ChemicalRecord,
  ) => void;

  deleteChemical: (
    chemicalId: string,
  ) => void;

  getChemicalById: (
    chemicalId: string,
  ) => ChemicalRecord | undefined;

  calculateApplication: (
    chemicalId: string,
    areaSquareMetres: number,
  ) => {
    productRequired: number;
    productUnit: ChemicalUnit;
    waterRequiredLitres: number;
    tankFills: number;
    productPerTank: number;
    productCost: number;
  } | null;

  restoreDemoChemicals: () => void;
};

const STORAGE_KEY =
  "greenflow-chemicals-v1";

const demoChemicals: ChemicalRecord[] = [
  {
    id: "chemical-demo-1",

    name: "ProTurf Spring 21-5-6",
    manufacturer: "ICL",
    type: "Fertiliser",

    activeIngredients:
      "Nitrogen 21%, Phosphate 5%, Potassium 6%",
    registrationNumber: "",

    packSize: 25,
    packUnit: "kg",

    costPerPack: 42,

    currentStock: 10,
    reorderLevel: 3,

    applicationRate: 250,
    applicationRateUnit: "kg/ha",

    waterVolumePerHectare: 0,

    maximumAnnualApplications: 3,
    maximumAnnualDose: 750,

    targetUse:
      "Seasonal lawn feeding and colour improvement.",

    nozzleColour: "",
    nozzleType: "",

    knapsackMake: "",
    knapsackModel: "",
    tankCapacityLitres: 0,

    walkingSpeedKph: 0,
    flowRateLitresPerMinute: 0,
    pressureBar: 0,

    ppeRequirements:
      "Gloves and suitable work clothing.",
    coshhNotes:
      "Avoid creating dust. Wash hands after handling.",
    environmentalWarnings:
      "Keep away from drains and watercourses.",

    active: true,

    createdAt:
      "2026-08-03T12:00:00.000Z",
    updatedAt:
      "2026-08-03T12:00:00.000Z",
  },

  {
    id: "chemical-demo-2",

    name: "Pastor Pro",
    manufacturer: "Corteva",
    type: "Herbicide",

    activeIngredients:
      "Fluroxypyr, clopyralid and triclopyr",
    registrationNumber: "MAPP 18092",

    packSize: 2,
    packUnit: "L",

    costPerPack: 128,

    currentStock: 2,
    reorderLevel: 1,

    applicationRate: 2,
    applicationRateUnit: "L/ha",

    waterVolumePerHectare: 200,

    maximumAnnualApplications: 1,
    maximumAnnualDose: 2,

    targetUse:
      "Selective control of broad-leaved weeds in established turf.",

    nozzleColour: "Blue",
    nozzleType: "Flat fan",

    knapsackMake: "Cooper Pegler",
    knapsackModel: "CP15 Evolution",
    tankCapacityLitres: 15,

    walkingSpeedKph: 4.8,
    flowRateLitresPerMinute: 0.8,
    pressureBar: 2,

    ppeRequirements:
      "Chemical-resistant gloves, coveralls and suitable footwear.",
    coshhNotes:
      "Follow the product label and COSHH assessment before use.",
    environmentalWarnings:
      "Do not contaminate water. Observe all label buffer-zone requirements.",

    active: true,

    createdAt:
      "2026-08-03T12:05:00.000Z",
    updatedAt:
      "2026-08-03T12:05:00.000Z",
  },

  {
    id: "chemical-demo-3",

    name: "Liquid Iron",
    manufacturer: "Demo Supplier",
    type: "Moss Control",

    activeIngredients:
      "Ferrous sulphate",
    registrationNumber: "",

    packSize: 10,
    packUnit: "L",

    costPerPack: 36,

    currentStock: 4,
    reorderLevel: 2,

    applicationRate: 20,
    applicationRateUnit: "L/ha",

    waterVolumePerHectare: 200,

    maximumAnnualApplications: 4,
    maximumAnnualDose: 80,

    targetUse:
      "Moss suppression and turf greening.",

    nozzleColour: "Blue",
    nozzleType: "Flat fan",

    knapsackMake: "Cooper Pegler",
    knapsackModel: "CP15 Evolution",
    tankCapacityLitres: 15,

    walkingSpeedKph: 4.8,
    flowRateLitresPerMinute: 0.8,
    pressureBar: 2,

    ppeRequirements:
      "Gloves, eye protection and suitable work clothing.",
    coshhNotes:
      "May stain hard surfaces. Rinse spills immediately.",
    environmentalWarnings:
      "Avoid application near watercourses and drains.",

    active: true,

    createdAt:
      "2026-08-03T12:10:00.000Z",
    updatedAt:
      "2026-08-03T12:10:00.000Z",
  },
];

const ChemicalStoreContext =
  createContext<ChemicalStoreValue | null>(
    null,
  );

export function ChemicalStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [chemicals, setChemicals] =
    useState<ChemicalRecord[]>([]);

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
          Partial<ChemicalRecord>
        >;

        if (Array.isArray(parsed)) {
          setChemicals(
            parsed.map(
              normaliseChemical,
            ),
          );
        }
      } catch {
        window.localStorage.removeItem(
          STORAGE_KEY,
        );
      }
    } else {
      setChemicals(
        demoChemicals.map(
          (chemical) => ({
            ...chemical,
          }),
        ),
      );
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(chemicals),
    );
  }, [chemicals, ready]);

  function addChemical(
    input: NewChemicalInput = {},
  ) {
    const now =
      new Date().toISOString();

    const newChemical =
      normaliseChemical({
        id: `chemical-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

        ...input,

        createdAt: now,
        updatedAt: now,
      });

    setChemicals((current) => [
      newChemical,
      ...current,
    ]);

    return newChemical;
  }

  function updateChemical(
    chemical: ChemicalRecord,
  ) {
    const updatedChemical =
      normaliseChemical({
        ...chemical,
        updatedAt:
          new Date().toISOString(),
      });

    setChemicals((current) =>
      current.map((item) =>
        item.id ===
        updatedChemical.id
          ? updatedChemical
          : item,
      ),
    );
  }

  function deleteChemical(
    chemicalId: string,
  ) {
    setChemicals((current) =>
      current.filter(
        (chemical) =>
          chemical.id !== chemicalId,
      ),
    );
  }

  function getChemicalById(
    chemicalId: string,
  ) {
    return chemicals.find(
      (chemical) =>
        chemical.id === chemicalId,
    );
  }

  function calculateApplication(
    chemicalId: string,
    areaSquareMetres: number,
  ) {
    const chemical =
      getChemicalById(chemicalId);

    if (!chemical) {
      return null;
    }

    const safeArea = Math.max(
      0,
      areaSquareMetres,
    );

    const areaHectares =
      safeArea / 10000;

    let productRequired = 0;

    if (
      chemical.applicationRateUnit ===
        "kg/ha" ||
      chemical.applicationRateUnit ===
        "L/ha"
    ) {
      productRequired =
        chemical.applicationRate *
        areaHectares;
    } else {
      productRequired =
        chemical.applicationRate *
        safeArea;
    }

    const waterRequiredLitres =
      chemical.waterVolumePerHectare *
      areaHectares;

    const tankCapacity =
      chemical.tankCapacityLitres;

    const tankFills =
      tankCapacity > 0
        ? waterRequiredLitres /
          tankCapacity
        : 0;

    const productPerTank =
      tankFills > 0
        ? productRequired /
          tankFills
        : productRequired;

    const packSize =
      chemical.packSize;

    const productCost =
      packSize > 0
        ? (productRequired /
            packSize) *
          chemical.costPerPack
        : 0;

    return {
      productRequired:
        roundNumber(productRequired),

      productUnit:
        rateUnitToChemicalUnit(
          chemical.applicationRateUnit,
        ),

      waterRequiredLitres:
        roundNumber(
          waterRequiredLitres,
        ),

      tankFills:
        roundNumber(tankFills),

      productPerTank:
        roundNumber(productPerTank),

      productCost:
        roundCurrency(productCost),
    };
  }

  function restoreDemoChemicals() {
    setChemicals(
      demoChemicals.map(
        (chemical) => ({
          ...chemical,
        }),
      ),
    );

    window.localStorage.removeItem(
      STORAGE_KEY,
    );
  }

  const value =
    useMemo<ChemicalStoreValue>(
      () => ({
        chemicals,
        ready,
        addChemical,
        updateChemical,
        deleteChemical,
        getChemicalById,
        calculateApplication,
        restoreDemoChemicals,
      }),
      [chemicals, ready],
    );

  return (
    <ChemicalStoreContext.Provider
      value={value}
    >
      {children}
    </ChemicalStoreContext.Provider>
  );
}

export function useChemicalStore() {
  const context = useContext(
    ChemicalStoreContext,
  );

  if (!context) {
    throw new Error(
      "useChemicalStore must be used inside ChemicalStoreProvider.",
    );
  }

  return context;
}

function normaliseChemical(
  chemical: Partial<ChemicalRecord>,
): ChemicalRecord {
  return {
    id:
      chemical.id ??
      `chemical-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    name:
      chemical.name ??
      "New chemical",

    manufacturer:
      chemical.manufacturer ?? "",

    type:
      chemical.type ??
      "Other",

    activeIngredients:
      chemical.activeIngredients ?? "",

    registrationNumber:
      chemical.registrationNumber ?? "",

    packSize:
      chemical.packSize ?? 1,

    packUnit:
      chemical.packUnit ?? "L",

    costPerPack:
      chemical.costPerPack ?? 0,

    currentStock:
      chemical.currentStock ?? 0,

    reorderLevel:
      chemical.reorderLevel ?? 0,

    applicationRate:
      chemical.applicationRate ?? 0,

    applicationRateUnit:
      chemical.applicationRateUnit ??
      "L/ha",

    waterVolumePerHectare:
      chemical.waterVolumePerHectare ??
      0,

    maximumAnnualApplications:
      chemical.maximumAnnualApplications ??
      0,

    maximumAnnualDose:
      chemical.maximumAnnualDose ?? 0,

    targetUse:
      chemical.targetUse ?? "",

    nozzleColour:
      chemical.nozzleColour ?? "",

    nozzleType:
      chemical.nozzleType ?? "",

    knapsackMake:
      chemical.knapsackMake ?? "",

    knapsackModel:
      chemical.knapsackModel ?? "",

    tankCapacityLitres:
      chemical.tankCapacityLitres ??
      0,

    walkingSpeedKph:
      chemical.walkingSpeedKph ?? 0,

    flowRateLitresPerMinute:
      chemical.flowRateLitresPerMinute ??
      0,

    pressureBar:
      chemical.pressureBar ?? 0,

    ppeRequirements:
      chemical.ppeRequirements ?? "",

    coshhNotes:
      chemical.coshhNotes ?? "",

    environmentalWarnings:
      chemical.environmentalWarnings ??
      "",

    active:
      chemical.active ?? true,

    createdAt:
      chemical.createdAt ??
      new Date().toISOString(),

    updatedAt:
      chemical.updatedAt ??
      new Date().toISOString(),
  };
}

function rateUnitToChemicalUnit(
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

function roundNumber(
  value: number,
) {
  return Math.round(
    (value + Number.EPSILON) * 1000,
  ) / 1000;
}

function roundCurrency(
  value: number,
) {
  return Math.round(
    (value + Number.EPSILON) * 100,
  ) / 100;
}