"use client";

import Link from "next/link";
import {
  type ReactNode,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { useChemicalStore } from "@/components/chemical-store";
import { useCustomerStore } from "@/components/customer-store";
import {
  type TreatmentRecord,
  useTreatmentStore,
} from "@/components/treatment-store";

type UsageRow = {
  treatmentId: string;
  date: string;
  customerNumber: string;
  customerName: string;
  treatmentName: string;
  chemicalId: string;
  chemicalName: string;
  chemicalType: string;
  applicationRate: number;
  applicationRateUnit: string;
  areaSquareMetres: number;
  productRequired: number;
  productUnit: string;
  waterRequiredLitres: number;
  tankFills: number;
  estimatedProductCost: number;
  invoiceNumber: string;
};

type ChemicalSummary = {
  chemicalId: string;
  chemicalName: string;
  chemicalType: string;
  applications: number;
  customers: number;
  totalAreaSquareMetres: number;
  totalProductBaseAmount: number;
  baseUnit: "g" | "ml" | "";
  displayAmount: number;
  displayUnit: "kg" | "g" | "L" | "ml" | "";
  totalWaterLitres: number;
  totalCost: number;
  currentStock: number | null;
  stockUnit: string;
  reorderLevel: number | null;
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

export default function ChemicalUsagePage() {
  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const {
    chemicals,
    ready: chemicalsReady,
  } = useChemicalStore();

  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const today =
    toDateValue(new Date());

  const currentYear =
    new Date().getFullYear();

  const [dateFrom, setDateFrom] =
    useState(`${currentYear}-01-01`);

  const [dateTo, setDateTo] =
    useState(today);

  const [chemicalId, setChemicalId] =
    useState("all");

  const [search, setSearch] =
    useState("");

  const [selectedRowId, setSelectedRowId] =
    useState("");

  const [message, setMessage] =
    useState("");

  const completedUsage =
    useMemo(
      () =>
        treatments.filter(
          (treatment) =>
            treatment.status ===
              "Completed" &&
            Boolean(
              treatment.chemicalName,
            ) &&
            treatment.productRequired >
              0,
        ),
      [treatments],
    );

  const usageRows =
    useMemo<UsageRow[]>(() => {
      const query =
        search.trim().toLowerCase();

      return completedUsage
        .filter((treatment) => {
          const date =
            getUsageDate(
              treatment,
            );

          const withinDateRange =
            (!dateFrom ||
              date >= dateFrom) &&
            (!dateTo ||
              date <= dateTo);

          const matchesChemical =
            chemicalId === "all" ||
            treatment.chemicalId ===
              chemicalId;

          const customer =
            customers.find(
              (item) =>
                item.customerNumber ===
                treatment.customerNumber,
            );

          const matchesSearch =
            !query ||
            [
              treatment.customerNumber,
              customer?.fullName ?? "",
              treatment.treatmentName,
              treatment.chemicalName,
              treatment.chemicalType,
              treatment.invoiceNumber,
              treatment.notes,
            ].some((value) =>
              value
                .toLowerCase()
                .includes(query),
            );

          return (
            withinDateRange &&
            matchesChemical &&
            matchesSearch
          );
        })
        .map((treatment) => {
          const customer =
            customers.find(
              (item) =>
                item.customerNumber ===
                treatment.customerNumber,
            );

          return {
            treatmentId:
              treatment.id,

            date:
              getUsageDate(
                treatment,
              ),

            customerNumber:
              treatment.customerNumber,

            customerName:
              customer?.fullName ??
              treatment.customerNumber,

            treatmentName:
              treatment.treatmentName,

            chemicalId:
              treatment.chemicalId,

            chemicalName:
              treatment.chemicalName,

            chemicalType:
              treatment.chemicalType,

            applicationRate:
              treatment.applicationRate,

            applicationRateUnit:
              treatment.applicationRateUnit,

            areaSquareMetres:
              treatment.treatmentAreaSquareMetres,

            productRequired:
              treatment.productRequired,

            productUnit:
              treatment.productUnit,

            waterRequiredLitres:
              treatment.waterRequiredLitres,

            tankFills:
              treatment.tankFills,

            estimatedProductCost:
              treatment.estimatedProductCost,

            invoiceNumber:
              treatment.invoiceNumber,
          };
        })
        .sort(
          (first, second) =>
            second.date.localeCompare(
              first.date,
            ),
        );
    }, [
      completedUsage,
      customers,
      dateFrom,
      dateTo,
      chemicalId,
      search,
    ]);

  const chemicalSummaries =
    useMemo<ChemicalSummary[]>(() => {
      const groups =
        new Map<
          string,
          UsageRow[]
        >();

      for (const row of usageRows) {
        const key =
          row.chemicalId ||
          row.chemicalName;

        const current =
          groups.get(key) ?? [];

        current.push(row);
        groups.set(key, current);
      }

      return Array.from(
        groups.entries(),
      )
        .map(
          ([key, rows]) => {
            const first =
              rows[0];

            const product =
              chemicals.find(
                (item) =>
                  item.id ===
                  first.chemicalId,
              );

            const baseUnit =
              getBaseUnit(
                first.productUnit,
              );

            const totalBaseAmount =
              rows.reduce(
                (total, row) =>
                  total +
                  convertToBaseUnit(
                    row.productRequired,
                    row.productUnit,
                  ),
                0,
              );

            const display =
              formatBaseAmount(
                totalBaseAmount,
                baseUnit,
              );

            return {
              chemicalId: key,

              chemicalName:
                first.chemicalName,

              chemicalType:
                first.chemicalType,

              applications:
                rows.length,

              customers:
                new Set(
                  rows.map(
                    (row) =>
                      row.customerNumber,
                  ),
                ).size,

              totalAreaSquareMetres:
                rows.reduce(
                  (total, row) =>
                    total +
                    row.areaSquareMetres,
                  0,
                ),

              totalProductBaseAmount:
                totalBaseAmount,

              baseUnit,

              displayAmount:
                display.amount,

              displayUnit:
                display.unit,

              totalWaterLitres:
                rows.reduce(
                  (total, row) =>
                    total +
                    row.waterRequiredLitres,
                  0,
                ),

              totalCost:
                rows.reduce(
                  (total, row) =>
                    total +
                    row.estimatedProductCost,
                  0,
                ),

              currentStock:
                product?.currentStock ??
                null,

              stockUnit:
                product
                  ? `pack${
                      product.currentStock ===
                      1
                        ? ""
                        : "s"
                    }`
                  : "",

              reorderLevel:
                product?.reorderLevel ??
                null,
            };
          },
        )
        .sort(
          (first, second) =>
            second.totalCost -
            first.totalCost,
        );
    }, [
      usageRows,
      chemicals,
    ]);

  const selectedRow =
    usageRows.find(
      (row) =>
        row.treatmentId ===
        selectedRowId,
    ) ??
    usageRows[0] ??
    null;

  const totalApplications =
    usageRows.length;

  const totalCustomers =
    new Set(
      usageRows.map(
        (row) =>
          row.customerNumber,
      ),
    ).size;

  const totalArea =
    usageRows.reduce(
      (total, row) =>
        total +
        row.areaSquareMetres,
      0,
    );

  const totalWater =
    usageRows.reduce(
      (total, row) =>
        total +
        row.waterRequiredLitres,
      0,
    );

  const totalCost =
    usageRows.reduce(
      (total, row) =>
        total +
        row.estimatedProductCost,
      0,
    );

  const ready =
    treatmentsReady &&
    chemicalsReady &&
    customersReady;

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading chemical usage...
          </div>
        </main>
      </AppShell>
    );
  }

  function exportCsv() {
    if (
      usageRows.length === 0
    ) {
      showMessage(
        "There are no filtered usage records to export.",
      );
      return;
    }

    const headers = [
      "Date",
      "Customer Number",
      "Customer",
      "Treatment",
      "Chemical",
      "Chemical Type",
      "Application Rate",
      "Application Rate Unit",
      "Area m2",
      "Product Required",
      "Product Unit",
      "Water Litres",
      "Tank Fills",
      "Estimated Product Cost",
      "Invoice Number",
    ];

    const rows =
      usageRows.map(
        (row) => [
          row.date,
          row.customerNumber,
          row.customerName,
          row.treatmentName,
          row.chemicalName,
          row.chemicalType,
          row.applicationRate,
          row.applicationRateUnit,
          row.areaSquareMetres,
          row.productRequired,
          row.productUnit,
          row.waterRequiredLitres,
          row.tankFills,
          row.estimatedProductCost,
          row.invoiceNumber,
        ],
      );

    const csv =
      [
        headers,
        ...rows,
      ]
        .map((row) =>
          row
            .map(csvValue)
            .join(","),
        )
        .join("\r\n");

    const blob =
      new Blob([csv], {
        type: "text/csv;charset=utf-8",
      });

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download =
      `greenflow-chemical-usage-${dateFrom || "start"}-${dateTo || "end"}.csv`;

    document.body.appendChild(
      anchor,
    );

    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);

    showMessage(
      `${usageRows.length} chemical usage record${
        usageRows.length === 1
          ? ""
          : "s"
      } exported.`,
    );
  }

  function resetFilters() {
    setDateFrom(
      `${currentYear}-01-01`,
    );

    setDateTo(today);
    setChemicalId("all");
    setSearch("");
    setSelectedRowId("");
  }

  function showMessage(
    text: string,
  ) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3500);
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1700px]">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-3xl font-bold">
                Chemical Usage
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Review chemical applications recorded
                through completed jobs. Usage,
                treatment area, water, cost and
                equipment details come directly from
                Treatment Records.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/chemicals"
                className="inline-flex h-11 items-center rounded-xl border border-[#338b45] bg-white px-5 text-sm font-semibold text-[#176b37] hover:bg-green-50"
              >
                Chemical Centre
              </Link>

              <button
                type="button"
                onClick={exportCsv}
                className="h-11 rounded-xl bg-[#176b37] px-5 text-sm font-semibold text-white hover:bg-[#125b2f]"
              >
                Export CSV
              </button>
            </div>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="Applications"
              value={String(
                totalApplications,
              )}
              detail="Completed chemical records"
            />

            <SummaryCard
              label="Customers"
              value={String(
                totalCustomers,
              )}
              detail="Unique customers"
            />

            <SummaryCard
              label="Treated area"
              value={`${totalArea.toLocaleString(
                "en-GB",
              )} m²`}
              detail="Filtered period"
            />

            <SummaryCard
              label="Water used"
              value={`${totalWater.toFixed(
                2,
              )} L`}
              detail="Recorded applications"
            />

            <SummaryCard
              label="Product cost"
              value={`£${totalCost.toFixed(
                2,
              )}`}
              detail="Estimated usage cost"
            />
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[170px_170px_260px_1fr_auto] xl:items-end">
              <Field label="From">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) =>
                    setDateFrom(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="To">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) =>
                    setDateTo(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Chemical">
                <select
                  value={chemicalId}
                  onChange={(event) =>
                    setChemicalId(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                >
                  <option value="all">
                    All chemicals
                  </option>

                  {chemicals
                    .slice()
                    .sort(
                      (first, second) =>
                        first.name.localeCompare(
                          second.name,
                        ),
                    )
                    .map(
                      (chemical) => (
                        <option
                          key={
                            chemical.id
                          }
                          value={
                            chemical.id
                          }
                        >
                          {chemical.name}
                        </option>
                      ),
                    )}
                </select>
              </Field>

              <Field label="Search usage">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Customer, treatment, product, invoice or notes"
                  className={inputClass}
                />
              </Field>

              <button
                type="button"
                onClick={resetFilters}
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-50"
              >
                Reset filters
              </button>
            </div>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h2 className="text-lg font-bold">
                  Product summary
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Totals are normalised before being
                  displayed, so grams and kilograms
                  or millilitres and litres are not
                  mixed incorrectly.
                </p>
              </div>

              <div className="grid grid-cols-[1.35fr_100px_125px_120px_110px_110px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                <span>Chemical</span>
                <span>Uses</span>
                <span>Area</span>
                <span>Product</span>
                <span>Water</span>
                <span>Cost</span>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {chemicalSummaries.length ===
                0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">
                    No completed chemical usage
                    matches the selected filters.
                  </div>
                ) : (
                  chemicalSummaries.map(
                    (summary) => (
                      <div
                        key={
                          summary.chemicalId
                        }
                        className="grid grid-cols-[1.35fr_100px_125px_120px_110px_110px] items-center gap-3 border-b border-slate-100 px-4 py-4 text-sm last:border-0"
                      >
                        <div>
                          <div className="font-bold">
                            {
                              summary.chemicalName
                            }
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {
                              summary.chemicalType
                            }{" "}
                            ·{" "}
                            {
                              summary.customers
                            }{" "}
                            customer
                            {summary.customers ===
                            1
                              ? ""
                              : "s"}
                          </div>

                          {summary.currentStock !==
                            null && (
                            <div className="mt-1 text-xs font-semibold text-slate-600">
                              Stock:{" "}
                              {
                                summary.currentStock
                              }{" "}
                              {
                                summary.stockUnit
                              }
                              {summary.reorderLevel !==
                                null &&
                              summary.currentStock <=
                                summary.reorderLevel
                                ? " · Reorder level reached"
                                : ""}
                            </div>
                          )}
                        </div>

                        <span className="font-semibold">
                          {
                            summary.applications
                          }
                        </span>

                        <span>
                          {summary.totalAreaSquareMetres.toLocaleString(
                            "en-GB",
                          )}{" "}
                          m²
                        </span>

                        <span className="font-semibold">
                          {summary.displayAmount.toFixed(
                            summary.displayAmount <
                              10
                              ? 3
                              : 2,
                          )}{" "}
                          {
                            summary.displayUnit
                          }
                        </span>

                        <span>
                          {summary.totalWaterLitres.toFixed(
                            2,
                          )}{" "}
                          L
                        </span>

                        <span className="font-semibold">
                          £
                          {summary.totalCost.toFixed(
                            2,
                          )}
                        </span>
                      </div>
                    ),
                  )
                )}
              </div>
            </article>

            <article className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {selectedRow ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">
                        Application detail
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Recorded values for one
                        completed treatment.
                      </p>
                    </div>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                      Completed
                    </span>
                  </div>

                  <div className="mt-5 space-y-4">
                    <InformationRow
                      label="Customer"
                      value={
                        selectedRow.customerName
                      }
                    />

                    <InformationRow
                      label="Treatment"
                      value={
                        selectedRow.treatmentName
                      }
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <InfoBox
                        label="Date"
                        value={formatDate(
                          selectedRow.date,
                        )}
                      />

                      <InfoBox
                        label="Area"
                        value={`${selectedRow.areaSquareMetres.toLocaleString(
                          "en-GB",
                        )} m²`}
                      />
                    </div>

                    <Section title="Product">
                      <DetailGrid>
                        <DetailItem
                          label="Chemical"
                          value={
                            selectedRow.chemicalName
                          }
                        />

                        <DetailItem
                          label="Type"
                          value={
                            selectedRow.chemicalType ||
                            "—"
                          }
                        />

                        <DetailItem
                          label="Application rate"
                          value={`${selectedRow.applicationRate} ${selectedRow.applicationRateUnit}`}
                        />

                        <DetailItem
                          label="Product required"
                          value={`${selectedRow.productRequired} ${selectedRow.productUnit}`}
                        />

                        <DetailItem
                          label="Estimated cost"
                          value={`£${selectedRow.estimatedProductCost.toFixed(
                            2,
                          )}`}
                        />

                        <DetailItem
                          label="Invoice"
                          value={
                            selectedRow.invoiceNumber ||
                            "Not recorded"
                          }
                        />
                      </DetailGrid>
                    </Section>

                    <Section title="Water and tank">
                      <DetailGrid>
                        <DetailItem
                          label="Water required"
                          value={`${selectedRow.waterRequiredLitres.toFixed(
                            3,
                          )} L`}
                        />

                        <DetailItem
                          label="Tank fills"
                          value={selectedRow.tankFills.toFixed(
                            3,
                          )}
                        />
                      </DetailGrid>
                    </Section>

                    <Link
                      href={`/customers/${selectedRow.customerNumber}`}
                      className="inline-flex rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                    >
                      Open customer
                    </Link>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-sm text-slate-500">
                  Select an application record.
                </div>
              )}
            </article>
          </section>

          <article className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h2 className="text-lg font-bold">
                Application records
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Every row is linked to a completed
                treatment record.
              </p>
            </div>

            <div className="grid grid-cols-[115px_1.15fr_1.15fr_1.15fr_120px_120px_100px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              <span>Date</span>
              <span>Customer</span>
              <span>Treatment</span>
              <span>Chemical</span>
              <span>Area</span>
              <span>Product</span>
              <span>Cost</span>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {usageRows.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-500">
                  No completed chemical usage
                  records found.
                </div>
              ) : (
                usageRows.map(
                  (row) => {
                    const selected =
                      selectedRow?.treatmentId ===
                      row.treatmentId;

                    return (
                      <button
                        key={
                          row.treatmentId
                        }
                        type="button"
                        onClick={() =>
                          setSelectedRowId(
                            row.treatmentId,
                          )
                        }
                        className={`grid w-full grid-cols-[115px_1.15fr_1.15fr_1.15fr_120px_120px_100px] items-center gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm transition last:border-0 ${
                          selected
                            ? "bg-green-50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <span>
                          {formatDate(
                            row.date,
                          )}
                        </span>

                        <div>
                          <div className="font-bold">
                            {
                              row.customerName
                            }
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {
                              row.customerNumber
                            }
                          </div>
                        </div>

                        <span className="font-semibold">
                          {
                            row.treatmentName
                          }
                        </span>

                        <div>
                          <div className="font-semibold">
                            {
                              row.chemicalName
                            }
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {
                              row.chemicalType
                            }
                          </div>
                        </div>

                        <span>
                          {row.areaSquareMetres.toLocaleString(
                            "en-GB",
                          )}{" "}
                          m²
                        </span>

                        <span>
                          {
                            row.productRequired
                          }{" "}
                          {row.productUnit}
                        </span>

                        <span className="font-semibold">
                          £
                          {row.estimatedProductCost.toFixed(
                            2,
                          )}
                        </span>
                      </button>
                    );
                  },
                )
              )}
            </div>
          </article>
        </div>
      </main>
    </AppShell>
  );
}

function getUsageDate(
  treatment: TreatmentRecord,
) {
  return (
    treatment.completedDate ||
    treatment.scheduledDate ||
    treatment.recordedDate.slice(
      0,
      10,
    )
  );
}

function getBaseUnit(
  unit: string,
): "g" | "ml" | "" {
  if (
    unit === "kg" ||
    unit === "g"
  ) {
    return "g";
  }

  if (
    unit === "L" ||
    unit === "ml"
  ) {
    return "ml";
  }

  return "";
}

function convertToBaseUnit(
  amount: number,
  unit: string,
) {
  if (
    unit === "kg" ||
    unit === "L"
  ) {
    return amount * 1000;
  }

  return amount;
}

function formatBaseAmount(
  baseAmount: number,
  baseUnit: "g" | "ml" | "",
): {
  amount: number;
  unit:
    | "kg"
    | "g"
    | "L"
    | "ml"
    | "";
} {
  if (
    baseUnit === "g"
  ) {
    return baseAmount >= 1000
      ? {
          amount:
            baseAmount / 1000,
          unit: "kg",
        }
      : {
          amount:
            baseAmount,
          unit: "g",
        };
  }

  if (
    baseUnit === "ml"
  ) {
    return baseAmount >= 1000
      ? {
          amount:
            baseAmount / 1000,
          unit: "L",
        }
      : {
          amount:
            baseAmount,
          unit: "ml",
        };
  }

  return {
    amount: baseAmount,
    unit: "",
  };
}

function csvValue(
  value:
    | string
    | number,
) {
  const text =
    String(value ?? "");

  return `"${text.replace(
    /"/g,
    '""',
  )}"`;
}

function parseDate(
  value: string,
) {
  const [year, month, day] =
    value
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day,
  );
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

function formatDate(
  value: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return "No date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(parseDate(value));
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
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 h-1.5 w-10 rounded-full bg-[#338b45]" />

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

function InformationRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-slate-200 pb-3">
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 font-bold">
        {value}
      </div>
    </div>
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 font-bold">
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-bold">
        {title}
      </h3>

      <div className="mt-3">
        {children}
      </div>
    </section>
  );
}

function DetailGrid({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {children}
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-sm font-semibold">
        {value}
      </div>
    </div>
  );
}