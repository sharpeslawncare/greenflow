"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type {
  CSSProperties,
  ReactNode,
} from "react";

import {
  type ApplicationRateUnit,
  type ChemicalRecord,
  type ChemicalUnit,
  useChemicalStore,
} from "@/components/chemical-store";

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

export default function ChemicalDocumentPage() {
  const params = useParams<{
    chemicalId: string;
  }>();

  const {
    chemicals,
    ready,
  } = useChemicalStore();

  const chemical = chemicals.find(
    (item) =>
      item.id === params.chemicalId,
  );

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-2xl bg-white p-10 text-slate-500 shadow-sm">
          Loading chemical document...
        </div>
      </main>
    );
  }

  if (!chemical) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-lg rounded-2xl bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold">
            Chemical not found
          </h1>

          <p className="mt-3 text-slate-500">
            The selected chemical record is no
            longer available.
          </p>

          <Link
            href="/chemicals"
            className="mt-6 inline-flex rounded-xl bg-[#176b37] px-5 py-3 font-semibold text-white"
          >
            Return to Chemical Centre
          </Link>
        </div>
      </main>
    );
  }

  const exampleArea = 250;

  const exampleCalculation =
    calculateApplication(
      chemical,
      exampleArea,
    );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-[900px] flex-wrap items-center justify-between gap-3">
        <Link
          href="/chemicals"
          className="font-semibold text-[#176b37] hover:underline"
        >
          ← Back to Chemical Centre
        </Link>

        <button
          type="button"
          onClick={() =>
            window.print()
          }
          className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
        >
          Print or save PDF
        </button>
      </div>

      <article
        className="mx-auto box-border min-h-[297mm] w-[210mm] bg-white p-[13mm] text-slate-900 shadow-lg print:min-h-0 print:shadow-none"
        style={
          {
            "--chemical-primary":
              "#176b37",
          } as CSSProperties
        }
      >
        <header className="flex items-start justify-between gap-8 border-b-4 border-[#176b37] pb-5">
          <div>
            <div className="text-3xl font-bold text-[#176b37]">
              Chemical Record
            </div>

            <div className="mt-1 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Product, COSHH and calibration sheet
            </div>

            <div className="mt-4 text-2xl font-bold">
              {chemical.name}
            </div>

            <div className="mt-1 text-sm text-slate-600">
              {chemical.manufacturer ||
                "Manufacturer not recorded"}
            </div>
          </div>

          <div className="text-right text-sm leading-6 text-slate-600">
            <StatusBadge
              active={chemical.active}
              lowStock={
                chemical.active &&
                chemical.currentStock <=
                  chemical.reorderLevel
              }
            />

            <div className="mt-4">
              Last updated
            </div>

            <div className="font-bold text-slate-900">
              {formatDate(
                chemical.updatedAt,
              )}
            </div>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-5">
          <DocumentPanel title="Product identity">
            <DocumentRow
              label="Product name"
              value={chemical.name}
            />

            <DocumentRow
              label="Manufacturer"
              value={
                chemical.manufacturer ||
                "Not recorded"
              }
            />

            <DocumentRow
              label="Product type"
              value={chemical.type}
            />

            <DocumentRow
              label="MAPP / PCS number"
              value={
                chemical.registrationNumber ||
                "Not applicable / not recorded"
              }
            />

            <DocumentText
              label="Active ingredients"
              value={
                chemical.activeIngredients ||
                "Not recorded"
              }
            />

            <DocumentText
              label="Target use"
              value={
                chemical.targetUse ||
                "Not recorded"
              }
            />
          </DocumentPanel>

          <DocumentPanel title="Pack and stock">
            <DocumentRow
              label="Pack size"
              value={`${chemical.packSize} ${chemical.packUnit}`}
            />

            <DocumentRow
              label="Cost per pack"
              value={`£${chemical.costPerPack.toFixed(
                2,
              )}`}
            />

            <DocumentRow
              label="Current stock"
              value={`${chemical.currentStock} pack${
                chemical.currentStock === 1
                  ? ""
                  : "s"
              }`}
            />

            <DocumentRow
              label="Reorder level"
              value={`${chemical.reorderLevel} pack${
                chemical.reorderLevel === 1
                  ? ""
                  : "s"
              }`}
            />

            <DocumentRow
              label="Estimated stock value"
              value={`£${(
                chemical.currentStock *
                chemical.costPerPack
              ).toFixed(2)}`}
            />

            <DocumentRow
              label="Record status"
              value={
                chemical.active
                  ? "Active"
                  : "Archived"
              }
            />
          </DocumentPanel>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-5">
          <DocumentPanel title="Label requirements">
            <DocumentRow
              label="Application rate"
              value={`${chemical.applicationRate} ${chemical.applicationRateUnit}`}
            />

            <DocumentRow
              label="Label water volume"
              value={`${chemical.waterVolumePerHectare} L/ha`}
            />

            <DocumentRow
              label="Maximum annual applications"
              value={
                chemical.maximumAnnualApplications >
                0
                  ? String(
                      chemical.maximumAnnualApplications,
                    )
                  : "Not recorded"
              }
            />

            <DocumentRow
              label="Maximum annual dose"
              value={
                chemical.maximumAnnualDose > 0
                  ? String(
                      chemical.maximumAnnualDose,
                    )
                  : "Not recorded"
              }
            />

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              Always confirm these details against
              the current approved product label
              before use.
            </div>
          </DocumentPanel>

          <DocumentPanel title="Equipment and calibration">
            <DocumentRow
              label="Knapsack"
              value={
                [
                  chemical.knapsackMake,
                  chemical.knapsackModel,
                ]
                  .filter(Boolean)
                  .join(" ") ||
                "Not recorded"
              }
            />

            <DocumentRow
              label="Tank capacity"
              value={`${chemical.tankCapacityLitres} L`}
            />

            <DocumentRow
              label="Nozzle"
              value={
                [
                  chemical.nozzleColour,
                  chemical.nozzleType,
                ]
                  .filter(Boolean)
                  .join(" ") ||
                "Not recorded"
              }
            />

            <DocumentRow
              label="Walking speed"
              value={`${chemical.walkingSpeedKph} km/h`}
            />

            <DocumentRow
              label="Flow rate"
              value={`${chemical.flowRateLitresPerMinute} L/min`}
            />

            <DocumentRow
              label="Spray width"
              value={`${chemical.sprayWidthMetres} m`}
            />

            <DocumentRow
              label="Pressure"
              value={`${chemical.pressureBar} bar`}
            />

            <DocumentRow
              label="Calibrated output"
              value={`${exampleCalculation.calibratedWaterVolumePerHectare.toFixed(
                2,
              )} L/ha`}
            />
          </DocumentPanel>
        </section>

        <section className="mt-5">
          <DocumentPanel title="Example application calculation">
            <div className="mb-4 text-sm text-slate-600">
              Example treatment area:{" "}
              <strong>
                {exampleArea} m²
              </strong>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <CalculationBox
                label="Product required"
                value={formatApplicationAmount(
                  exampleCalculation.productRequired,
                  exampleCalculation.productUnit,
                )}
              />

              <CalculationBox
                label="Water required"
                value={`${exampleCalculation.waterRequiredLitres.toFixed(
                  3,
                )} L`}
              />

              <CalculationBox
                label="Tank fills"
                value={exampleCalculation.tankFills.toFixed(
                  3,
                )}
              />

              <CalculationBox
                label="Product per tank"
                value={formatApplicationAmount(
                  exampleCalculation.productPerTank,
                  exampleCalculation.productUnit,
                )}
              />

              <CalculationBox
                label="Product cost"
                value={`£${exampleCalculation.productCost.toFixed(
                  2,
                )}`}
              />

              <CalculationBox
                label="Carrier volume"
                value={`${exampleCalculation.calibratedWaterVolumePerHectare.toFixed(
                  2,
                )} L/ha`}
              />
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              This example is for checking the
              saved calibration only. Actual
              treatment calculations must use the
              measured treatment area and current
              label directions.
            </p>
          </DocumentPanel>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-4">
          <SafetyBox
            title="PPE requirements"
            value={
              chemical.ppeRequirements ||
              "Not recorded"
            }
            tone="blue"
          />

          <SafetyBox
            title="COSHH notes"
            value={
              chemical.coshhNotes ||
              "Not recorded"
            }
            tone="amber"
          />

          <SafetyBox
            title="Environmental warnings"
            value={
              chemical.environmentalWarnings ||
              "Not recorded"
            }
            tone="red"
          />
        </section>

        <section className="mt-5 rounded-xl border-2 border-slate-300 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
            Pre-application checks
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <CheckItem>
              Current product label checked
            </CheckItem>

            <CheckItem>
              COSHH assessment checked
            </CheckItem>

            <CheckItem>
              PPE available and inspected
            </CheckItem>

            <CheckItem>
              Nozzle inspected
            </CheckItem>

            <CheckItem>
              Flow rate confirmed
            </CheckItem>

            <CheckItem>
              Weather conditions suitable
            </CheckItem>

            <CheckItem>
              Treatment area measured
            </CheckItem>

            <CheckItem>
              Watercourses and drains protected
            </CheckItem>
          </div>
        </section>

        <footer className="mt-6 flex items-end justify-between gap-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <div className="max-w-[70%] leading-5">
            GreenFlow calculations depend on the
            information entered in the chemical
            record. The approved product label and
            current legal requirements always take
            priority.
          </div>

          <div className="text-right">
            <div className="font-semibold text-slate-700">
              {chemical.name}
            </div>

            <div className="mt-1">
              Chemical ID: {chemical.id}
            </div>
          </div>
        </footer>
      </article>
    </main>
  );
}

