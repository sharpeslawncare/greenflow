"use client";

import Link from "next/link";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";

type ProductLabel = {
  productName: string;
  manufacturer: string;
  approvalNumber: string;
  activeIngredients: string;
  applicationRateLitresPerHectare: number;
  minimumWaterLitresPerHectare: number;
  maximumWaterLitresPerHectare: number;
  maximumApplicationsPerYear: number;
  minimumIntervalDays: number;
  purpose: string;
  restrictions: string;
  labelRevision: string;
};

type SprayerSetup = {
  setupName: string;
  manufacturer: string;
  model: string;
  tankCapacityLitres: number;
  nozzleColour: string;
  nozzleType: string;
  nozzleModel: string;
  nozzleWidthMetres: number;
  measuredFlowLitresPerMinute: number;
  walkingSpeedKph: number;
  pressureBar: number;
  calibrationDate: string;
};

type ChemicalCentreData = {
  product: ProductLabel;
  sprayer: SprayerSetup;
  treatmentAreaSquareMetres: number;
};

type TankRow = {
  fillNumber: number;
  waterLitres: number;
  chemicalMillilitres: number;
  areaSquareMetres: number;
  fullTank: boolean;
};

const STORAGE_KEY = "greenflow-chemical-centre-v2";

const defaultData: ChemicalCentreData = {
  product: {
    productName: "Demo Selective Herbicide",
    manufacturer: "Demo Manufacturer",
    approvalNumber: "Enter verified approval number",
    activeIngredients:  "Enter each active ingredient and concentration exactly as shown on the label",
    applicationRateLitresPerHectare: 2,
    minimumWaterLitresPerHectare: 200,
    maximumWaterLitresPerHectare: 400,
    maximumApplicationsPerYear: 2,
    minimumIntervalDays: 42,
    purpose: "Selective control of broad-leaved weeds",
    restrictions:
      "Demo information only. Replace every value with the current approved product label before use.",
    labelRevision: "Not recorded",
  },
  sprayer: {
    setupName: "Main herbicide knapsack",
    manufacturer: "Enter manufacturer",
    model: "Enter model",
    tankCapacityLitres: 15,
    nozzleColour: "Blue",
    nozzleType: "Flat fan",
    nozzleModel: "Enter nozzle model",
    nozzleWidthMetres: 1,
    measuredFlowLitresPerMinute: 1.5,
    walkingSpeedKph: 4.5,
    pressureBar: 2,
    calibrationDate: "2028-03-12",
  },
  treatmentAreaSquareMetres: 5420,
};

