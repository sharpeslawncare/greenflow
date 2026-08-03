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

type ProductCategory =
  | "Fertiliser"
  | "Herbicide"
  | "Moss Control"
  | "Seed"
  | "Other";

type StockUnit =
  | "bags"
  | "litres"
  | "kilograms"
  | "containers";

type StockProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  unit: StockUnit;
  currentQuantity: number;
  reorderLevel: number;
  preferredOrderQuantity: number;
  supplier: string;
  packDescription: string;
  active: boolean;
};

type StockMovementType =
  | "Delivery"
  | "Usage"
  | "Adjustment";

type StockMovement = {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  date: string;
  reference: string;
  notes: string;
};

type StockData = {
  products: StockProduct[];
  movements: StockMovement[];
};

type MovementForm = {
  productId: string;
  type: StockMovementType;
  quantity: string;
  date: string;
  reference: string;
  notes: string;
};

type ProductForm = {
  name: string;
  category: ProductCategory;
  unit: StockUnit;
  openingQuantity: string;
  reorderLevel: string;
  preferredOrderQuantity: string;
  supplier: string;
  packDescription: string;
};

const STORAGE_KEY = "greenflow-stock-v1";

const defaultData: StockData = {
  products: [
    {
      id: "proturf-spring",
      name: "ProTurf Spring",
      category: "Fertiliser",
      unit: "bags",
      currentQuantity: 18,
      reorderLevel: 8,
      preferredOrderQuantity: 40,
      supplier: "Demo Supplier",
      packDescription: "25 kg bag",
      active: true,
    },
    {
      id: "proturf-summer",
      name: "ProTurf Summer",
      category: "Fertiliser",
      unit: "bags",
      currentQuantity: 5,
      reorderLevel: 8,
      preferredOrderQuantity: 40,
      supplier: "Demo Supplier",
      packDescription: "25 kg bag",
      active: true,
    },
    {
      id: "pastor-pro",
      name: "Pastor Pro",
      category: "Herbicide",
      unit: "litres",
      currentQuantity: 6.8,
      reorderLevel: 3,
      preferredOrderQuantity: 10,
      supplier: "Demo Supplier",
      packDescription: "5 litre container",
      active: true,
    },
    {
      id: "moss-control",
      name: "Moss Control",
      category: "Moss Control",
      unit: "litres",
      currentQuantity: 2.2,
      reorderLevel: 3,
      preferredOrderQuantity: 10,
      supplier: "Demo Supplier",
      packDescription: "5 litre container",
      active: true,
    },
  ],
  movements: [
    {
      id: "movement-1",
      productId: "proturf-spring",
      type: "Delivery",
      quantity: 40,
      date: "2028-03-20",
      reference: "Spring cycle order",
      notes: "Bulk purchase before spring treatment cycle.",
    },
    {
      id: "movement-2",
      productId: "proturf-spring",
      type: "Usage",
      quantity: -22,
      date: "2028-04-14",
      reference: "Spring treatment cycle",
      notes: "Total bags used to date.",
    },
    {
      id: "movement-3",
      productId: "pastor-pro",
      type: "Delivery",
      quantity: 10,
      date: "2028-03-20",
      reference: "Spring chemical order",
      notes: "",
    },
    {
      id: "movement-4",
      productId: "pastor-pro",
      type: "Usage",
      quantity: -3.2,
      date: "2028-04-14",
      reference: "Spring treatment cycle",
      notes: "Recorded herbicide usage.",
    },
  ],
};

