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

export type ChemicalStockMovementType =
  | "Delivery"
  | "Usage"
  | "Adjustment";

export type ChemicalStockMovement = {
  id: string;
  chemicalId: string;
  type: ChemicalStockMovementType;
  packQuantity: number;
  physicalAmount: number;
  physicalUnit: ChemicalUnit;

  /*
   * Snapshot of the live pack-equivalent balance immediately
   * after this movement. Optional so older saved movement
   * records remain compatible.
   */
  balanceAfterPacks?: number;

  date: string;
  reference: string;
  notes: string;
  source: "Visit Centre" | "Stock Page";
  createdAt: string;
};

type NewChemicalStockMovement = Omit<
  ChemicalStockMovement,
  "id" | "createdAt"
>;

export type StockDeductionContext = {
  date?: string;
  reference?: string;
  notes?: string;
};

export type ChemicalStockDeductionRequest = {
  chemicalId: string;
  productAmount: number;
  productUnit: ChemicalUnit;
};

export type StockBatchDeductionResult = {
  success: boolean;
  message: string;
};

type ChemicalStoreValue = {
  chemicals: ChemicalRecord[];
  stockMovements: ChemicalStockMovement[];
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
    context?: StockDeductionContext,
  ) => StockDeductionResult;

  deductChemicalStockBatch: (
    requests: ChemicalStockDeductionRequest[],
    context?: StockDeductionContext,
  ) => StockBatchDeductionResult;

  recordStockMovement: (
    movement: NewChemicalStockMovement,
  ) => ChemicalStockMovement;

  clearStockMovements: () => void;

  restoreDemoChemicals: () => void;
};

const STORAGE_KEY =
  "greenflow-chemicals-v1";

