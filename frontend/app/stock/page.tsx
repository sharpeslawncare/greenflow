"use client";

import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import {
  type ChemicalRecord,
  type ChemicalStockMovementType,
  type ChemicalType,
  type ChemicalUnit,
  useChemicalStore,
} from "@/components/chemical-store";

type StockMetadata = Record<
  string,
  {
    supplier: string;
    preferredOrderQuantity: number;
  }
>;

type MovementForm = {
  chemicalId: string;
  type: ChemicalStockMovementType;
  quantity: string;
  date: string;
  reference: string;
  notes: string;
};

type ProductForm = {
  name: string;
  type: ChemicalType;
  packSize: string;
  packUnit: ChemicalUnit;
  openingStock: string;
  reorderLevel: string;
  preferredOrderQuantity: string;
  supplier: string;
};

const METADATA_STORAGE_KEY =
  "greenflow-stock-metadata-v2";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

export default function StockPage() {
  const {
    chemicals,
    stockMovements,
    ready,
    addChemical,
    updateChemical,
    recordStockMovement,
    clearStockMovements,
  } = useChemicalStore();

  const [selectedChemicalId, setSelectedChemicalId] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [
    metadata,
    setMetadata,
  ] = useState<StockMetadata>({});

  const [
    showMovementForm,
    setShowMovementForm,
  ] = useState(false);

  const [
    showProductForm,
    setShowProductForm,
  ] = useState(false);

  const [
    movementForm,
    setMovementForm,
  ] = useState<MovementForm>(() =>
    createMovementForm(""),
  );

  const [
    productForm,
    setProductForm,
  ] = useState<ProductForm>(
    createEmptyProductForm(),
  );

  useEffect(() => {
    const savedMetadata =
      window.localStorage.getItem(
        METADATA_STORAGE_KEY,
      );

    if (savedMetadata) {
      try {
        const parsed =
          JSON.parse(
            savedMetadata,
          ) as StockMetadata;

        if (
          parsed &&
          typeof parsed ===
            "object"
        ) {
          setMetadata(parsed);
        }
      } catch {
        window.localStorage.removeItem(
          METADATA_STORAGE_KEY,
        );
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      METADATA_STORAGE_KEY,
      JSON.stringify(metadata),
    );
  }, [metadata]);

  const activeChemicals =
    useMemo(
      () =>
        chemicals
          .filter(
            (chemical) =>
              chemical.active,
          )
          .sort((first, second) =>
            first.name.localeCompare(
              second.name,
            ),
          ),
      [chemicals],
    );

  useEffect(() => {
    if (
      !selectedChemicalId &&
      activeChemicals.length > 0
    ) {
      setSelectedChemicalId(
        activeChemicals[0].id,
      );
      setMovementForm(
        createMovementForm(
          activeChemicals[0].id,
        ),
      );
      return;
    }

    if (
      selectedChemicalId &&
      !activeChemicals.some(
        (chemical) =>
          chemical.id ===
          selectedChemicalId,
      )
    ) {
      const nextId =
        activeChemicals[0]?.id ??
        "";

      setSelectedChemicalId(
        nextId,
      );
      setMovementForm(
        createMovementForm(
          nextId,
        ),
      );
    }
  }, [
    activeChemicals,
    selectedChemicalId,
  ]);

  const filteredChemicals =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return activeChemicals;
      }

      return activeChemicals.filter(
        (chemical) => {
          const supplier =
            metadata[
              chemical.id
            ]?.supplier ?? "";

          return [
            chemical.name,
            chemical.type,
            chemical.manufacturer,
            supplier,
            `${chemical.packSize} ${chemical.packUnit}`,
          ].some((value) =>
            value
              .toLowerCase()
              .includes(query),
          );
        },
      );
    }, [
      activeChemicals,
      search,
      metadata,
    ]);

  const selectedChemical =
    activeChemicals.find(
      (chemical) =>
        chemical.id ===
        selectedChemicalId,
    ) ??
    activeChemicals[0] ??
    null;

  const selectedMetadata =
    selectedChemical
      ? metadata[
          selectedChemical.id
        ] ?? {
          supplier: "",
          preferredOrderQuantity:
            0,
        }
      : {
          supplier: "",
          preferredOrderQuantity:
            0,
        };

  const selectedMovements =
    useMemo(
      () =>
        stockMovements
          .filter(
            (movement) =>
              movement.chemicalId ===
              selectedChemicalId,
          )
          .sort((first, second) => {
            const dateCompare =
              second.date.localeCompare(
                first.date,
              );

            if (dateCompare !== 0) {
              return dateCompare;
            }

            return second.createdAt.localeCompare(
              first.createdAt,
            );
          }),
      [
        stockMovements,
        selectedChemicalId,
      ],
    );


  const reconciliation =
    useMemo(() => {
      return activeChemicals.map(
        (chemical) => {
          const latestSnapshot =
            stockMovements
              .filter(
                (movement) =>
                  movement.chemicalId ===
                    chemical.id &&
                  movement.balanceAfterPacks !==
                    undefined,
              )
              .sort(
                (first, second) =>
                  second.createdAt.localeCompare(
                    first.createdAt,
                  ),
              )[0];

          if (!latestSnapshot) {
            return {
              chemicalId:
                chemical.id,
              status:
                "No snapshot" as const,
              difference: 0,
              expected:
                null as number | null,
            };
          }

          const expected =
            latestSnapshot.balanceAfterPacks ??
            chemical.currentStock;

          const difference =
            roundToThreeDecimals(
              chemical.currentStock -
                expected,
            );

          return {
            chemicalId:
              chemical.id,
            status:
              Math.abs(difference) <=
              0.001
                ? ("Matched" as const)
                : ("Mismatch" as const),
            difference,
            expected,
          };
        },
      );
    }, [
      activeChemicals,
      stockMovements,
    ]);

  const reconciliationMismatches =
    reconciliation.filter(
      (item) =>
        item.status ===
        "Mismatch",
    );

  const selectedReconciliation =
    selectedChemical
      ? reconciliation.find(
          (item) =>
            item.chemicalId ===
            selectedChemical.id,
        ) ?? null
      : null;

  const lowStockChemicals =
    activeChemicals.filter(
      (chemical) =>
        chemical.currentStock <=
        chemical.reorderLevel,
    );

  const totalFertiliserPacks =
    activeChemicals
      .filter(
        (chemical) =>
          chemical.type ===
          "Fertiliser",
      )
      .reduce(
        (total, chemical) =>
          total +
          chemical.currentStock,
        0,
      );

  const totalPhysicalStock =
    activeChemicals.reduce(
      (total, chemical) =>
        total +
        chemical.currentStock *
          chemical.packSize,
      0,
    );

  function selectChemical(
    chemicalId: string,
  ) {
    setSelectedChemicalId(
      chemicalId,
    );

    setMovementForm(
      createMovementForm(
        chemicalId,
      ),
    );
  }

  function openMovementForm(
    type: ChemicalStockMovementType,
  ) {
    if (!selectedChemical) {
      return;
    }

    setMovementForm({
      ...createMovementForm(
        selectedChemical.id,
      ),
      type,
    });

    setShowMovementForm(true);
  }

  function saveMovement(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const chemical =
      chemicals.find(
        (item) =>
          item.id ===
          movementForm.chemicalId,
      );

    const quantity =
      Number(
        movementForm.quantity,
      );

    const invalidQuantity =
      !Number.isFinite(quantity) ||
      (movementForm.type ===
      "Adjustment"
        ? quantity < 0
        : quantity <= 0);

    if (
      !chemical ||
      invalidQuantity
    ) {
      showMessage(
        movementForm.type ===
          "Adjustment"
          ? "Choose a product and enter a stock count of zero or more pack-equivalents."
          : "Choose a product and enter a pack quantity greater than zero.",
      );
      return;
    }

    let nextStock =
      chemical.currentStock;

    if (
      movementForm.type ===
      "Delivery"
    ) {
      nextStock += quantity;
    } else if (
      movementForm.type ===
      "Usage"
    ) {
      if (
        quantity >
        chemical.currentStock +
          0.000001
      ) {
        showMessage(
          `Cannot record ${quantity.toFixed(
            3,
          )} pack equivalents of usage because only ${chemical.currentStock.toFixed(
            3,
          )} are available.`,
        );
        return;
      }

      nextStock -= quantity;
    } else {
      /*
       * Adjustment is an absolute stock count.
       * Example: enter 23 to set stock to 23 bags/pack equivalents.
       */
      nextStock = quantity;
    }

    const roundedStock =
      roundToThreeDecimals(
        Math.max(
          0,
          nextStock,
        ),
      );

    updateChemical({
      ...chemical,
      currentStock:
        roundedStock,
    });

    const movementQuantity =
      movementForm.type ===
      "Usage"
        ? -quantity
        : movementForm.type ===
            "Adjustment"
          ? roundedStock -
            chemical.currentStock
          : quantity;

    recordStockMovement({
      chemicalId:
        chemical.id,
      type:
        movementForm.type,
      packQuantity:
        roundToThreeDecimals(
          movementQuantity,
        ),
      physicalAmount:
        roundToThreeDecimals(
          movementQuantity *
            chemical.packSize,
        ),
      physicalUnit:
        chemical.packUnit,
      balanceAfterPacks:
        roundedStock,
      date:
        movementForm.date,
      reference:
        movementForm.reference.trim(),
      notes:
        movementForm.notes.trim(),
      source:
        "Stock Page",
    });

    setShowMovementForm(false);

    showMessage(
      movementForm.type ===
        "Delivery"
        ? "Delivery added to the live Chemical Store."
        : movementForm.type ===
            "Usage"
          ? "Manual usage deducted from the live Chemical Store."
          : "Live stock count adjusted.",
    );
  }

  function saveProduct(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !productForm.name.trim()
    ) {
      showMessage(
        "Enter a product name.",
      );
      return;
    }

    const packSize =
      Number(
        productForm.packSize,
      );

    const openingStock =
      Number(
        productForm.openingStock,
      );

    const reorderLevel =
      Number(
        productForm.reorderLevel,
      );

    if (
      !Number.isFinite(
        packSize,
      ) ||
      packSize <= 0
    ) {
      showMessage(
        "Enter a valid pack size.",
      );
      return;
    }

    const chemical =
      addChemical({
        name:
          productForm.name.trim(),
        type:
          productForm.type,
        packSize,
        packUnit:
          productForm.packUnit,
        currentStock:
          Math.max(
            0,
            Number.isFinite(
              openingStock,
            )
              ? openingStock
              : 0,
          ),
        reorderLevel:
          Math.max(
            0,
            Number.isFinite(
              reorderLevel,
            )
              ? reorderLevel
              : 0,
          ),
        active: true,
      });

    setMetadata(
      (current) => ({
        ...current,
        [chemical.id]: {
          supplier:
            productForm.supplier.trim(),
          preferredOrderQuantity:
            Math.max(
              0,
              Number(
                productForm.preferredOrderQuantity,
              ) || 0,
            ),
        },
      }),
    );

    if (
      chemical.currentStock > 0
    ) {
      recordStockMovement({
        chemicalId:
          chemical.id,
        type:
          "Adjustment",
        packQuantity:
          chemical.currentStock,
        physicalAmount:
          chemical.currentStock *
          chemical.packSize,
        physicalUnit:
          chemical.packUnit,
        balanceAfterPacks:
          chemical.currentStock,
        date:
          todayDate(),
        reference:
          "Opening stock",
        notes:
          "Opening pack-equivalent stock entered when product was created.",
        source:
          "Stock Page",
      });
    }

    setSelectedChemicalId(
      chemical.id,
    );
    setProductForm(
      createEmptyProductForm(),
    );
    setShowProductForm(false);

    showMessage(
      "Product added to the Chemical Store and Stock page.",
    );
  }

  function updateSelectedChemical(
    changes:
      Partial<ChemicalRecord>,
  ) {
    if (!selectedChemical) {
      return;
    }

    updateChemical({
      ...selectedChemical,
      ...changes,
    });
  }

  function updateSelectedMetadata(
    changes: Partial<
      StockMetadata[string]
    >,
  ) {
    if (!selectedChemical) {
      return;
    }

    setMetadata(
      (current) => ({
        ...current,
        [selectedChemical.id]: {
          ...selectedMetadata,
          ...changes,
        },
      }),
    );
  }

  function archiveSelectedProduct() {
    if (!selectedChemical) {
      return;
    }

    const confirmed =
      window.confirm(
        `Archive "${selectedChemical.name}"? Its movement history will be retained.`,
      );

    if (!confirmed) {
      return;
    }

    updateChemical({
      ...selectedChemical,
      active: false,
    });

    showMessage(
      "Product archived in the Chemical Store.",
    );
  }

  function clearLegacyStockData() {
    const confirmed =
      window.confirm(
        "Remove the old standalone Stock page data? This does not remove Chemical Store products or live stock quantities.",
      );

    if (!confirmed) {
      return;
    }

    window.localStorage.removeItem(
      "greenflow-stock-v1",
    );

    showMessage(
      "Old standalone stock data removed. Live stock remains in the Chemical Store.",
    );
  }

  function showMessage(
    text: string,
  ) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3200);
  }

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">
            Loading stock...
          </div>
        </main>
      </AppShell>
    );
  }

  const stockPercentage =
    selectedChemical &&
    selectedChemical.reorderLevel >
      0
      ? Math.min(
          100,
          (selectedChemical.currentStock /
            Math.max(
              selectedChemical.reorderLevel *
                2,
              1,
            )) *
            100,
        )
      : 100;

  const productIsLow =
    Boolean(
      selectedChemical &&
        selectedChemical.currentStock <=
          selectedChemical.reorderLevel,
    );

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1600px]">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-3xl font-bold">
                Stock & Purchasing
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Live stock now comes directly from the Chemical Store. Current stock and reorder levels are pack-equivalents; treatment usage remains calculated in kg, litres, g or ml.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  clearLegacyStockData
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
              >
                Clear old stock data
              </button>

              <button
                type="button"
                onClick={() => {
                  const confirmed =
                    window.confirm(
                      "Clear the shared stock movement history? Live stock balances will not change.",
                    );

                  if (!confirmed) {
                    return;
                  }

                  clearStockMovements();
                  showMessage(
                    "Stock movement history cleared. Live stock balances were not changed.",
                  );
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
              >
                Clear movement history
              </button>

              <button
                type="button"
                onClick={() => {
                  setProductForm(
                    createEmptyProductForm(),
                  );
                  setShowProductForm(
                    true,
                  );
                }}
                className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
              >
                + Add product
              </button>
            </div>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            <strong>
              One live stock balance:
            </strong>{" "}
            changing stock here updates the same Chemical Store used by Visit Centre. A value of 23 for a 25 kg bag means 23 pack-equivalents = 575 kg available.
          </div>


          {reconciliationMismatches.length >
            0 && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
              <strong>
                Stock reconciliation warning:
              </strong>{" "}
              {reconciliationMismatches.length} product
              {reconciliationMismatches.length ===
              1
                ? ""
                : "s"}{" "}
              currently differ from the latest saved audit
              balance. Select the affected product and use
              <strong> Set stock count </strong>
              to reconcile it. GreenFlow will record the
              correction as a new movement.
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Active products"
              value={String(
                activeChemicals.length,
              )}
            />

            <SummaryCard
              label="Low stock"
              value={String(
                lowStockChemicals.length,
              )}
              warning={
                lowStockChemicals.length >
                0
              }
            />

            <SummaryCard
              label="Fertiliser pack-equivalents"
              value={formatNumber(
                totalFertiliserPacks,
                2,
              )}
            />

            <SummaryCard
              label="Stock integrity"
              value={
                reconciliationMismatches.length ===
                0
                  ? "Matched"
                  : `${reconciliationMismatches.length} issue${
                      reconciliationMismatches.length ===
                      1
                        ? ""
                        : "s"
                    }`
              }
              subtext={
                reconciliationMismatches.length ===
                0
                  ? "Live balances agree with latest audit snapshots"
                  : "Review mismatched products before further testing"
              }
              warning={
                reconciliationMismatches.length >
                0
              }
            />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">
            <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search stock..."
                  className={inputClass}
                />
              </div>

              <div className="max-h-[720px] overflow-y-auto">
                {filteredChemicals.length ===
                0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No products match your search.
                  </div>
                ) : (
                  filteredChemicals.map(
                    (chemical) => {
                      const low =
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
                              chemical.id,
                            )
                          }
                          className={`w-full border-b border-slate-100 px-4 py-4 text-left transition last:border-0 ${
                            selectedChemical?.id ===
                            chemical.id
                              ? "bg-green-50"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-bold text-slate-900">
                                {
                                  chemical.name
                                }
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {
                                  chemical.type
                                }{" "}
                                ·{" "}
                                {
                                  chemical.packSize
                                }{" "}
                                {
                                  chemical.packUnit
                                }{" "}
                                per pack
                              </div>
                            </div>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                low
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {formatNumber(
                                chemical.currentStock,
                                2,
                              )}{" "}
                              packs
                            </span>
                          </div>
                        </button>
                      );
                    },
                  )
                )}
              </div>
            </aside>

            {selectedChemical ? (
              <div className="space-y-5">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#176b37]">
                        Live Chemical Store
                      </div>

                      <h2 className="mt-1 text-2xl font-bold">
                        {
                          selectedChemical.name
                        }
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {
                          selectedChemical.type
                        }{" "}
                        ·{" "}
                        {
                          selectedChemical.packSize
                        }{" "}
                        {
                          selectedChemical.packUnit
                        }{" "}
                        per pack
                        {selectedMetadata.supplier
                          ? ` · ${selectedMetadata.supplier}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openMovementForm(
                            "Delivery",
                          )
                        }
                        className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
                      >
                        Add delivery
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openMovementForm(
                            "Usage",
                          )
                        }
                        className="rounded-xl border border-[#338b45] px-4 py-2.5 text-sm font-semibold text-[#176b37] hover:bg-green-50"
                      >
                        Record manual usage
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openMovementForm(
                            "Adjustment",
                          )
                        }
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                      >
                        Set stock count
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StockDetail
                      label="Current stock"
                      value={`${formatNumber(
                        selectedChemical.currentStock,
                        3,
                      )} pack equivalents`}
                      warning={
                        productIsLow
                      }
                    />

                    <StockDetail
                      label="Physical amount"
                      value={`${formatNumber(
                        selectedChemical.currentStock *
                          selectedChemical.packSize,
                        3,
                      )} ${
                        selectedChemical.packUnit
                      }`}
                    />

                    <StockDetail
                      label="Reorder level"
                      value={`${formatNumber(
                        selectedChemical.reorderLevel,
                        3,
                      )} pack equivalents`}
                    />

                    <StockDetail
                      label="Preferred order"
                      value={`${formatNumber(
                        selectedMetadata.preferredOrderQuantity,
                        2,
                      )} packs`}
                    />
                  </div>

                  <div
                    className={`mt-5 rounded-xl border p-4 text-sm ${
                      selectedReconciliation?.status ===
                      "Mismatch"
                        ? "border-red-200 bg-red-50 text-red-900"
                        : selectedReconciliation?.status ===
                            "Matched"
                          ? "border-green-200 bg-green-50 text-green-900"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="font-bold">
                      Stock reconciliation
                    </div>

                    {selectedReconciliation?.status ===
                    "Matched" ? (
                      <div className="mt-1">
                        Live stock matches the latest
                        movement-history balance snapshot.
                      </div>
                    ) : selectedReconciliation?.status ===
                      "Mismatch" ? (
                      <div className="mt-1">
                        Live stock is{" "}
                        {formatNumber(
                          Math.abs(
                            selectedReconciliation.difference,
                          ),
                          3,
                        )}{" "}
                        pack-equivalents{" "}
                        {selectedReconciliation.difference >
                        0
                          ? "higher"
                          : "lower"}{" "}
                        than the latest audit snapshot.
                        Use <strong>Set stock count</strong>{" "}
                        to reconcile the balance and create
                        a new audit entry.
                      </div>
                    ) : (
                      <div className="mt-1">
                        No balance snapshot exists yet for
                        this product. The next delivery,
                        usage entry, stock count or Visit
                        Centre deduction will create one.
                      </div>
                    )}
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-semibold">
                        Stock level indicator
                      </span>

                      <span
                        className={
                          productIsLow
                            ? "font-bold text-red-700"
                            : "text-slate-500"
                        }
                      >
                        {productIsLow
                          ? "Order soon"
                          : "Stock available"}
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          productIsLow
                            ? "bg-red-500"
                            : "bg-[#338b45]"
                        }`}
                        style={{
                          width: `${Math.max(
                            3,
                            stockPercentage,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </article>

                <section className="grid gap-5 lg:grid-cols-2">
                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-bold">
                      Stock settings
                    </h2>

                    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                      <strong>Audit protected:</strong>{" "}
                      live stock quantities cannot be typed
                      over directly. All quantity changes
                      must go through a stock movement so the
                      balance and history stay in sync.
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Field label="Current stock (pack equivalents)">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <div className="font-bold text-slate-900">
                            {formatNumber(
                              selectedChemical.currentStock,
                              3,
                            )}
                          </div>

                          <div className="mt-1 text-xs leading-5 text-slate-500">
                            Live stock is read-only here. Use
                            Add delivery, Record manual usage
                            or Stock count so every quantity
                            change is written to the audit
                            trail.
                          </div>
                        </div>
                      </Field>

                      <Field label="Reorder level (pack equivalents)">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={
                            selectedChemical.reorderLevel
                          }
                          onChange={(event) =>
                            updateSelectedChemical(
                              {
                                reorderLevel:
                                  Math.max(
                                    0,
                                    Number(
                                      event
                                        .target
                                        .value,
                                    ) ||
                                      0,
                                  ),
                              },
                            )
                          }
                          className={
                            inputClass
                          }
                        />
                      </Field>

                      <Field label="Pack size">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={
                            selectedChemical.packSize
                          }
                          onChange={(event) =>
                            updateSelectedChemical(
                              {
                                packSize:
                                  Math.max(
                                    0.001,
                                    Number(
                                      event
                                        .target
                                        .value,
                                    ) ||
                                      0.001,
                                  ),
                              },
                            )
                          }
                          className={
                            inputClass
                          }
                        />
                      </Field>

                      <Field label="Pack unit">
                        <select
                          value={
                            selectedChemical.packUnit
                          }
                          onChange={(event) =>
                            updateSelectedChemical(
                              {
                                packUnit:
                                  event
                                    .target
                                    .value as ChemicalUnit,
                              },
                            )
                          }
                          className={
                            inputClass
                          }
                        >
                          <option value="kg">
                            kg
                          </option>
                          <option value="g">
                            g
                          </option>
                          <option value="L">
                            L
                          </option>
                          <option value="ml">
                            ml
                          </option>
                        </select>
                      </Field>

                      <Field label="Preferred order quantity (packs)">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={
                            selectedMetadata.preferredOrderQuantity
                          }
                          onChange={(event) =>
                            updateSelectedMetadata(
                              {
                                preferredOrderQuantity:
                                  Math.max(
                                    0,
                                    Number(
                                      event
                                        .target
                                        .value,
                                    ) ||
                                      0,
                                  ),
                              },
                            )
                          }
                          className={
                            inputClass
                          }
                        />
                      </Field>

                      <Field label="Supplier">
                        <input
                          value={
                            selectedMetadata.supplier
                          }
                          onChange={(event) =>
                            updateSelectedMetadata(
                              {
                                supplier:
                                  event
                                    .target
                                    .value,
                              },
                            )
                          }
                          className={
                            inputClass
                          }
                        />
                      </Field>
                    </div>

                    <button
                      type="button"
                      onClick={
                        archiveSelectedProduct
                      }
                      className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      Archive product
                    </button>
                  </article>

                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-bold">
                      Suggested purchase
                    </h2>

                    {productIsLow ? (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                        <div className="font-bold text-red-800">
                          Reorder recommended
                        </div>

                        <p className="mt-2 text-sm text-red-800">
                          Stock is at or below the configured pack-equivalent reorder level.
                        </p>

                        <div className="mt-4 text-3xl font-bold text-red-900">
                          {formatNumber(
                            selectedMetadata.preferredOrderQuantity,
                            2,
                          )}{" "}
                          packs
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                        <div className="font-bold text-green-800">
                          No immediate order required
                        </div>

                        <p className="mt-2 text-sm text-green-800">
                          Live Chemical Store stock is currently above the reorder level.
                        </p>
                      </div>
                    )}
                  </article>
                </section>

                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-lg font-bold">
                      Stock movement history
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      This is the shared stock audit trail. Visit Centre deductions appear automatically alongside deliveries, manual usage and stock-count adjustments. New movements also record the live balance immediately after the change.
                    </p>
                  </div>

                  {selectedMovements.length ===
                  0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      No stock movements recorded.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {selectedMovements.map(
                        (movement) => (
                          <div
                            key={
                              movement.id
                            }
                            className="grid gap-2 px-5 py-4 text-sm md:grid-cols-[110px_110px_120px_1fr]"
                          >
                            <div>
                              {formatDate(
                                movement.date,
                              )}
                            </div>

                            <div className="font-semibold">
                              {
                                movement.type
                              }
                            </div>

                            <div
                              className={
                                movement.packQuantity <
                                0
                                  ? "font-bold text-red-700"
                                  : "font-bold text-green-700"
                              }
                            >
                              {movement.packQuantity >
                              0
                                ? "+"
                                : ""}
                              {formatNumber(
                                movement.packQuantity,
                                3,
                              )}{" "}
                              packs
                            </div>

                            <div className="text-slate-600">
                              <div>
                                {movement.reference ||
                                  movement.notes ||
                                  "—"}
                              </div>
                              <div className="mt-1 text-xs text-slate-400">
                                {formatNumber(
                                  movement.physicalAmount,
                                  3,
                                )}{" "}
                                {movement.physicalUnit}
                                {" · "}
                                {movement.source}
                                {movement.balanceAfterPacks !==
                                undefined
                                  ? ` · Balance after: ${formatNumber(
                                      movement.balanceAfterPacks,
                                      3,
                                    )} packs`
                                  : ""}
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </article>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                No active Chemical Store products are available.
              </div>
            )}
          </section>
        </div>

        {showMovementForm &&
          selectedChemical && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
              <form
                onSubmit={
                  saveMovement
                }
                className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
              >
                <div className="border-b border-slate-200 px-6 py-5">
                  <h2 className="text-xl font-bold">
                    {
                      movementForm.type
                    }
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {movementForm.type ===
                    "Adjustment"
                      ? "Enter the new absolute stock count in pack-equivalents. Zero is allowed."
                      : "Enter the number of pack-equivalents to add or remove."}
                  </p>
                </div>

                <div className="grid gap-4 p-6">
                  <Field label="Product">
                    <select
                      value={
                        movementForm.chemicalId
                      }
                      onChange={(event) =>
                        setMovementForm(
                          {
                            ...movementForm,
                            chemicalId:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                      className={
                        inputClass
                      }
                    >
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
                            {
                              chemical.name
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field
                    label={
                      movementForm.type ===
                      "Adjustment"
                        ? "New stock count (pack equivalents)"
                        : "Quantity (pack equivalents)"
                    }
                  >
                    <input
                      type="number"
                      min={
                        movementForm.type ===
                        "Adjustment"
                          ? "0"
                          : "0.001"
                      }
                      step="0.001"
                      value={
                        movementForm.quantity
                      }
                      onChange={(event) =>
                        setMovementForm(
                          {
                            ...movementForm,
                            quantity:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Date">
                    <input
                      type="date"
                      value={
                        movementForm.date
                      }
                      onChange={(event) =>
                        setMovementForm(
                          {
                            ...movementForm,
                            date:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Reference">
                    <input
                      value={
                        movementForm.reference
                      }
                      onChange={(event) =>
                        setMovementForm(
                          {
                            ...movementForm,
                            reference:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Notes">
                    <textarea
                      value={
                        movementForm.notes
                      }
                      onChange={(event) =>
                        setMovementForm(
                          {
                            ...movementForm,
                            notes:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                      rows={3}
                      className={
                        inputClass
                      }
                    />
                  </Field>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
                  <button
                    type="button"
                    onClick={() =>
                      setShowMovementForm(
                        false,
                      )
                    }
                    className="rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="rounded-xl bg-[#176b37] px-5 py-3 font-semibold text-white hover:bg-[#125b2f]"
                  >
                    Save movement
                  </button>
                </div>
              </form>
            </div>
          )}

        {showProductForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
            <form
              onSubmit={saveProduct}
              className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-xl font-bold">
                  Add stock product
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  This creates the product directly in the Chemical Store.
                </p>
              </div>

              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <Field label="Product name">
                  <input
                    value={
                      productForm.name
                    }
                    onChange={(event) =>
                      setProductForm(
                        {
                          ...productForm,
                          name:
                            event
                              .target
                              .value,
                        },
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
                      productForm.type
                    }
                    onChange={(event) =>
                      setProductForm(
                        {
                          ...productForm,
                          type:
                            event
                              .target
                              .value as ChemicalType,
                        },
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="Fertiliser">
                      Fertiliser
                    </option>
                    <option value="Herbicide">
                      Herbicide
                    </option>
                    <option value="Moss Control">
                      Moss Control
                    </option>
                    <option value="Wetting Agent">
                      Wetting Agent
                    </option>
                    <option value="Biostimulant">
                      Biostimulant
                    </option>
                    <option value="Seed">
                      Seed
                    </option>
                    <option value="Other">
                      Other
                    </option>
                  </select>
                </Field>

                <Field label="Pack size">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={
                      productForm.packSize
                    }
                    onChange={(event) =>
                      setProductForm(
                        {
                          ...productForm,
                          packSize:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                    placeholder="25"
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Pack unit">
                  <select
                    value={
                      productForm.packUnit
                    }
                    onChange={(event) =>
                      setProductForm(
                        {
                          ...productForm,
                          packUnit:
                            event
                              .target
                              .value as ChemicalUnit,
                        },
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="kg">
                      kg
                    </option>
                    <option value="g">
                      g
                    </option>
                    <option value="L">
                      L
                    </option>
                    <option value="ml">
                      ml
                    </option>
                  </select>
                </Field>

                <Field label="Opening stock (pack equivalents)">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={
                      productForm.openingStock
                    }
                    onChange={(event) =>
                      setProductForm(
                        {
                          ...productForm,
                          openingStock:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Reorder level (pack equivalents)">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={
                      productForm.reorderLevel
                    }
                    onChange={(event) =>
                      setProductForm(
                        {
                          ...productForm,
                          reorderLevel:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Preferred order quantity (packs)">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={
                      productForm.preferredOrderQuantity
                    }
                    onChange={(event) =>
                      setProductForm(
                        {
                          ...productForm,
                          preferredOrderQuantity:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Supplier">
                  <input
                    value={
                      productForm.supplier
                    }
                    onChange={(event) =>
                      setProductForm(
                        {
                          ...productForm,
                          supplier:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
                <button
                  type="button"
                  onClick={() =>
                    setShowProductForm(
                      false,
                    )
                  }
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-[#176b37] px-5 py-3 font-semibold text-white hover:bg-[#125b2f]"
                >
                  Save product
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </AppShell>
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

function SummaryCard({
  label,
  value,
  subtext = "",
  warning = false,
}: {
  label: string;
  value: string;
  subtext?: string;
  warning?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        warning
          ? "border-red-200"
          : "border-slate-200"
      }`}
    >
      <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div
        className={`mt-2 text-2xl font-bold ${
          warning
            ? "text-red-700"
            : "text-slate-950"
        }`}
      >
        {value}
      </div>

      {subtext && (
        <div className="mt-1 text-xs text-slate-500">
          {subtext}
        </div>
      )}
    </article>
  );
}

function StockDetail({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        warning
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div
        className={`mt-1 font-bold ${
          warning
            ? "text-red-800"
            : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function createMovementForm(
  chemicalId: string,
): MovementForm {
  return {
    chemicalId,
    type: "Delivery",
    quantity: "",
    date: todayDate(),
    reference: "",
    notes: "",
  };
}

function createEmptyProductForm(): ProductForm {
  return {
    name: "",
    type: "Fertiliser",
    packSize: "",
    packUnit: "kg",
    openingStock: "",
    reorderLevel: "",
    preferredOrderQuantity: "",
    supplier: "",
  };
}

function todayDate() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      now.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(
  value: string,
) {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return new Date(
    year,
    month - 1,
    day,
  ).toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function formatNumber(
  value: number,
  decimals = 2,
) {
  return value.toLocaleString(
    "en-GB",
    {
      minimumFractionDigits:
        0,
      maximumFractionDigits:
        decimals,
    },
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