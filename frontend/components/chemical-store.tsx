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
  sprayWidthMetres: number;
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

type ApplicationCalculation = {
  productRequired: number;
  productUnit: ChemicalUnit;

  calibratedWaterVolumePerHectare: number;
  waterRequiredLitres: number;

  tankFills: number;
  productPerTank: number;

  productCost: number;

  calibrationUsed: boolean;
};

type StockDeductionResult = {
  success: boolean;
  message: string;
};

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
  ) => ApplicationCalculation | null;

  deductChemicalStock: (
    chemicalId: string,
    productAmount: number,
    productUnit: ChemicalUnit,
  ) => StockDeductionResult;

  restoreDemoChemicals: () => void;
};

const STORAGE_KEY =
  "greenflow-chemicals-v1";

const DEFAULT_EQUIPMENT = {
  nozzleColour: "Grey",
  nozzleType: "Deflector Tip",

  knapsackMake: "Berthoud",
  knapsackModel: "Vermorel 2000",

  tankCapacityLitres: 16,

  walkingSpeedKph: 3,
  flowRateLitresPerMinute: 1.4,
  sprayWidthMetres: 1.3,
  pressureBar: 1,
};

const EMPTY_EQUIPMENT = {
  nozzleColour: "",
  nozzleType: "",

  knapsackMake: "",
  knapsackModel: "",

  tankCapacityLitres: 0,

  walkingSpeedKph: 0,
  flowRateLitresPerMinute: 0,
  sprayWidthMetres: 0,
  pressureBar: 0,
};

