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
  type ChemicalType,
  type ChemicalUnit,
  useChemicalStore,
} from "@/components/chemical-store";
import { useTreatmentStore } from "@/components/treatment-store";

type ChemicalFilter =
  | ChemicalType
  | "All";

type StockFilter =
  | "All"
  | "Low stock"
  | "In stock"
  | "Archived";

type ChemicalMessageTone =
  | "success"
  | "error";

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

const chemicalTypes: ChemicalType[] = [
  "Fertiliser",
  "Herbicide",
  "Moss Control",
  "Wetting Agent",
  "Biostimulant",
  "Seed",
  "Other",
];

const chemicalUnits: ChemicalUnit[] = [
  "kg",
  "L",
  "g",
  "ml",
];

const applicationRateUnits: ApplicationRateUnit[] =
  [
    "kg/ha",
    "L/ha",
    "g/m²",
    "ml/m²",
  ];

export default function ChemicalsPage() {
  const {
    chemicals,
    stockMovements,
    ready,
    addChemical,
    updateChemical,
    deleteChemical,
    restoreDemoChemicals,
  } = useChemicalStore();

  const {
    treatments,
  } = useTreatmentStore();

  const [
    selectedChemicalId,
    setSelectedChemicalId,
  ] = useState("");

  const [draft, setDraft] =
    useState<ChemicalRecord | null>(
      null,
    );

  const [search, setSearch] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState<ChemicalFilter>("All");

  const [stockFilter, setStockFilter] =
    useState<StockFilter>("All");

  const [
    calculatorArea,
    setCalculatorArea,
  ] = useState(250);

  const [message, setMessage] =
    useState("");

  const [messageTone, setMessageTone] =
    useState<ChemicalMessageTone>(
      "success",
    );

  const filteredChemicals =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      return [...chemicals]
        .filter((chemical) => {
          const matchesType =
            typeFilter === "All" ||
            chemical.type ===
              typeFilter;

          if (!matchesType) {
            return false;
          }

          const isLowStock =
            chemical.active &&
            chemical.currentStock <=
              chemical.reorderLevel;

          const matchesStock =
            stockFilter === "All" ||
            (stockFilter ===
              "Low stock" &&
              isLowStock) ||
            (stockFilter ===
              "In stock" &&
              chemical.active &&
              !isLowStock) ||
            (stockFilter ===
              "Archived" &&
              !chemical.active);

          if (!matchesStock) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            chemical.name,
            chemical.manufacturer,
            chemical.type,
            chemical.activeIngredients,
            chemical.registrationNumber,
            chemical.targetUse,
          ].some((value) =>
            value
              .toLowerCase()
              .includes(query),
          );
        })
        .sort((first, second) => {
          if (
            first.active !==
            second.active
          ) {
            return first.active
              ? -1
              : 1;
          }

          return first.name.localeCompare(
            second.name,
          );
        });
    }, [
      chemicals,
      search,
      typeFilter,
      stockFilter,
    ]);

  const selectedChemical =
    draft ??
    chemicals.find(
      (chemical) =>
        chemical.id ===
        selectedChemicalId,
    ) ??
    filteredChemicals[0] ??
    null;

  const activeChemicals =
    chemicals.filter(
      (chemical) =>
        chemical.active,
    );

  const lowStockChemicals =
    activeChemicals.filter(
      (chemical) =>
        chemical.currentStock <=
        chemical.reorderLevel,
    );

  const herbicideCount =
    activeChemicals.filter(
      (chemical) =>
        chemical.type ===
        "Herbicide",
    ).length;

  const totalStockValue =
    activeChemicals.reduce(
      (total, chemical) =>
        total +
        chemical.currentStock *
          chemical.costPerPack,
      0,
    );

  const calculation:
    | ApplicationCalculation
    | null = selectedChemical
    ? calculateDraftApplication(
        selectedChemical,
        calculatorArea,
      )
    : null;

  function selectChemical(
    chemical: ChemicalRecord,
  ) {
    setSelectedChemicalId(
      chemical.id,
    );

    setDraft({
      ...chemical,
    });
  }

  function createChemical() {
    const chemical = addChemical({
      name: "New chemical",
      type: "Other",
      packSize: 1,
      packUnit: "L",
      applicationRateUnit:
        "L/ha",
      active: true,
    });

    setSelectedChemicalId(
      chemical.id,
    );

    setDraft({
      ...chemical,
    });

    showMessage(
      "New chemical record created.",
    );
  }

  function updateDraft<
    K extends keyof ChemicalRecord,
  >(
    field: K,
    value: ChemicalRecord[K],
  ) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function saveChemical(
    event?: FormEvent<HTMLFormElement>,
  ) {
    event?.preventDefault();

    if (!draft) {
      showMessage(
        "Select or create a chemical first.",
        "error",
      );
      return;
    }

    if (!draft.name.trim()) {
      showMessage(
        "Enter the chemical or product name.",
        "error",
      );
      return;
    }

    const normalisedName =
      draft.name.trim().toLowerCase();

    const duplicateChemical =
      chemicals.find(
        (chemical) =>
          chemical.id !== draft.id &&
          chemical.name
            .trim()
            .toLowerCase() ===
            normalisedName,
      );

    if (duplicateChemical) {
      showMessage(
        `A chemical or product named "${duplicateChemical.name}" already exists. Open that record instead or use a different name.`,
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(draft.packSize) ||
      draft.packSize <= 0
    ) {
      showMessage(
        "Pack size must be greater than 0.",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(draft.costPerPack) ||
      draft.costPerPack < 0
    ) {
      showMessage(
        "Cost per pack must be 0 or greater.",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(draft.currentStock) ||
      draft.currentStock < 0
    ) {
      showMessage(
        "Current stock must be 0 or greater.",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(draft.reorderLevel) ||
      draft.reorderLevel < 0
    ) {
      showMessage(
        "Reorder level must be 0 or greater.",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(draft.applicationRate) ||
      draft.applicationRate < 0
    ) {
      showMessage(
        "Application rate must be 0 or greater.",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(
        draft.waterVolumePerHectare,
      ) ||
      draft.waterVolumePerHectare < 0
    ) {
      showMessage(
        "Water volume per hectare must be 0 or greater.",
        "error",
      );
      return;
    }

    if (
      !Number.isInteger(
        draft.maximumAnnualApplications,
      ) ||
      draft.maximumAnnualApplications < 0
    ) {
      showMessage(
        "Maximum annual applications must be a whole number of 0 or greater.",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(
        draft.maximumAnnualDose,
      ) ||
      draft.maximumAnnualDose < 0
    ) {
      showMessage(
        "Maximum annual dose must be 0 or greater.",
        "error",
      );
      return;
    }

    const savedChemical: ChemicalRecord =
      {
        ...draft,

        name:
          draft.name.trim(),

        manufacturer:
          draft.manufacturer.trim(),

        activeIngredients:
          draft.activeIngredients.trim(),

        registrationNumber:
          draft.registrationNumber.trim(),

        targetUse:
          draft.targetUse.trim(),

        nozzleColour:
          draft.nozzleColour.trim(),

        nozzleType:
          draft.nozzleType.trim(),

        knapsackMake:
          draft.knapsackMake.trim(),

        knapsackModel:
          draft.knapsackModel.trim(),

        ppeRequirements:
          draft.ppeRequirements.trim(),

        coshhNotes:
          draft.coshhNotes.trim(),

        environmentalWarnings:
          draft.environmentalWarnings.trim(),
      };

    updateChemical(savedChemical);

    setDraft(savedChemical);

    showMessage(
      `${savedChemical.name} saved.`,
    );
  }

  function archiveChemical() {
    if (!draft) {
      return;
    }

    const updated: ChemicalRecord =
      {
        ...draft,
        active: !draft.active,
      };

    updateChemical(updated);
    setDraft(updated);

    showMessage(
      updated.active
        ? `${updated.name} restored.`
        : `${updated.name} archived.`,
    );
  }

  function removeChemical() {
    if (!selectedChemical) {
      return;
    }

    const hasTreatmentHistory =
      treatments.some(
        (treatment) =>
          treatment.chemicalId ===
            selectedChemical.id ||
          treatment.applications.some(
            (application) =>
              application.productId ===
              selectedChemical.id,
          ),
      );

    const hasStockHistory =
      stockMovements.some(
        (movement) =>
          movement.chemicalId ===
          selectedChemical.id,
      );

    if (
      hasTreatmentHistory ||
      hasStockHistory
    ) {
      const historyReason =
        hasTreatmentHistory &&
        hasStockHistory
          ? "treatment and stock movement history"
          : hasTreatmentHistory
            ? "treatment history"
            : "stock movement history";

      window.alert(
        `"${selectedChemical.name}" has ${historyReason} and cannot be permanently deleted.\n\nArchive the product instead so GreenFlow can preserve its historical records.`,
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Permanently delete "${selectedChemical.name}"?\n\nThis product has no treatment or stock movement history. This action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    deleteChemical(
      selectedChemical.id,
    );

    const remaining =
      chemicals.filter(
        (chemical) =>
          chemical.id !==
          selectedChemical.id,
      );

    setSelectedChemicalId("");

    setDraft(
      remaining[0]
        ? {
            ...remaining[0],
          }
        : null,
    );

    showMessage(
      "Chemical deleted.",
    );
  }

  function restoreDemoData() {
    const confirmed =
      window.confirm(
        "Restore the original demonstration chemicals? Current chemical records will be replaced.",
      );

    if (!confirmed) {
      return;
    }

    restoreDemoChemicals();

    setSelectedChemicalId("");
    setDraft(null);

    showMessage(
      "Demonstration chemicals restored.",
    );
  }

  function showMessage(
    text: string,
    tone: ChemicalMessageTone = "success",
  ) {
    setMessage(text);
    setMessageTone(tone);

    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading chemical database...
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
                Chemical Centre
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage product labels,
                active ingredients,
                equipment calibration,
                COSHH information and
                application calculations.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  restoreDemoData
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
              >
                Restore demo chemicals
              </button>

              <button
                type="button"
                onClick={
                  createChemical
                }
                className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
              >
                + Add chemical
              </button>
            </div>
          </header>

          {message && (
            <div
              role={
                messageTone === "error"
                  ? "alert"
                  : "status"
              }
              className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                messageTone === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-green-200 bg-green-50 text-green-800"
              }`}
            >
              {message}
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Active chemicals"
              value={String(
                activeChemicals.length,
              )}
              detail="Available for treatments"
            />

            <SummaryCard
              label="Low stock"
              value={String(
                lowStockChemicals.length,
              )}
              detail="At or below reorder level"
              warning={
                lowStockChemicals.length >
                0
              }
            />

            <SummaryCard
              label="Herbicides"
              value={String(
                herbicideCount,
              )}
              detail="Active selective products"
            />

            <SummaryCard
              label="Estimated stock value"
              value={`£${totalStockValue.toFixed(
                2,
              )}`}
              detail="Stock units × pack cost"
            />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr]">
            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <Field label="Search products">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Name, manufacturer, ingredient or MAPP"
                  className={inputClass}
                />
              </Field>

              <div className="mt-3 space-y-3">
                <Field label="Product type">
                  <select
                    value={typeFilter}
                    onChange={(event) =>
                      setTypeFilter(
                        event.target
                          .value as ChemicalFilter,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="All">
                      All types
                    </option>

                    {chemicalTypes.map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field label="Stock status">
                  <select
                    value={stockFilter}
                    onChange={(event) =>
                      setStockFilter(
                        event.target
                          .value as StockFilter,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="All">
                      All products
                    </option>

                    <option value="Low stock">
                      Low stock
                    </option>

                    <option value="In stock">
                      In stock
                    </option>

                    <option value="Archived">
                      Archived
                    </option>
                  </select>
                </Field>
              </div>

              <div className="mt-4 max-h-[67vh] space-y-2 overflow-y-auto pr-1">
                {filteredChemicals.length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                    No chemicals match
                    the current filters.
                  </div>
                ) : (
                  filteredChemicals.map(
                    (chemical) => {
                      const isSelected =
                        selectedChemical?.id ===
                        chemical.id;

                      const isLowStock =
                        chemical.active &&
                        chemical.currentStock <=
                          chemical.reorderLevel;

                      return (
                        <button
                          key={
                            chemical.id
                          }
                          type="button"
                          onClick={() =>
                            selectChemical(
                              chemical,
                            )
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
                                  chemical.name
                                }
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {chemical.manufacturer ||
                                  "No manufacturer"}{" "}
                                ·{" "}
                                {
                                  chemical.type
                                }
                              </div>
                            </div>

                            <ChemicalStatusBadge
                              active={
                                chemical.active
                              }
                              lowStock={
                                isLowStock
                              }
                            />
                          </div>

                          <div className="mt-3 flex items-end justify-between gap-3">
                            <div>
                              <div className="text-xs text-slate-500">
                                Application
                                rate
                              </div>

                              <div className="font-semibold">
                                {
                                  chemical.applicationRate
                                }{" "}
                                {
                                  chemical.applicationRateUnit
                                }
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs text-slate-500">
                                Stock
                              </div>

                              <div className="font-bold">
                                {
                                  chemical.currentStock
                                }{" "}
                                pack
                                {chemical.currentStock ===
                                1
                                  ? ""
                                  : "s"}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    },
                  )
                )}
              </div>
            </aside>

            <section className="min-w-0">
              {!selectedChemical ? (
                <article className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                  <h2 className="text-xl font-bold">
                    Select or add a
                    chemical
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Choose a product from
                    the left or create a
                    new chemical record.
                  </p>
                </article>
              ) : (
                <form
                  onSubmit={
                    saveChemical
                  }
                  className="space-y-4"
                >
                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-2xl font-bold">
                            {
                              selectedChemical.name
                            }
                          </h2>

                          <ChemicalStatusBadge
                            active={
                              selectedChemical.active
                            }
                            lowStock={
                              selectedChemical.active &&
                              selectedChemical.currentStock <=
                                selectedChemical.reorderLevel
                            }
                          />
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          Last updated{" "}
                          {formatDateTime(
                            selectedChemical.updatedAt,
                          )}
                        </p>
                      </div>

                     <div className="flex flex-wrap items-center gap-2">
    <button
    type="button"
    onClick={archiveChemical}
    className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100"
  >
    {selectedChemical.active
      ? "Archive"
      : "Restore"}
  </button>

  <Link
    href={`/chemicals/${selectedChemical.id}`}
    className="inline-flex items-center justify-center rounded-xl border border-[#338b45] bg-white px-4 py-2.5 text-sm font-semibold text-[#176b37] hover:bg-green-50"
  >
    View chemical sheet
  </Link>

  <button
    type="submit"
    className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
  >
    Save chemical
  </button>
</div> 
                    </div>
                  </article>

                  <section className="grid gap-4 lg:grid-cols-2">
                    <Panel>
                      <SectionHeading
                        title="Product identity"
                        description="Record the product name, manufacturer, registration and active ingredients exactly as shown on the label."
                      />

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <Field label="Product name">
                          <input
                            value={
                              selectedChemical.name
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraft(
                                "name",
                                event.target
                                  .value,
                              )
                            }
                            className={
                              inputClass
                            }
                          />
                        </Field>

                        <Field label="Manufacturer">
                          <input
                            value={
                              selectedChemical.manufacturer
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraft(
                                "manufacturer",
                                event.target
                                  .value,
                              )
                            }
                            className={
                              inputClass
                            }
                          />
                        </Field>

                        <Field label="Product type">
                          <select
                            value={
                              selectedChemical.type
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraft(
                                "type",
                                event.target
                                  .value as ChemicalType,
                              )
                            }
                            className={
                              inputClass
                            }
                          >
                            {chemicalTypes.map(
                              (type) => (
                                <option
                                  key={type}
                                  value={type}
                                >
                                  {type}
                                </option>
                              ),
                            )}
                          </select>
                        </Field>

                        <Field label="MAPP / PCS number">
                          <input
                            value={
                              selectedChemical.registrationNumber
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraft(
                                "registrationNumber",
                                event.target
                                  .value,
                              )
                            }
                            placeholder="For example, MAPP 18092"
                            className={
                              inputClass
                            }
                          />
                        </Field>

                        <div className="sm:col-span-2">
                          <Field label="Active ingredients">
                            <textarea
                              rows={3}
                              value={
                                selectedChemical.activeIngredients
                              }
                              onChange={(
                                event,
                              ) =>
                                updateDraft(
                                  "activeIngredients",
                                  event
                                    .target
                                    .value,
                                )
                              }
                              className={
                                inputClass
                              }
                            />
                          </Field>
                        </div>

                        <div className="sm:col-span-2">
                          <Field label="Target use">
                            <textarea
                              rows={3}
                              value={
                                selectedChemical.targetUse
                              }
                              onChange={(
                                event,
                              ) =>
                                updateDraft(
                                  "targetUse",
                                  event
                                    .target
                                    .value,
                                )
                              }
                              className={
                                inputClass
                              }
                            />
                          </Field>
                        </div>
                      </div>
                    </Panel>

                    <Panel>
                      <SectionHeading
                        title="Pack and stock"
                        description="Store pack size, purchase cost, current stock and reorder information."
                      />

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <NumberField
                          label="Pack size"
                          value={
                            selectedChemical.packSize
                          }
                          step="0.001"
                          onChange={(
                            value,
                          ) =>
                            updateDraft(
                              "packSize",
                              value,
                            )
                          }
                        />

                        <Field label="Pack unit">
                          <select
                            value={
                              selectedChemical.packUnit
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraft(
                                "packUnit",
                                event.target
                                  .value as ChemicalUnit,
                              )
                            }
                            className={
                              inputClass
                            }
                          >
                            {chemicalUnits.map(
                              (unit) => (
                                <option
                                  key={unit}
                                  value={unit}
                                >
                                  {unit}
                                </option>
                              ),
                            )}
                          </select>
                        </Field>

                        <NumberField
                          label="Cost per pack (£)"
                          value={
                            selectedChemical.costPerPack
                          }
                          step="0.01"
                          onChange={(
                            value,
                          ) =>
                            updateDraft(
                              "costPerPack",
                              value,
                            )
                          }
                        />

                        <NumberField
                          label="Current stock (packs)"
                          value={
                            selectedChemical.currentStock
                          }
                          step="0.01"
                          onChange={(
                            value,
                          ) =>
                            updateDraft(
                              "currentStock",
                              value,
                            )
                          }
                        />

                        <NumberField
                          label="Reorder level (packs)"
                          value={
                            selectedChemical.reorderLevel
                          }
                          step="0.01"
                          onChange={(
                            value,
                          ) =>
                            updateDraft(
                              "reorderLevel",
                              value,
                            )
                          }
                        />

                        <ResultBox
                          label="Estimated stock value"
                          value={`£${(
                            selectedChemical.currentStock *
                            selectedChemical.costPerPack
                          ).toFixed(2)}`}
                          detail="Packs × cost per pack"
                        />
                      </div>
                    </Panel>
                  </section>

                  <section className="grid gap-4 lg:grid-cols-2">
                    <Panel>
                      <SectionHeading
                        title="Label application requirements"
                        description="Record the exact product dose and recommended carrier-water volume shown on the label."
                      />

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <NumberField
                          label="Application rate"
                          value={
                            selectedChemical.applicationRate
                          }
                          step="0.001"
                          onChange={(
                            value,
                          ) =>
                            updateDraft(
                              "applicationRate",
                              value,
                            )
                          }
                        />

                        <Field label="Rate unit">
                          <select
                            value={
                              selectedChemical.applicationRateUnit
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraft(
                                "applicationRateUnit",
                                event.target
                                  .value as ApplicationRateUnit,
                              )
                            }
                            className={
                              inputClass
                            }
                          >
                            {applicationRateUnits.map(
                              (unit) => (
                                <option
                                  key={unit}
                                  value={unit}
                                >
                                  {unit}
                                </option>
                              ),
                            )}
                          </select>
                        </Field>

                        <NumberField
                          label="Label water volume (L/ha)"
                          value={
                            selectedChemical.waterVolumePerHectare
                          }
                          step="0.1"
                          onChange={(
                            value,
                          ) =>
                            updateDraft(
                              "waterVolumePerHectare",
                              value,
                            )
                          }
                        />

                        <NumberField
                          label="Maximum annual applications"
                          value={
                            selectedChemical.maximumAnnualApplications
                          }
                          step="1"
                          onChange={(
                            value,
                          ) =>
                            updateDraft(
                              "maximumAnnualApplications",
                              value,
                            )
                          }
                        />

                        <NumberField
                          label="Maximum annual dose"
                          value={
                            selectedChemical.maximumAnnualDose
                          }
                          step="0.001"
                          onChange={(
                            value,
                          ) =>
                            updateDraft(
                              "maximumAnnualDose",
                              value,
                            )
                          }
                        />
                      </div>
                    </Panel>

                    <Panel>
                      <SectionHeading
                        title="Equipment and calibration"
                        description="Flow, walking speed and spray width determine the calibrated carrier-water volume."
                      />

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <Field label="Nozzle colour">
                          <input
                            value={
                              selectedChemical.nozzleColour
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraft(
                                "nozzleColour",
                                event.target
                                  .value,
                              )
                            }
                            placeholder="For example, Blue"
                            className={
                              inputClass
                            }
                          />
                        </Field>

                        <Field label="Nozzle type">
                          <input
                            value={
                              selectedChemical.nozzleType
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraft(
                                "nozzleType",
                                event.target
                                  .value,
                              )
                            }
                            placeholder="For example, Flat fan"
                            className={
                              inputClass
                            }
                          />
                        </Field>

                        <Field label="Knapsack make">
                          <input
                            value={
                              selectedChemical.knapsackMake
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraft(
                                "knapsackMake",
                                event.target
                                  .value,
                              )
                            }
                            className={
                              inputClass
                            }
                          />
                        </Field>

                        <Field label="Knapsack model">
                          <input
                            value={
                              selectedChemical.knapsackModel
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraft(
                                "knapsackModel",
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
                          label="Tank capacity (L)"
                          value={
                            selectedChemical.tankCapacityLitres
                          }
                          step="0.1"
                          onChange={(
                            value,
                          ) =>
                            updateDraft(
                              "tankCapacityLitres",
                              value,
                            )
                          }
                        />

                        <NumberField
                          label="Walking speed (km/h)"
                          value={
                            selectedChemical.walkingSpeedKph
                          }
                          step="0.1"
                          onChange={(
                            value,
                          ) =>
                            updateDraft(
                              "walkingSpeedKph",
                              value,
                            )
                          }
                        />

                        <NumberField
                          label="Flow rate (L/min)"
                          value={
                            selectedChemical.flowRateLitresPerMinute
                          }
                          step="0.01"
                          onChange={(
                            value,
                          ) =>
                            updateDraft(
                              "flowRateLitresPerMinute",
                              value,
                            )
                          }
                        />

                        <NumberField
                          label="Spray width (metres)"
                          value={
                            selectedChemical.sprayWidthMetres
                          }
                          step="0.01"
                          onChange={(
                            value,
                          ) =>
                            updateDraft(
                              "sprayWidthMetres",
                              value,
                            )
                          }
                        />

                        <NumberField
                          label="Pressure (bar)"
                          value={
                            selectedChemical.pressureBar
                          }
                          step="0.1"
                          onChange={(
                            value,
                          ) =>
                            updateDraft(
                              "pressureBar",
                              value,
                            )
                          }
                        />

                        <ResultBox
                          label="Current calibration"
                          value={
                            calculation
                              ? `${calculation.calibratedWaterVolumePerHectare.toFixed(
                                  2,
                                )} L/ha`
                              : "Not available"
                          }
                          detail={
                            calculation?.calibrationUsed
                              ? "Calculated from flow, speed and width"
                              : "Using saved label water volume"
                          }
                        />
                      </div>
                    </Panel>
                  </section>

                  <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
                    <Panel>
                      <SectionHeading
                        title="COSHH and safety"
                        description="Record PPE, handling notes and environmental precautions."
                      />

                      <div className="mt-5 space-y-4">
                        <Field label="PPE requirements">
                          <textarea
                            rows={3}
                            value={
                              selectedChemical.ppeRequirements
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraft(
                                "ppeRequirements",
                                event.target
                                  .value,
                              )
                            }
                            className={
                              inputClass
                            }
                          />
                        </Field>

                        <Field label="COSHH notes">
                          <textarea
                            rows={4}
                            value={
                              selectedChemical.coshhNotes
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraft(
                                "coshhNotes",
                                event.target
                                  .value,
                              )
                            }
                            className={
                              inputClass
                            }
                          />
                        </Field>

                        <Field label="Environmental warnings">
                          <textarea
                            rows={4}
                            value={
                              selectedChemical.environmentalWarnings
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraft(
                                "environmentalWarnings",
                                event.target
                                  .value,
                              )
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
                        title="Application calculator"
                        description="The chemical dose comes from the product rate. Carrier water comes from the calibration when valid calibration values are present."
                      />

                      <div className="mt-5">
                        <NumberField
                          label="Area to treat (m²)"
                          value={
                            calculatorArea
                          }
                          step="1"
                          onChange={
                            setCalculatorArea
                          }
                        />
                      </div>

                      {calculation ? (
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
                            label="Calibrated water volume"
                            value={`${calculation.calibratedWaterVolumePerHectare.toFixed(
                              2,
                            )} L/ha`}
                            detail={
                              calculation.calibrationUsed
                                ? "Flow ÷ speed ÷ spray width"
                                : "Saved label water volume"
                            }
                          />

                          <ResultBox
                            label="Water required"
                            value={`${calculation.waterRequiredLitres.toFixed(
                              3,
                            )} L`}
                            detail={`${calculatorArea.toLocaleString(
                              "en-GB",
                            )} m² treatment area`}
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
                            label="Estimated product cost"
                            value={`£${calculation.productCost.toFixed(
                              2,
                            )}`}
                            detail="Based on pack size and cost"
                          />

                          <ResultBox
                            label="Area in hectares"
                            value={`${(
                              calculatorArea /
                              10000
                            ).toFixed(
                              4,
                            )} ha`}
                            detail={`${calculatorArea.toLocaleString(
                              "en-GB",
                            )} m²`}
                          />
                        </div>
                      ) : (
                        <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                          Enter a valid
                          treatment area.
                        </div>
                      )}

                      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                        Always confirm the
                        approved product label,
                        equipment setup and
                        calibration before
                        mixing or applying a
                        product.
                      </div>
                    </Panel>
                  </section>

                  <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <button
                      type="button"
                      onClick={
                        removeChemical
                      }
                      className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      Delete permanently
                    </button>

                    <button
                      type="submit"
                      className="rounded-xl bg-[#176b37] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
                    >
                      Save all changes
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

function calculateDraftApplication(
  chemical: ChemicalRecord,
  areaSquareMetres: number,
): ApplicationCalculation {
  const safeArea = Math.max(
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
      Math.max(
        0,
        chemical.applicationRate,
      ) * areaHectares;
  } else {
    productRequired =
      Math.max(
        0,
        chemical.applicationRate,
      ) * safeArea;
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

    productCost:
      roundToTwoDecimals(
        productCost,
      ),

    calibrationUsed:
      hasValidCalibration,
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

function formatDateTime(
  value: string,
) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(new Date(value));
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
            ? "bg-red-500"
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

function ChemicalStatusBadge({
  active,
  lowStock,
}: {
  active: boolean;
  lowStock: boolean;
}) {
  const label = !active
    ? "Archived"
    : lowStock
      ? "Low stock"
      : "Active";

  const styles = !active
    ? "bg-slate-100 text-slate-600"
    : lowStock
      ? "bg-red-100 text-red-700"
      : "bg-green-100 text-green-800";

  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}
    >
      {label}
    </span>
  );
}