const STOCK_MOVEMENT_STORAGE_KEY =
  "greenflow-chemical-stock-movements-v1";

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

    // Pack-equivalents: 23 x 25 kg = 575 kg available.
    currentStock: 23,
    reorderLevel: 5,

    applicationRate: 300,
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

    // Pack-equivalents: 4 x 2 L = 8 L available.
    currentStock: 4,
    reorderLevel: 2,

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

    // Pack-equivalents: 6 x 10 L = 60 L available.
    currentStock: 6,
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

  const chemicalsRef =
    useRef<ChemicalRecord[]>([]);

  const [
    stockMovements,
    setStockMovements,
  ] = useState<ChemicalStockMovement[]>([]);

  const stockMovementsRef =
    useRef<
      ChemicalStockMovement[]
    >([]);

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
          const loadedChemicals =
            parsed.map(
              normaliseChemical,
            );

          chemicalsRef.current =
            loadedChemicals;

          setChemicals(
            loadedChemicals,
          );
        } else {
          const demo =
            cloneDemoChemicals();

          chemicalsRef.current =
            demo;

          setChemicals(
            demo,
          );
        }
      } catch {
        window.localStorage.removeItem(
          STORAGE_KEY,
        );

        const demo =
          cloneDemoChemicals();

        chemicalsRef.current =
          demo;

        setChemicals(
          demo,
        );
      }
    } else {
      const demo =
        cloneDemoChemicals();

      chemicalsRef.current =
        demo;

      setChemicals(
        demo,
      );
    }

    const savedMovements =
      window.localStorage.getItem(
        STOCK_MOVEMENT_STORAGE_KEY,
      );

    if (savedMovements) {
      try {
        const parsed =
          JSON.parse(
            savedMovements,
          ) as ChemicalStockMovement[];

        if (Array.isArray(parsed)) {
          stockMovementsRef.current =
            parsed;

          setStockMovements(
            parsed,
          );
        }
      } catch {
        window.localStorage.removeItem(
          STOCK_MOVEMENT_STORAGE_KEY,
        );
      }
    }

    setReady(true);
  }, []);

  useEffect(() => {
    chemicalsRef.current =
      chemicals;
  }, [chemicals]);

  useEffect(() => {
    stockMovementsRef.current =
      stockMovements;
  }, [stockMovements]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(chemicals),
    );
  }, [chemicals, ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    window.localStorage.setItem(
      STOCK_MOVEMENT_STORAGE_KEY,
      JSON.stringify(
        stockMovements,
      ),
    );
  }, [stockMovements, ready]);

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

    const next = [
      newChemical,
      ...chemicalsRef.current,
    ];

    chemicalsRef.current =
      next;

    setChemicals(next);

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

    const next =
      chemicalsRef.current.map(
        (item) =>
          item.id ===
          updatedChemical.id
            ? updatedChemical
            : item,
      );

    chemicalsRef.current =
      next;

    setChemicals(next);
  }

  function deleteChemical(
    chemicalId: string,
  ) {
    const next =
      chemicalsRef.current.filter(
        (chemical) =>
          chemical.id !== chemicalId,
      );

    chemicalsRef.current =
      next;

    setChemicals(next);
  }

  function getChemicalById(
    chemicalId: string,
  ) {
    return chemicalsRef.current.find(
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

  function recordStockMovement(
    movement: NewChemicalStockMovement,
  ) {
    const created:
      ChemicalStockMovement = {
        ...movement,
        id:
          createStockMovementId(),
        createdAt:
          new Date().toISOString(),
      };

    const next = [
      created,
      ...stockMovementsRef.current,
    ];

    stockMovementsRef.current =
      next;

    setStockMovements(next);

    return created;
  }

  function clearStockMovements() {
    stockMovementsRef.current =
      [];

    setStockMovements([]);
  }

  function deductChemicalStock(
    chemicalId: string,
    productAmount: number,
    productUnit: ChemicalUnit,
    context: StockDeductionContext = {},
  ): StockDeductionResult {
    return deductChemicalStockBatch(
      [
        {
          chemicalId,
          productAmount,
          productUnit,
        },
      ],
      context,
    );
  }

  function deductChemicalStockBatch(
    requests: ChemicalStockDeductionRequest[],
    context: StockDeductionContext = {},
  ): StockBatchDeductionResult {
    if (requests.length === 0) {
      return {
        success: true,
        message:
          "No stock deductions were required.",
      };
    }

    type PreparedDeduction = {
      chemical: ChemicalRecord;
      physicalAmount: number;
      packsUsed: number;
    };

    const currentChemicals =
      chemicalsRef.current;

    const preparedByChemical =
      new Map<
        string,
        PreparedDeduction
      >();

    for (const request of requests) {
      if (
        typeof request.productAmount !==
          "number" ||
        !Number.isFinite(
          request.productAmount,
        ) ||
        request.productAmount <= 0
      ) {
        return {
          success: false,
          message:
            "One of the selected stock products has an invalid treatment amount.",
        };
      }

      const chemical =
        currentChemicals.find(
          (item) =>
            item.id ===
            request.chemicalId,
        );

      if (!chemical) {
        return {
          success: false,
          message:
            "One of the selected stock products could not be found.",
        };
      }

      if (
        !Number.isFinite(
          chemical.packSize,
        ) ||
        chemical.packSize <= 0
      ) {
        return {
          success: false,
          message:
            `${chemical.name} does not have a valid pack size.`,
        };
      }

      if (
        !Number.isFinite(
          chemical.currentStock,
        ) ||
        chemical.currentStock < 0
      ) {
        return {
          success: false,
          message:
            `${chemical.name} has an invalid current stock balance.`,
        };
      }

      const amountInPackUnit =
        convertChemicalAmount(
          request.productAmount,
          request.productUnit,
          chemical.packUnit,
        );

      if (
        amountInPackUnit === null ||
        !Number.isFinite(
          amountInPackUnit,
        ) ||
        amountInPackUnit <= 0
      ) {
        return {
          success: false,
          message:
            `The treatment unit ${request.productUnit} cannot be converted to the saved pack unit ${chemical.packUnit} for ${chemical.name}.`,
        };
      }

      const existing =
        preparedByChemical.get(
          chemical.id,
        );

      const combinedPhysicalAmount =
        (existing?.physicalAmount ??
          0) +
        amountInPackUnit;

      const packsUsed =
        combinedPhysicalAmount /
        chemical.packSize;

      if (
        !Number.isFinite(
          combinedPhysicalAmount,
        ) ||
        !Number.isFinite(
          packsUsed,
        ) ||
        packsUsed <= 0
      ) {
        return {
          success: false,
          message:
            `${chemical.name} produced an invalid stock deduction calculation.`,
        };
      }

      preparedByChemical.set(
        chemical.id,
        {
          chemical,
          physicalAmount:
            combinedPhysicalAmount,
          packsUsed,
        },
      );
    }

    const prepared =
      Array.from(
        preparedByChemical.values(),
      );

    /*
     * Validate every product against the same latest
     * stock snapshot before changing anything.
     */
    for (const item of prepared) {
      if (
        item.packsUsed >
        item.chemical.currentStock +
          0.000001
      ) {
        const availableAmount =
          item.chemical.currentStock *
          item.chemical.packSize;

        return {
          success: false,
          message: `There is not enough ${item.chemical.name} in stock. Required: ${item.physicalAmount.toFixed(
            3,
          )} ${item.chemical.packUnit} (${item.packsUsed.toFixed(
            3,
          )} pack equivalents). Available: ${availableAmount.toFixed(
            3,
          )} ${item.chemical.packUnit} (${item.chemical.currentStock.toFixed(
            3,
          )} pack equivalents).`,
        };
      }
    }

    const deductions =
      new Map<
        string,
        number
      >(
        prepared.map(
          (item) => [
            item.chemical.id,
            item.packsUsed,
          ],
        ),
      );

    const now =
      new Date().toISOString();

    const nextChemicals =
      currentChemicals.map(
        (chemical) => {
          const packsUsed =
            deductions.get(
              chemical.id,
            );

          if (
            packsUsed ===
            undefined
          ) {
            return chemical;
          }

          return {
            ...chemical,
            currentStock:
              roundToThreeDecimals(
                Math.max(
                  0,
                  chemical.currentStock -
                    packsUsed,
                ),
              ),
            updatedAt: now,
          };
        },
      );

    const nextBalances =
      new Map<
        string,
        number
      >(
        nextChemicals.map(
          (chemical) => [
            chemical.id,
            chemical.currentStock,
          ],
        ),
      );

    const movementDate =
      context.date ||
      toDateValue(
        new Date(),
      );

    const newMovements =
      prepared.map(
        (item) => {
          const balanceAfterPacks =
            nextBalances.get(
              item.chemical.id,
            ) ?? 0;

          return {
            id:
              createStockMovementId(),
            chemicalId:
              item.chemical.id,
            type:
              "Usage" as const,
            packQuantity:
              -roundToThreeDecimals(
                item.packsUsed,
              ),
            physicalAmount:
              -roundToThreeDecimals(
                item.physicalAmount,
              ),
            physicalUnit:
              item.chemical.packUnit,
            balanceAfterPacks:
              roundToThreeDecimals(
                balanceAfterPacks,
              ),
            date:
              movementDate,
            reference:
              context.reference ||
              "Treatment completion",
            notes:
              context.notes ||
              "Automatically deducted when treatment visits were completed.",
            source:
              "Visit Centre" as const,
            createdAt:
              now,
          } satisfies ChemicalStockMovement;
        },
      );

    const nextMovements = [
      ...newMovements,
      ...stockMovementsRef.current,
    ];

    /*
     * Commit both state changes only after the full
     * batch has passed validation and both next-state
     * snapshots have been calculated.
     */
    chemicalsRef.current =
      nextChemicals;

    stockMovementsRef.current =
      nextMovements;

    setChemicals(
      nextChemicals,
    );

    setStockMovements(
      nextMovements,
    );

    const reorderWarnings =
      prepared
        .map((item) => {
          const remaining =
            nextBalances.get(
              item.chemical.id,
            ) ?? 0;

          if (
            remaining <
            item.chemical.reorderLevel
          ) {
            return `${item.chemical.name} is now below its reorder level.`;
          }

          return "";
        })
        .filter(Boolean);

    return {
      success: true,
      message:
        reorderWarnings.length >
        0
          ? `Stock deducted successfully. ${reorderWarnings.join(
              " ",
            )}`
          : "Stock deducted successfully.",
    };
  }

  function restoreDemoChemicals() {
    const demo =
      cloneDemoChemicals();

    chemicalsRef.current =
      demo;

    stockMovementsRef.current =
      [];

    setChemicals(
      demo,
    );

    setStockMovements([]);
  }

  const value =
    useMemo<ChemicalStoreValue>(
      () => ({
        chemicals,
        stockMovements,
        ready,

        addChemical,
        updateChemical,
        deleteChemical,

        getChemicalById,
        calculateApplication,
        deductChemicalStock,
        deductChemicalStockBatch,

        recordStockMovement,
        clearStockMovements,

        restoreDemoChemicals,
      }),
      [
        chemicals,
        stockMovements,
        ready,
      ],
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

function createStockMovementId() {
  return `chemical-stock-movement-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
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
    !Number.isFinite(value)
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