export default function ChemicalCentrePage() {
  const [data, setData] =
    useState<ChemicalCentreData>(defaultData);

  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    try {
      const parsed = JSON.parse(
        saved,
      ) as ChemicalCentreData;

      if (
        parsed.product &&
        parsed.sprayer &&
        typeof parsed.treatmentAreaSquareMetres ===
          "number"
      ) {
        setData(parsed);
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

  const calculations = useMemo(
    () => calculateApplication(data),
    [data],
  );

  function updateProduct<K extends keyof ProductLabel>(
    field: K,
    value: ProductLabel[K],
  ) {
    setData((current) => ({
      ...current,
      product: {
        ...current.product,
        [field]: value,
      },
    }));
  }

  function updateSprayer<K extends keyof SprayerSetup>(
    field: K,
    value: SprayerSetup[K],
  ) {
    setData((current) => ({
      ...current,
      sprayer: {
        ...current.sprayer,
        [field]: value,
      },
    }));
  }

  function restoreDemoData() {
    const confirmed = window.confirm(
      "Restore the demonstration product and calibration values?",
    );

    if (!confirmed) return;

    setData(defaultData);
    window.localStorage.removeItem(STORAGE_KEY);
    showMessage("Demo chemical information restored.");
  }

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 2800);
  }

  const waterRateIsValid =
    calculations.calibratedWaterLitresPerHectare >=
      data.product.minimumWaterLitresPerHectare &&
    calculations.calibratedWaterLitresPerHectare <=
      data.product.maximumWaterLitresPerHectare;

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
                Chemical Centre
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Product-label records, sprayer calibration
                and accurate job mixing calculations.
              </p>
            </div>

            <button
              type="button"
              onClick={restoreDemoData}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
            >
              Restore demo values
            </button>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <strong>Important:</strong> the figures supplied
            here are demonstration values only. Enter and
            verify all information against the current
            authorised product label and your measured
            equipment calibration before relying on any
            result.
          </div>

          <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
            <aside className="space-y-4">
              <ProductLabelPanel
                product={data.product}
                updateProduct={updateProduct}
              />

              <SprayerPanel
                sprayer={data.sprayer}
                updateSprayer={updateSprayer}
              />
            </aside>

            <section className="space-y-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#176b37]">
                      Job calculator
                    </p>

                    <h2 className="mt-1 text-xl font-bold">
                      Application requirements
                    </h2>
                  </div>

                  <Field label="Area to spray (m²)">
                    <input
                      type="number"
                      min="0"
                      value={
                        data.treatmentAreaSquareMetres
                      }
                      onChange={(event) =>
                        setData((current) => ({
                          ...current,
                          treatmentAreaSquareMetres:
                            Number(
                              event.target.value,
                            ) || 0,
                        }))
                      }
                      className="w-48 rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-[#338b45] focus:ring-4 focus:ring-green-100"
                    />
                  </Field>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <ResultCard
                    label="Area in hectares"
                    value={`${formatNumber(
                      calculations.areaHectares,
                      4,
                    )} ha`}
                    detail={`${data.treatmentAreaSquareMetres.toLocaleString(
                      "en-GB",
                    )} m²`}
                  />

                  <ResultCard
                    label="Chemical required"
                    value={formatChemical(
                      calculations.totalChemicalLitres,
                    )}
                    detail={`${formatNumber(
                      data.product
                        .applicationRateLitresPerHectare,
                      3,
                    )} L/ha label rate`}
                    warning
                  />

                  <ResultCard
                    label="Water required"
                    value={`${formatNumber(
                      calculations.totalWaterLitres,
                      1,
                    )} L`}
                    detail={`${formatNumber(
                      calculations.calibratedWaterLitresPerHectare,
                      1,
                    )} L/ha calibrated output`}
                  />

                  <ResultCard
                    label="Tank fills"
                    value={String(
                      calculations.tankRows.length,
                    )}
                    detail={`${formatNumber(
                      data.sprayer
                        .tankCapacityLitres,
                      1,
                    )} L tank capacity`}
                  />
                </div>
              </article>

              <article
                className={`rounded-2xl border p-5 shadow-sm ${
                  waterRateIsValid
                    ? "border-green-200 bg-green-50"
                    : "border-red-300 bg-red-50"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2
                      className={`text-lg font-bold ${
                        waterRateIsValid
                          ? "text-green-900"
                          : "text-red-900"
                      }`}
                    >
                      Calibration check
                    </h2>

                    <p
                      className={`mt-2 text-sm ${
                        waterRateIsValid
                          ? "text-green-800"
                          : "text-red-800"
                      }`}
                    >
                      {waterRateIsValid
                        ? "The calculated water volume is within the entered product-label range."
                        : "The calculated water volume falls outside the entered product-label range. Review walking speed, nozzle output, width or label details."}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-4 py-2 text-sm font-bold ${
                      waterRateIsValid
                        ? "bg-green-200 text-green-900"
                        : "bg-red-200 text-red-900"
                    }`}
                  >
                    {waterRateIsValid
                      ? "Within label range"
                      : "Check calibration"}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <CalibrationResult
                    label="Calculated water rate"
                    value={`${formatNumber(
                      calculations.calibratedWaterLitresPerHectare,
                      1,
                    )} L/ha`}
                  />

                  <CalibrationResult
                    label="Label water range"
                    value={`${formatNumber(
                      data.product
                        .minimumWaterLitresPerHectare,
                      0,
                    )}–${formatNumber(
                      data.product
                        .maximumWaterLitresPerHectare,
                      0,
                    )} L/ha`}
                  />

                  <CalibrationResult
                    label="Measured nozzle output"
                    value={`${formatNumber(
                      data.sprayer
                        .measuredFlowLitresPerMinute,
                      2,
                    )} L/min`}
                  />

                  <CalibrationResult
                    label="Walking speed"
                    value={`${formatNumber(
                      data.sprayer.walkingSpeedKph,
                      2,
                    )} km/h`}
                  />
                </div>
              </article>

              <section className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-bold">
                    Equipment snapshot
                  </h2>

                  <div className="mt-4 space-y-3">
                    <SummaryRow
                      label="Sprayer"
                      value={data.sprayer.setupName}
                    />

                    <SummaryRow
                      label="Make and model"
                      value={`${data.sprayer.manufacturer} ${data.sprayer.model}`}
                    />

                    <SummaryRow
                      label="Tank"
                      value={`${formatNumber(
                        data.sprayer
                          .tankCapacityLitres,
                        1,
                      )} L`}
                    />

                    <SummaryRow
                      label="Nozzle"
                      value={`${data.sprayer.nozzleColour} · ${data.sprayer.nozzleType}`}
                    />

                    <SummaryRow
                      label="Nozzle model"
                      value={data.sprayer.nozzleModel}
                    />

                    <SummaryRow
                      label="Pressure"
                      value={`${formatNumber(
                        data.sprayer.pressureBar,
                        2,
                      )} bar`}
                    />

                    <SummaryRow
                      label="Calibration date"
                      value={formatDate(
                        data.sprayer
                          .calibrationDate,
                      )}
                    />
                  </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-bold">
                    Product-label snapshot
                  </h2>

                  <div className="mt-4 space-y-3">
                    <SummaryRow
                      label="Product"
                      value={data.product.productName}
                    />

                    <SummaryRow
                      label="Manufacturer"
                      value={data.product.manufacturer}
                    />

                    <SummaryRow
                      label="Approval number"
                      value={
                        data.product.approvalNumber
                      }
                    />

                    <SummaryRow
                    label="Active ingredients"
                    value={
                    data.product.activeIngredients ||
                    "Not recorded"
                        }
                    />
                    <SummaryRow
                      label="Application rate"
                      value={`${formatNumber(
                        data.product
                          .applicationRateLitresPerHectare,
                        3,
                      )} L/ha`}
                    />

                    <SummaryRow
                      label="Maximum applications"
                      value={`${data.product.maximumApplicationsPerYear} per year`}
                    />

                    <SummaryRow
                      label="Minimum interval"
                      value={`${data.product.minimumIntervalDays} days`}
                    />

                    <SummaryRow
                      label="Label revision"
                      value={data.product.labelRevision}
                    />
                  </div>
                </article>
              </section>

              <TankGuide
                rows={calculations.tankRows}
                tankCapacity={
                  data.sprayer.tankCapacityLitres
                }
              />

              <article className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
                <h2 className="text-lg font-bold text-red-900">
                  Recorded restrictions and notes
                </h2>

                <p className="mt-3 text-sm leading-6 text-red-900">
                  {data.product.restrictions ||
                    "No restrictions have been entered."}
                </p>

                <div className="mt-4 rounded-xl bg-white/60 p-4 text-sm text-red-900">
                  <strong>Purpose:</strong>{" "}
                  {data.product.purpose ||
                    "Not recorded"}
                </div>
              </article>
            </section>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function ProductLabelPanel({
  product,
  updateProduct,
}: {
  product: ProductLabel;
  updateProduct: <K extends keyof ProductLabel>(
    field: K,
    value: ProductLabel[K],
  ) => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">
        Product-label requirements
      </h2>

      <p className="mt-1 text-xs text-slate-500">
        Record the information exactly as shown on
        the current authorised label.
      </p>

      <div className="mt-5 space-y-4">
        <Field label="Product name">
          <input
            value={product.productName}
            onChange={(event) =>
              updateProduct(
                "productName",
                event.target.value,
              )
            }
            className={inputClass}
          />
        </Field>

        <Field label="Manufacturer">
          <input
            value={product.manufacturer}
            onChange={(event) =>
              updateProduct(
                "manufacturer",
                event.target.value,
              )
            }
            className={inputClass}
          />
        </Field>

        <Field label="Active ingredients and concentrations">
  <textarea
    rows={3}
    value={product.activeIngredients}
    onChange={(event) =>
      updateProduct(
        "activeIngredients",
        event.target.value,
      )
    }
    placeholder="For example: Active ingredient name — 200 g/L"
    className={inputClass}
  />
</Field>

        <NumberField
          label="Application rate (litres per hectare)"
          value={
            product.applicationRateLitresPerHectare
          }
          step={0.001}
          onChange={(value) =>
            updateProduct(
              "applicationRateLitresPerHectare",
              value,
            )
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Minimum water (L/ha)"
            value={
              product.minimumWaterLitresPerHectare
            }
            step={1}
            onChange={(value) =>
              updateProduct(
                "minimumWaterLitresPerHectare",
                value,
              )
            }
          />

          <NumberField
            label="Maximum water (L/ha)"
            value={
              product.maximumWaterLitresPerHectare
            }
            step={1}
            onChange={(value) =>
              updateProduct(
                "maximumWaterLitresPerHectare",
                value,
              )
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Max applications/year"
            value={
              product.maximumApplicationsPerYear
            }
            step={1}
            onChange={(value) =>
              updateProduct(
                "maximumApplicationsPerYear",
                value,
              )
            }
          />

          <NumberField
            label="Minimum interval (days)"
            value={product.minimumIntervalDays}
            step={1}
            onChange={(value) =>
              updateProduct(
                "minimumIntervalDays",
                value,
              )
            }
          />
        </div>

        <Field label="Treatment purpose / target weeds">
          <textarea
            rows={3}
            value={product.purpose}
            onChange={(event) =>
              updateProduct(
                "purpose",
                event.target.value,
              )
            }
            className={inputClass}
          />
        </Field>

        <Field label="Restrictions and label notes">
          <textarea
            rows={4}
            value={product.restrictions}
            onChange={(event) =>
              updateProduct(
                "restrictions",
                event.target.value,
              )
            }
            className={inputClass}
          />
        </Field>

        <Field label="Label revision / date checked">
          <input
            value={product.labelRevision}
            onChange={(event) =>
              updateProduct(
                "labelRevision",
                event.target.value,
              )
            }
            className={inputClass}
          />
        </Field>
      </div>
    </article>
  );
}

function SprayerPanel({
  sprayer,
  updateSprayer,
}: {
  sprayer: SprayerSetup;
  updateSprayer: <K extends keyof SprayerSetup>(
    field: K,
    value: SprayerSetup[K],
  ) => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">
        Knapsack and nozzle calibration
      </h2>

      <div className="mt-5 space-y-4">
        <Field label="Setup name">
          <input
            value={sprayer.setupName}
            onChange={(event) =>
              updateSprayer(
                "setupName",
                event.target.value,
              )
            }
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Manufacturer">
            <input
              value={sprayer.manufacturer}
              onChange={(event) =>
                updateSprayer(
                  "manufacturer",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="Model">
            <input
              value={sprayer.model}
              onChange={(event) =>
                updateSprayer(
                  "model",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>
        </div>

        <NumberField
          label="Tank capacity (litres)"
          value={sprayer.tankCapacityLitres}
          step={0.1}
          onChange={(value) =>
            updateSprayer(
              "tankCapacityLitres",
              value,
            )
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nozzle colour">
            <input
              value={sprayer.nozzleColour}
              onChange={(event) =>
                updateSprayer(
                  "nozzleColour",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="Nozzle type">
            <input
              value={sprayer.nozzleType}
              onChange={(event) =>
                updateSprayer(
                  "nozzleType",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Nozzle manufacturer / model">
          <input
            value={sprayer.nozzleModel}
            onChange={(event) =>
              updateSprayer(
                "nozzleModel",
                event.target.value,
              )
            }
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Measured flow (L/min)"
            value={
              sprayer.measuredFlowLitresPerMinute
            }
            step={0.01}
            onChange={(value) =>
              updateSprayer(
                "measuredFlowLitresPerMinute",
                value,
              )
            }
          />

          <NumberField
            label="Pressure (bar)"
            value={sprayer.pressureBar}
            step={0.1}
            onChange={(value) =>
              updateSprayer(
                "pressureBar",
                value,
              )
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Spray width (metres)"
            value={sprayer.nozzleWidthMetres}
            step={0.01}
            onChange={(value) =>
              updateSprayer(
                "nozzleWidthMetres",
                value,
              )
            }
          />

          <NumberField
            label="Walking speed (km/h)"
            value={sprayer.walkingSpeedKph}
            step={0.01}
            onChange={(value) =>
              updateSprayer(
                "walkingSpeedKph",
                value,
              )
            }
          />
        </div>

        <Field label="Calibration date">
          <input
            type="date"
            value={sprayer.calibrationDate}
            onChange={(event) =>
              updateSprayer(
                "calibrationDate",
                event.target.value,
              )
            }
            className={inputClass}
          />
        </Field>
      </div>
    </article>
  );
}

function calculateApplication(
  data: ChemicalCentreData,
) {
  const {
    product,
    sprayer,
    treatmentAreaSquareMetres,
  } = data;

  const areaHectares =
    treatmentAreaSquareMetres / 10000;

  const calibratedWaterLitresPerHectare =
    sprayer.walkingSpeedKph > 0 &&
    sprayer.nozzleWidthMetres > 0
      ? (600 *
          sprayer.measuredFlowLitresPerMinute) /
        (sprayer.walkingSpeedKph *
          sprayer.nozzleWidthMetres)
      : 0;

  const totalChemicalLitres =
    product.applicationRateLitresPerHectare *
    areaHectares;

  const totalWaterLitres =
    calibratedWaterLitresPerHectare *
    areaHectares;

  const tankRows = buildTankRows({
    totalWaterLitres,
    totalChemicalLitres,
    tankCapacityLitres:
      sprayer.tankCapacityLitres,
    calibratedWaterLitresPerHectare,
  });

  return {
    areaHectares,
    calibratedWaterLitresPerHectare,
    totalChemicalLitres,
    totalWaterLitres,
    tankRows,
  };
}

function buildTankRows({
  totalWaterLitres,
  totalChemicalLitres,
  tankCapacityLitres,
  calibratedWaterLitresPerHectare,
}: {
  totalWaterLitres: number;
  totalChemicalLitres: number;
  tankCapacityLitres: number;
  calibratedWaterLitresPerHectare: number;
}): TankRow[] {
  if (
    totalWaterLitres <= 0 ||
    totalChemicalLitres < 0 ||
    tankCapacityLitres <= 0 ||
    calibratedWaterLitresPerHectare <= 0
  ) {
    return [];
  }

  const rows: TankRow[] = [];
  let remainingWater = totalWaterLitres;
  let remainingChemicalLitres =
    totalChemicalLitres;
  let fillNumber = 1;

  while (remainingWater > 0.0001) {
    const waterLitres = Math.min(
      remainingWater,
      tankCapacityLitres,
    );

    const chemicalLitres =
      totalWaterLitres > 0
        ? (waterLitres / totalWaterLitres) *
          totalChemicalLitres
        : 0;

    const areaHectares =
      waterLitres /
      calibratedWaterLitresPerHectare;

    rows.push({
      fillNumber,
      waterLitres,
      chemicalMillilitres:
        chemicalLitres * 1000,
      areaSquareMetres:
        areaHectares * 10000,
      fullTank:
        Math.abs(
          waterLitres - tankCapacityLitres,
        ) < 0.001,
    });

    remainingWater -= waterLitres;
    remainingChemicalLitres -=
      chemicalLitres;
    fillNumber += 1;

    if (fillNumber > 500) break;
  }

  return rows;
}

function TankGuide({
  rows,
  tankCapacity,
}: {
  rows: TankRow[];
  tankCapacity: number;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            Tank-by-tank mixing guide
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Full and partial fills are calculated
            separately.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold">
          {formatNumber(tankCapacity, 1)} L
          tank
        </span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-[90px_1fr_1fr_1fr_120px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            <span>Fill</span>
            <span>Water</span>
            <span>Chemical</span>
            <span>Area covered</span>
            <span>Tank type</span>
          </div>

          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Enter valid product, equipment and area
              information to calculate the tank
              requirements.
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.fillNumber}
                className="grid grid-cols-[90px_1fr_1fr_1fr_120px] gap-3 border-t border-slate-100 px-4 py-3 text-sm"
              >
                <span className="font-bold">
                  Fill {row.fillNumber}
                </span>

                <span>
                  {formatNumber(
                    row.waterLitres,
                    2,
                  )}{" "}
                  L
                </span>

                <span className="font-bold text-red-700">
                  {formatNumber(
                    row.chemicalMillilitres,
                    1,
                  )}{" "}
                  ml
                </span>

                <span>
                  {formatNumber(
                    row.areaSquareMetres,
                    0,
                  )}{" "}
                  m²
                </span>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                    row.fullTank
                      ? "bg-green-100 text-green-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {row.fullTank
                    ? "Full tank"
                    : "Partial tank"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </article>
  );
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

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
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
            Number(event.target.value) || 0,
          )
        }
        className={inputClass}
      />
    </Field>
  );
}

function ResultCard({
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
    <article className="rounded-xl border border-slate-200 p-4">
      <div
        className={`mb-3 h-1.5 w-10 rounded-full ${
          warning ? "bg-red-500" : "bg-[#338b45]"
        }`}
      />

      <div className="text-sm font-semibold text-slate-500">
        {label}
      </div>

      <div
        className={`mt-1 text-2xl font-bold ${
          warning
            ? "text-red-700"
            : "text-slate-900"
        }`}
      >
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </article>
  );
}

function CalibrationResult({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/70 p-4">
      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="mt-1 font-bold">
        {value}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 text-sm last:border-0 last:pb-0">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="max-w-[60%] text-right font-bold">
        {value}
      </span>
    </div>
  );
}

function formatChemical(litres: number) {
  if (litres >= 1) {
    return `${formatNumber(litres, 3)} L`;
  }

  return `${formatNumber(
    litres * 1000,
    1,
  )} ml`;
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

function formatDate(value: string) {
  if (!value) return "Not recorded";

  const [year, month, day] = value
    .split("-")
    .map(Number);

  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}