export default function StockPage() {
  const [data, setData] =
    useState<StockData>(defaultData);

  const [selectedProductId, setSelectedProductId] =
    useState(defaultData.products[0].id);

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const [showMovementForm, setShowMovementForm] =
    useState(false);

  const [showProductForm, setShowProductForm] =
    useState(false);

  const [movementForm, setMovementForm] =
    useState<MovementForm>(() =>
      createMovementForm(
        defaultData.products[0].id,
      ),
    );

  const [productForm, setProductForm] =
    useState<ProductForm>(
      createEmptyProductForm(),
    );

  useEffect(() => {
    const saved = window.localStorage.getItem(
      STORAGE_KEY,
    );

    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as StockData;

      if (
        Array.isArray(parsed.products) &&
        Array.isArray(parsed.movements)
      ) {
        setData(parsed);

        if (parsed.products.length > 0) {
          setSelectedProductId(
            parsed.products[0].id,
          );
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data),
    );
  }, [data]);

  const activeProducts = useMemo(
    () =>
      data.products.filter(
        (product) => product.active,
      ),
    [data.products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return activeProducts;

    return activeProducts.filter((product) =>
      [
        product.name,
        product.category,
        product.supplier,
        product.packDescription,
      ].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [activeProducts, search]);

  const selectedProduct =
    data.products.find(
      (product) =>
        product.id === selectedProductId,
    ) ?? data.products[0];

  const selectedMovements = useMemo(
    () =>
      data.movements
        .filter(
          (movement) =>
            movement.productId ===
            selectedProductId,
        )
        .sort(
          (first, second) =>
            new Date(second.date).getTime() -
            new Date(first.date).getTime(),
        ),
    [data.movements, selectedProductId],
  );

  const lowStockProducts = activeProducts.filter(
    (product) =>
      product.currentQuantity <=
      product.reorderLevel,
  );

  const totalFertiliserBags =
    activeProducts
      .filter(
        (product) =>
          product.category === "Fertiliser" &&
          product.unit === "bags",
      )
      .reduce(
        (total, product) =>
          total + product.currentQuantity,
        0,
      );

  const totalChemicalLitres =
    activeProducts
      .filter(
        (product) =>
          product.unit === "litres",
      )
      .reduce(
        (total, product) =>
          total + product.currentQuantity,
        0,
      );

  function selectProduct(productId: string) {
    setSelectedProductId(productId);
  }

  function openMovementForm(
    type: StockMovementType,
  ) {
    setMovementForm({
      ...createMovementForm(
        selectedProductId,
      ),
      type,
    });

    setShowMovementForm(true);
  }

  function saveMovement(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const quantityEntered =
      Number(movementForm.quantity);

    if (
      !movementForm.productId ||
      !Number.isFinite(quantityEntered) ||
      quantityEntered <= 0
    ) {
      showMessage(
        "Select a product and enter a quantity greater than zero.",
      );
      return;
    }

    const signedQuantity =
      movementForm.type === "Usage"
        ? -Math.abs(quantityEntered)
        : quantityEntered;

    const movement: StockMovement = {
      id: `movement-${Date.now()}`,
      productId: movementForm.productId,
      type: movementForm.type,
      quantity: signedQuantity,
      date: movementForm.date,
      reference:
        movementForm.reference.trim(),
      notes: movementForm.notes.trim(),
    };

    setData((current) => ({
      products: current.products.map(
        (product) =>
          product.id === movement.productId
            ? {
                ...product,
                currentQuantity: Math.max(
                  0,
                  product.currentQuantity +
                    signedQuantity,
                ),
              }
            : product,
      ),
      movements: [
        movement,
        ...current.movements,
      ],
    }));

    setSelectedProductId(
      movement.productId,
    );

    setShowMovementForm(false);

    showMessage(
      movement.type === "Delivery"
        ? "Delivery added to stock."
        : movement.type === "Usage"
          ? "Product usage recorded."
          : "Stock adjustment recorded.",
    );
  }

  function saveProduct(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!productForm.name.trim()) {
      showMessage(
        "Enter a product name.",
      );
      return;
    }

    const product: StockProduct = {
      id: createProductId(
        productForm.name,
      ),
      name: productForm.name.trim(),
      category: productForm.category,
      unit: productForm.unit,
      currentQuantity:
        Number(productForm.openingQuantity) ||
        0,
      reorderLevel:
        Number(productForm.reorderLevel) ||
        0,
      preferredOrderQuantity:
        Number(
          productForm.preferredOrderQuantity,
        ) || 0,
      supplier:
        productForm.supplier.trim(),
      packDescription:
        productForm.packDescription.trim(),
      active: true,
    };

    const duplicate = data.products.some(
      (existingProduct) =>
        existingProduct.id === product.id,
    );

    if (duplicate) {
      showMessage(
        "A product with this name already exists.",
      );
      return;
    }

    const openingMovement:
      | StockMovement
      | undefined =
      product.currentQuantity > 0
        ? {
            id: `movement-${Date.now()}`,
            productId: product.id,
            type: "Adjustment",
            quantity:
              product.currentQuantity,
            date: todayDate(),
            reference: "Opening stock",
            notes:
              "Opening stock entered when product was created.",
          }
        : undefined;

    setData((current) => ({
      products: [
        ...current.products,
        product,
      ],
      movements: openingMovement
        ? [
            openingMovement,
            ...current.movements,
          ]
        : current.movements,
    }));

    setSelectedProductId(product.id);
    setProductForm(
      createEmptyProductForm(),
    );
    setShowProductForm(false);

    showMessage("New stock product added.");
  }

  function updateSelectedProduct<
    K extends keyof StockProduct,
  >(
    field: K,
    value: StockProduct[K],
  ) {
    if (!selectedProduct) return;

    setData((current) => ({
      ...current,
      products: current.products.map(
        (product) =>
          product.id === selectedProduct.id
            ? {
                ...product,
                [field]: value,
              }
            : product,
      ),
    }));
  }

  function archiveSelectedProduct() {
    if (!selectedProduct) return;

    const confirmed = window.confirm(
      `Archive "${selectedProduct.name}"? Its stock history will remain available in the saved data.`,
    );

    if (!confirmed) return;

    setData((current) => ({
      ...current,
      products: current.products.map(
        (product) =>
          product.id === selectedProduct.id
            ? {
                ...product,
                active: false,
              }
            : product,
      ),
    }));

    const nextProduct =
      activeProducts.find(
        (product) =>
          product.id !==
          selectedProduct.id,
      );

    if (nextProduct) {
      setSelectedProductId(nextProduct.id);
    }

    showMessage("Product archived.");
  }

  function restoreDemoData() {
    const confirmed = window.confirm(
      "Restore the original Demo 2028 stock data? Current browser stock records will be removed.",
    );

    if (!confirmed) return;

    setData(defaultData);
    setSelectedProductId(
      defaultData.products[0].id,
    );
    window.localStorage.removeItem(
      STORAGE_KEY,
    );

    showMessage("Demo stock data restored.");
  }

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 2800);
  }

  if (!selectedProduct) {
    return null;
  }

  const stockPercentage =
    selectedProduct.reorderLevel > 0
      ? Math.min(
          100,
          (selectedProduct.currentQuantity /
            Math.max(
              selectedProduct.reorderLevel *
                2,
              1,
            )) *
            100,
        )
      : 100;

  const productIsLow =
    selectedProduct.currentQuantity <=
    selectedProduct.reorderLevel;

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

              <p className="mt-1 text-sm text-slate-500">
                Track fertiliser, chemicals,
                deliveries and daily usage.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={restoreDemoData}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
              >
                Restore demo data
              </button>

              <button
                type="button"
                onClick={() => {
                  setProductForm(
                    createEmptyProductForm(),
                  );
                  setShowProductForm(true);
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

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Active stock products"
              value={String(
                activeProducts.length,
              )}
              detail="Fertilisers and chemicals"
            />

            <SummaryCard
              label="Fertiliser available"
              value={`${formatNumber(
                totalFertiliserBags,
                1,
              )} bags`}
              detail="Across active fertilisers"
            />

            <SummaryCard
              label="Liquid products"
              value={`${formatNumber(
                totalChemicalLitres,
                1,
              )} litres`}
              detail="Current combined quantity"
            />

            <SummaryCard
              label="Reorder alerts"
              value={String(
                lowStockProducts.length,
              )}
              detail={
                lowStockProducts.length === 0
                  ? "No products require attention"
                  : "At or below reorder level"
              }
              warning={
                lowStockProducts.length > 0
              }
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
                  placeholder="Product, category or supplier"
                  className={inputClass}
                />
              </Field>

              <div className="mt-4 max-h-[63vh] space-y-2 overflow-y-auto pr-1">
                {filteredProducts.map(
                  (product) => {
                    const isSelected =
                      product.id ===
                      selectedProductId;

                    const isLow =
                      product.currentQuantity <=
                      product.reorderLevel;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() =>
                          selectProduct(
                            product.id,
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
                              {product.name}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {
                                product.category
                              }{" "}
                              ·{" "}
                              {
                                product.packDescription
                              }
                            </div>
                          </div>

                          {isLow && (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                              Low
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex items-end justify-between">
                          <div>
                            <div className="text-2xl font-bold">
                              {formatNumber(
                                product.currentQuantity,
                                2,
                              )}
                            </div>

                            <div className="text-xs text-slate-500">
                              {product.unit}
                            </div>
                          </div>

                          <div className="text-right text-xs text-slate-500">
                            Reorder at
                            <div className="font-bold text-slate-700">
                              {formatNumber(
                                product.reorderLevel,
                                2,
                              )}{" "}
                              {product.unit}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            </aside>

            <section className="min-w-0 space-y-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold">
                        {selectedProduct.name}
                      </h2>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {
                          selectedProduct.category
                        }
                      </span>

                      {productIsLow && (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                          Reorder recommended
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {
                        selectedProduct.packDescription
                      }{" "}
                      · Supplier:{" "}
                      {selectedProduct.supplier ||
                        "Not recorded"}
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
                      Record usage
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
                      Adjustment
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StockDetail
                    label="Current stock"
                    value={`${formatNumber(
                      selectedProduct.currentQuantity,
                      2,
                    )} ${
                      selectedProduct.unit
                    }`}
                    warning={productIsLow}
                  />

                  <StockDetail
                    label="Reorder level"
                    value={`${formatNumber(
                      selectedProduct.reorderLevel,
                      2,
                    )} ${
                      selectedProduct.unit
                    }`}
                  />

                  <StockDetail
                    label="Preferred order"
                    value={`${formatNumber(
                      selectedProduct.preferredOrderQuantity,
                      2,
                    )} ${
                      selectedProduct.unit
                    }`}
                  />

                  <StockDetail
                    label="Supplier"
                    value={
                      selectedProduct.supplier ||
                      "Not recorded"
                    }
                  />
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

              <article className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-bold">
                    Stock settings
                  </h2>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Reorder level">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={
                          selectedProduct.reorderLevel
                        }
                        onChange={(event) =>
                          updateSelectedProduct(
                            "reorderLevel",
                            Number(
                              event.target.value,
                            ) || 0,
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Preferred order quantity">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={
                          selectedProduct.preferredOrderQuantity
                        }
                        onChange={(event) =>
                          updateSelectedProduct(
                            "preferredOrderQuantity",
                            Number(
                              event.target.value,
                            ) || 0,
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Supplier">
                      <input
                        value={
                          selectedProduct.supplier
                        }
                        onChange={(event) =>
                          updateSelectedProduct(
                            "supplier",
                            event.target.value,
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Pack description">
                      <input
                        value={
                          selectedProduct.packDescription
                        }
                        onChange={(event) =>
                          updateSelectedProduct(
                            "packDescription",
                            event.target.value,
                          )
                        }
                        className={inputClass}
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
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-bold">
                    Suggested purchase
                  </h2>

                  {productIsLow ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                      <div className="font-bold text-red-800">
                        Reorder recommended
                      </div>

                      <p className="mt-2 text-sm text-red-800">
                        Current stock is at or
                        below the configured
                        reorder level.
                      </p>

                      <div className="mt-4 text-3xl font-bold text-red-900">
                        {formatNumber(
                          selectedProduct.preferredOrderQuantity,
                          2,
                        )}{" "}
                        {
                          selectedProduct.unit
                        }
                      </div>

                      <div className="mt-1 text-sm text-red-700">
                        Suggested order from{" "}
                        {selectedProduct.supplier ||
                          "your supplier"}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                      <div className="font-bold text-green-800">
                        No immediate order
                        required
                      </div>

                      <p className="mt-2 text-sm text-green-800">
                        The product is currently
                        above its reorder level.
                      </p>
                    </div>
                  )}
                </div>
              </article>

              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <div>
                    <h2 className="text-lg font-bold">
                      Stock movement history
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Deliveries, usage and manual
                      adjustments.
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                    {
                      selectedMovements.length
                    }{" "}
                    records
                  </span>
                </div>

                <div className="max-h-[35vh] overflow-y-auto">
                  <div className="grid grid-cols-[120px_130px_120px_1fr_1.4fr] gap-3 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <span>Date</span>
                    <span>Type</span>
                    <span>Quantity</span>
                    <span>Reference</span>
                    <span>Notes</span>
                  </div>

                  {selectedMovements.length ===
                  0 ? (
                    <div className="p-10 text-center text-slate-500">
                      No stock movements have
                      been recorded.
                    </div>
                  ) : (
                    selectedMovements.map(
                      (movement) => (
                        <div
                          key={movement.id}
                          className="grid grid-cols-[120px_130px_120px_1fr_1.4fr] gap-3 border-t border-slate-100 px-5 py-3 text-sm"
                        >
                          <span className="text-slate-600">
                            {formatDate(
                              movement.date,
                            )}
                          </span>

                          <MovementBadge
                            type={
                              movement.type
                            }
                          />

                          <span
                            className={`font-bold ${
                              movement.quantity <
                              0
                                ? "text-red-700"
                                : "text-green-700"
                            }`}
                          >
                            {movement.quantity >
                            0
                              ? "+"
                              : ""}
                            {formatNumber(
                              movement.quantity,
                              2,
                            )}{" "}
                            {
                              selectedProduct.unit
                            }
                          </span>

                          <span className="font-semibold">
                            {movement.reference ||
                              "No reference"}
                          </span>

                          <span className="text-slate-600">
                            {movement.notes ||
                              "—"}
                          </span>
                        </div>
                      ),
                    )
                  )}
                </div>
              </article>
            </section>
          </section>
        </div>
      </main>

      {showMovementForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={saveMovement}
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
          >
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-2xl font-bold">
                {movementForm.type ===
                "Delivery"
                  ? "Add stock delivery"
                  : movementForm.type ===
                      "Usage"
                    ? "Record product usage"
                    : "Adjust stock"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                The stock balance will update
                automatically.
              </p>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <Field label="Product">
                <select
                  value={
                    movementForm.productId
                  }
                  onChange={(event) =>
                    setMovementForm({
                      ...movementForm,
                      productId:
                        event.target.value,
                    })
                  }
                  className={inputClass}
                >
                  {activeProducts.map(
                    (product) => (
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.name}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Movement type">
                <select
                  value={movementForm.type}
                  onChange={(event) =>
                    setMovementForm({
                      ...movementForm,
                      type: event.target
                        .value as StockMovementType,
                    })
                  }
                  className={inputClass}
                >
                  <option value="Delivery">
                    Delivery
                  </option>

                  <option value="Usage">
                    Usage
                  </option>

                  <option value="Adjustment">
                    Positive adjustment
                  </option>
                </select>
              </Field>

              <Field label="Quantity">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    movementForm.quantity
                  }
                  onChange={(event) =>
                    setMovementForm({
                      ...movementForm,
                      quantity:
                        event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Date">
                <input
                  type="date"
                  value={movementForm.date}
                  onChange={(event) =>
                    setMovementForm({
                      ...movementForm,
                      date: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Reference">
                  <input
                    value={
                      movementForm.reference
                    }
                    onChange={(event) =>
                      setMovementForm({
                        ...movementForm,
                        reference:
                          event.target.value,
                      })
                    }
                    placeholder="For example, Summer cycle delivery"
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Notes">
                  <textarea
                    rows={4}
                    value={movementForm.notes}
                    onChange={(event) =>
                      setMovementForm({
                        ...movementForm,
                        notes:
                          event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                type="button"
                onClick={() =>
                  setShowMovementForm(false)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={saveProduct}
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-2xl font-bold">
                Add stock product
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add fertiliser, chemical,
                seed or another stock item.
              </p>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <Field label="Product name">
                <input
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      name: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Category">
                <select
                  value={
                    productForm.category
                  }
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      category:
                        event.target
                          .value as ProductCategory,
                    })
                  }
                  className={inputClass}
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

                  <option value="Seed">
                    Seed
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </Field>

              <Field label="Stock unit">
                <select
                  value={productForm.unit}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      unit: event.target
                        .value as StockUnit,
                    })
                  }
                  className={inputClass}
                >
                  <option value="bags">
                    Bags
                  </option>

                  <option value="litres">
                    Litres
                  </option>

                  <option value="kilograms">
                    Kilograms
                  </option>

                  <option value="containers">
                    Containers
                  </option>
                </select>
              </Field>

              <Field label="Opening quantity">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    productForm.openingQuantity
                  }
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      openingQuantity:
                        event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Reorder level">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    productForm.reorderLevel
                  }
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      reorderLevel:
                        event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Preferred order quantity">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    productForm.preferredOrderQuantity
                  }
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      preferredOrderQuantity:
                        event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Supplier">
                <input
                  value={
                    productForm.supplier
                  }
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      supplier:
                        event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Pack description">
                <input
                  value={
                    productForm.packDescription
                  }
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      packDescription:
                        event.target.value,
                    })
                  }
                  placeholder="For example, 25 kg bag"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                type="button"
                onClick={() =>
                  setShowProductForm(false)
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
    </AppShell>
  );
}

function createMovementForm(
  productId: string,
): MovementForm {
  return {
    productId,
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
    category: "Fertiliser",
    unit: "bags",
    openingQuantity: "",
    reorderLevel: "",
    preferredOrderQuantity: "",
    supplier: "",
    packDescription: "",
  };
}

function createProductId(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function todayDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    now.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(
    new Date(year, month - 1, day),
  );
}

function formatNumber(
  value: number,
  decimals: number,
) {
  return value.toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const inputClass =
  "w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

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
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div
        className={`mt-1 font-bold ${
          warning
            ? "text-red-700"
            : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function MovementBadge({
  type,
}: {
  type: StockMovementType;
}) {
  const styles =
    type === "Delivery"
      ? "bg-green-100 text-green-800"
      : type === "Usage"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-800";

  return (
    <span
      className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${styles}`}
    >
      {type}
    </span>
  );
}