const demoChemicals: ChemicalRecord[] = [
  {
    id: "chemical-demo-1",

    name: "ProTurf Spring 21-5-6",
    manufacturer: "ICL",
    type: "Fertiliser",

    activeIngredients:
      "Nitrogen 21%, phosphate 5%, potassium 6%",

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

    ...EMPTY_EQUIPMENT,

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

    registrationNumber:
      "MAPP 18092",

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

    ...DEFAULT_EQUIPMENT,

    ppeRequirements:
      "Chemical-resistant gloves, coveralls and suitable footwear.",

    coshhNotes:
      "Follow the current product label and COSHH assessment before use.",

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

    ...DEFAULT_EQUIPMENT,

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
        } else {
          setChemicals(
            cloneDemoChemicals(),
          );
        }
      } catch {
        window.localStorage.removeItem(
          STORAGE_KEY,
        );

        setChemicals(
          cloneDemoChemicals(),
        );
      }
    } else {
      setChemicals(
        cloneDemoChemicals(),
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
        id: createChemicalId(),

        name: "New chemical",
        manufacturer: "",
        type: "Other",

        activeIngredients: "",
        registrationNumber: "",

        packSize: 1,
        packUnit: "L",
        costPerPack: 0,

        currentStock: 0,
        reorderLevel: 0,

        applicationRate: 0,
        applicationRateUnit: "L/ha",

        waterVolumePerHectare: 0,

        maximumAnnualApplications: 0,
        maximumAnnualDose: 0,

        targetUse: "",

        ...DEFAULT_EQUIPMENT,

        ppeRequirements: "",
        coshhNotes: "",
        environmentalWarnings: "",

        active: true,

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

    return calculateChemicalApplication(
      chemical,
      areaSquareMetres,
    );
  }

  function deductChemicalStock(
    chemicalId: string,
    productAmount: number,
    productUnit: ChemicalUnit,
  ): StockDeductionResult {
    const chemical =
      chemicals.find(
        (item) =>
          item.id === chemicalId,
      );

    if (!chemical) {
      return {
        success: false,
        message:
          "The selected chemical could not be found.",
      };
    }

    if (productAmount <= 0) {
      return {
        success: false,
        message:
          "The product amount must be greater than zero.",
      };
    }

    if (chemical.packSize <= 0) {
      return {
        success: false,
        message:
          `${chemical.name} does not have a valid pack size.`,
      };
    }

    const amountInPackUnit =
      convertChemicalAmount(
        productAmount,
        productUnit,
        chemical.packUnit,
      );

    if (amountInPackUnit === null) {
      return {
        success: false,
        message:
          `The treatment unit ${productUnit} cannot be converted to the saved pack unit ${chemical.packUnit}.`,
      };
    }

    const packsUsed =
      amountInPackUnit /
      chemical.packSize;

    if (
      packsUsed >
      chemical.currentStock
    ) {
      return {
        success: false,

        message: `There is not enough ${chemical.name} in stock. Required: ${packsUsed.toFixed(
          3,
        )} packs. Available: ${chemical.currentStock.toFixed(
          3,
        )} packs.`,
      };
    }

    setChemicals((current) =>
      current.map((item) => {
        if (
          item.id !== chemicalId
        ) {
          return item;
        }

        return {
          ...item,

          currentStock:
            roundToThreeDecimals(
              Math.max(
                0,
                item.currentStock -
                  packsUsed,
              ),
            ),

          updatedAt:
            new Date().toISOString(),
        };
      }),
    );

    return {
      success: true,

      message: `${chemical.name} stock reduced by ${packsUsed.toFixed(
        3,
      )} packs.`,
    };
  }

  function restoreDemoChemicals() {
    setChemicals(
      cloneDemoChemicals(),
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
        deductChemicalStock,

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
      createChemicalId(),

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
      toSafeNumber(
        chemical.packSize,
        1,
      ),

    packUnit:
      chemical.packUnit ?? "L",

    costPerPack:
      toSafeNumber(
        chemical.costPerPack,
      ),

    currentStock:
      toSafeNumber(
        chemical.currentStock,
      ),

    reorderLevel:
      toSafeNumber(
        chemical.reorderLevel,
      ),

    applicationRate:
      toSafeNumber(
        chemical.applicationRate,
      ),

    applicationRateUnit:
      chemical.applicationRateUnit ??
      "L/ha",

    waterVolumePerHectare:
      toSafeNumber(
        chemical.waterVolumePerHectare,
      ),

    maximumAnnualApplications:
      toSafeNumber(
        chemical.maximumAnnualApplications,
      ),

    maximumAnnualDose:
      toSafeNumber(
        chemical.maximumAnnualDose,
      ),

    targetUse:
      chemical.targetUse ?? "",

    nozzleColour:
      chemical.nozzleColour ??
      DEFAULT_EQUIPMENT.nozzleColour,

    nozzleType:
      chemical.nozzleType ??
      DEFAULT_EQUIPMENT.nozzleType,

    knapsackMake:
      chemical.knapsackMake ??
      DEFAULT_EQUIPMENT.knapsackMake,

    knapsackModel:
      chemical.knapsackModel ??
      DEFAULT_EQUIPMENT.knapsackModel,

    tankCapacityLitres:
      toSafeNumber(
        chemical.tankCapacityLitres,
        DEFAULT_EQUIPMENT
          .tankCapacityLitres,
      ),

    walkingSpeedKph:
      toSafeNumber(
        chemical.walkingSpeedKph,
        DEFAULT_EQUIPMENT
          .walkingSpeedKph,
      ),

    flowRateLitresPerMinute:
      toSafeNumber(
        chemical.flowRateLitresPerMinute,
        DEFAULT_EQUIPMENT
          .flowRateLitresPerMinute,
      ),

    sprayWidthMetres:
      toSafeNumber(
        chemical.sprayWidthMetres,
        DEFAULT_EQUIPMENT
          .sprayWidthMetres,
      ),

    pressureBar:
      toSafeNumber(
        chemical.pressureBar,
        DEFAULT_EQUIPMENT
          .pressureBar,
      ),

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

function calculateChemicalApplication(
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

  const hasValidCalibration =
    chemical.flowRateLitresPerMinute >
      0 &&
    chemical.walkingSpeedKph > 0 &&
    chemical.sprayWidthMetres > 0;

  const calibratedWaterVolumePerHectare =
    hasValidCalibration
      ? (600 *
          chemical.flowRateLitresPerMinute) /
        (chemical.walkingSpeedKph *
          chemical.sprayWidthMetres)
      : Math.max(
          0,
          chemical.waterVolumePerHectare,
        );

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

  const productCost =
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
      rateUnitToChemicalUnit(
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

    productCost:
      roundToTwoDecimals(
        productCost,
      ),

    calibrationUsed:
      hasValidCalibration,
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

function convertChemicalAmount(
  amount: number,
  fromUnit: ChemicalUnit,
  toUnit: ChemicalUnit,
): number | null {
  if (fromUnit === toUnit) {
    return amount;
  }

  if (
    fromUnit === "ml" &&
    toUnit === "L"
  ) {
    return amount / 1000;
  }

  if (
    fromUnit === "L" &&
    toUnit === "ml"
  ) {
    return amount * 1000;
  }

  if (
    fromUnit === "g" &&
    toUnit === "kg"
  ) {
    return amount / 1000;
  }

  if (
    fromUnit === "kg" &&
    toUnit === "g"
  ) {
    return amount * 1000;
  }

  return null;
}

function cloneDemoChemicals() {
  return demoChemicals.map(
    (chemical) => ({
      ...chemical,
    }),
  );
}

function createChemicalId() {
  return `chemical-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function toSafeNumber(
  value: number | undefined,
  fallback = 0,
) {
  if (
    typeof value !== "number" ||
    Number.isNaN(value)
  ) {
    return fallback;
  }

  return Math.max(
    0,
    value,
  );
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