function calculateApplication(
  chemical: ChemicalRecord,
  areaSquareMetres: number,
): ApplicationCalculation {
  const safeArea = Math.max(
    0,
    areaSquareMetres,
  );

  const areaHectares =
    safeArea / 10000;

  const calibrationUsed =
    chemical.flowRateLitresPerMinute >
      0 &&
    chemical.walkingSpeedKph > 0 &&
    chemical.sprayWidthMetres > 0;

  const calibratedWaterVolumePerHectare =
    calibrationUsed
      ? (600 *
          chemical.flowRateLitresPerMinute) /
        (chemical.walkingSpeedKph *
          chemical.sprayWidthMetres)
      : Math.max(
          0,
          chemical.waterVolumePerHectare,
        );

  const productRequired =
    calculateProductRequired(
      chemical.applicationRate,
      chemical.applicationRateUnit,
      safeArea,
      areaHectares,
    );

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
      ? productRequired / tankFills
      : productRequired;

  const productCost =
    chemical.packSize > 0
      ? (productRequired /
          chemical.packSize) *
        chemical.costPerPack
      : 0;

  return {
    productRequired,
    productUnit:
      getProductUnit(
        chemical.applicationRateUnit,
      ),

    calibratedWaterVolumePerHectare,
    waterRequiredLitres,
    tankFills,
    productPerTank,
    productCost,
    calibrationUsed,
  };
}

function calculateProductRequired(
  rate: number,
  rateUnit: ApplicationRateUnit,
  areaSquareMetres: number,
  areaHectares: number,
) {
  if (
    rateUnit === "kg/ha" ||
    rateUnit === "L/ha"
  ) {
    return rate * areaHectares;
  }

  return rate * areaSquareMetres;
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

  return `${amount.toFixed(3)} ${unit}`;
}

function formatDate(
  value: string,
) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(new Date(value));
}

function DocumentPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="break-inside-avoid rounded-xl border border-slate-200 p-4">
      <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#176b37]">
        {title}
      </div>

      <div className="mt-3">
        {children}
      </div>
    </article>
  );
}

function DocumentRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-200 py-2 text-sm last:border-0">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="max-w-[58%] text-right font-bold">
        {value}
      </span>
    </div>
  );
}

function DocumentText({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-slate-200 py-3 last:border-0">
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <p className="mt-1 whitespace-pre-line text-sm leading-5 text-slate-800">
        {value}
      </p>
    </div>
  );
}

function CalculationBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-lg font-bold">
        {value}
      </div>
    </div>
  );
}

function SafetyBox({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone:
    | "blue"
    | "amber"
    | "red";
}) {
  const styles =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-950"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-blue-200 bg-blue-50 text-blue-950";

  return (
    <article
      className={`break-inside-avoid rounded-xl border p-4 ${styles}`}
    >
      <div className="text-xs font-bold uppercase tracking-wide">
        {title}
      </div>

      <p className="mt-2 whitespace-pre-line text-xs leading-5">
        {value}
      </p>
    </article>
  );
}

function CheckItem({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-block h-4 w-4 shrink-0 rounded border border-slate-500" />

      <span>{children}</span>
    </div>
  );
}

function StatusBadge({
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
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles}`}
    >
      {label}
    </span>
  );
}