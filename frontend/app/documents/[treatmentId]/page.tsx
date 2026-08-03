"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type {
  CSSProperties,
  ReactNode,
} from "react";

import { useCustomerStore } from "@/components/customer-store";
import {
  type AdvisoryType,
  type TreatmentWordingSettings,
  useSettingsStore,
} from "@/components/settings-store";
import {
  type TreatmentRecord,
  useTreatmentStore,
} from "@/components/treatment-store";

export default function TreatmentDocumentPage() {
  const params = useParams<{
    treatmentId: string;
  }>();

  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const {
    settings,
    ready: settingsReady,
  } = useSettingsStore();

  const treatment = treatments.find(
    (item) =>
      item.id === params.treatmentId,
  );

  const customer = treatment
    ? customers.find(
        (item) =>
          item.customerNumber ===
          treatment.customerNumber,
      )
    : undefined;

  if (
    !customersReady ||
    !treatmentsReady ||
    !settingsReady
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-2xl bg-white p-10 text-slate-500 shadow-sm">
          Loading treatment document...
        </div>
      </main>
    );
  }

  if (!treatment || !customer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-xl rounded-2xl bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold">
            Document not found
          </h1>

          <p className="mt-3 text-slate-500">
            The treatment or customer record is no
            longer available.
          </p>

          <Link
            href="/documents"
            className="mt-6 inline-flex rounded-xl bg-[#176b37] px-5 py-3 font-semibold text-white"
          >
            Return to documents
          </Link>
        </div>
      </main>
    );
  }

  const invoiceNumber =
    treatment.invoiceNumber ||
    "Not assigned";

  const visitInformation =
    createVisitInformation(
      treatment,
      settings.treatmentWording,
    );

  const nextVisitPreparation =
    treatment.status === "Completed"
      ? settings.treatmentWording
          .nextVisitPreparation
      : createNonCompletedPreparation(
          treatment,
          settings.treatmentWording,
        );

  const activeAdvisories =
    settings.advisories.filter(
      (advisory) => advisory.active,
    );

  const documentDensityClass =
    getDocumentDensityClass(
      visitInformation.length +
        nextVisitPreparation.length +
        treatment.notes.length +
        activeAdvisories.reduce(
          (total, advisory) =>
            total +
            advisory.title.length +
            advisory.wording.length,
          0,
        ),
    );

  const businessAddress =
    createBusinessAddress([
      settings.business.addressLine1,
      settings.business.addressLine2,
      settings.business.town,
      settings.business.county,
      settings.business.postcode,
    ]);

  const customerAddress =
    createBusinessAddress([
      customer.address,
      customer.postcode,
    ]);

  const primaryColour =
    settings.branding.primaryColour ||
    "#176b37";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-[900px] flex-wrap items-center justify-between gap-3">
        <Link
          href="/documents"
          className="font-semibold text-[#176b37] hover:underline"
        >
          ← Back to documents
        </Link>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/customers/${customer.customerNumber}`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
          >
            Open customer
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
      </div>

      <article
        className={`treatment-document mx-auto bg-white shadow-lg print:shadow-none ${documentDensityClass}`}
        style={
          {
            "--greenflow-primary":
              primaryColour,
          } as CSSProperties
        }
      >
        <header
          className="flex items-start justify-between gap-8 border-b-4 pb-5"
          style={{
            borderColor: primaryColour,
          }}
        >
          <div>
            <div
              className="text-3xl font-bold"
              style={{
                color: primaryColour,
              }}
            >
              {
                settings.business
                  .businessName
              }
            </div>

            <div className="mt-1 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Lawn treatment report and invoice
            </div>

            {settings.business
              .applicationName && (
              <div className="mt-2 text-xs text-slate-400">
                Prepared using{" "}
                {
                  settings.business
                    .applicationName
                }
              </div>
            )}
          </div>

          <div className="max-w-[48%] text-right text-sm leading-6 text-slate-600">
            {settings.business
              .proprietorName && (
              <div className="font-bold text-slate-900">
                {
                  settings.business
                    .proprietorName
                }
              </div>
            )}

            {businessAddress && (
              <div className="whitespace-pre-line">
                {businessAddress}
              </div>
            )}

            {settings.business
              .telephone && (
              <div>
                Tel:{" "}
                {
                  settings.business
                    .telephone
                }
              </div>
            )}

            {settings.business.mobile && (
              <div>
                Mobile:{" "}
                {settings.business.mobile}
              </div>
            )}

            {settings.business.email && (
              <div>
                {settings.business.email}
              </div>
            )}

            {settings.business.website && (
              <div>
                {
                  settings.business
                    .website
                }
              </div>
            )}

            {settings.business
              .vatNumber && (
              <div>
                VAT:{" "}
                {
                  settings.business
                    .vatNumber
                }
              </div>
            )}

            {settings.business
              .companyNumber && (
              <div>
                Company number:{" "}
                {
                  settings.business
                    .companyNumber
                }
              </div>
            )}
          </div>
        </header>

        <section className="print-avoid mt-5 grid grid-cols-[1.3fr_1fr] gap-8">
          <div>
            <DocumentLabel
              primaryColour={
                primaryColour
              }
            >
              Customer
            </DocumentLabel>

            <div className="mt-2 text-lg font-bold">
              {customer.fullName}
            </div>

            <div className="mt-1 whitespace-pre-line leading-6 text-slate-700">
              {customerAddress}
            </div>

            <div className="mt-3 text-sm text-slate-600">
              Customer number:{" "}
              <strong>
                {
                  customer.customerNumber
                }
              </strong>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <DocumentRow
              label="Invoice number"
              value={invoiceNumber}
            />

            <DocumentRow
              label="Visit date"
              value={formatTreatmentDate(
                treatment,
              )}
            />

            <DocumentRow
              label="Status"
              value={treatment.status}
            />

            <DocumentRow
              label="Customer group"
              value={`Group ${customer.groupNumber}`}
            />

            <DocumentRow
              label="Van"
              value={`Van ${customer.vanNumber}`}
            />
          </div>
        </section>

        <section className="print-avoid mt-5 rounded-xl border border-slate-200 p-5">
          <DocumentLabel
            primaryColour={
              primaryColour
            }
          >
            Treatment information
          </DocumentLabel>

          <div className="mt-4 space-y-5">
            <div>
              <div className="text-sm font-bold text-slate-900">
                Today&apos;s visit
              </div>

              <p className="variable-document-text mt-1.5 leading-relaxed text-slate-700">
                {visitInformation}
              </p>
            </div>

            {treatment.notes && (
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Additional lawn-care
                  notes
                </div>

                <p className="variable-document-text mt-1.5 whitespace-pre-line leading-relaxed text-slate-700">
                  {treatment.notes}
                </p>
              </div>
            )}

            <div className="rounded-xl bg-green-50 p-4">
              <div className="text-sm font-bold text-green-900">
                Preparing for the next
                visit
              </div>

              <p className="variable-document-text mt-1.5 leading-relaxed text-green-900">
                {nextVisitPreparation}
              </p>
            </div>
          </div>
        </section>

        {activeAdvisories.length > 0 && (
          <section
            className={`print-avoid mt-5 grid gap-3 ${getAdvisoryGridClass(
              activeAdvisories.length,
            )}`}
          >
            {activeAdvisories.map(
              (advisory) => (
                <AdvisoryBox
                  key={advisory.id}
                  title={advisory.title}
                  detail={
                    advisory.wording
                  }
                  type={advisory.type}
                />
              ),
            )}
          </section>
        )}

        <section className="print-avoid mt-5 grid grid-cols-[1.35fr_0.65fr] gap-5">
          <div className="rounded-xl border border-slate-200 p-5">
            <DocumentLabel
              primaryColour={
                primaryColour
              }
            >
              Payment information
            </DocumentLabel>

            <p className="mt-3 text-sm leading-6 text-slate-700">
              {
                settings.invoices
                  .paymentInstructions
              }
            </p>

            {settings.invoices
              .vatWording && (
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {
                  settings.invoices
                    .vatWording
                }
              </p>
            )}

            {invoiceNumber ===
              "Not assigned" && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                This older treatment
                record does not have a
                permanent GreenFlow invoice
                number.
              </p>
            )}
          </div>

          <div
            className="rounded-xl p-5 text-white"
            style={{
              backgroundColor:
                primaryColour,
            }}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-white/80">
              Amount due
            </div>

            <div className="mt-2 text-4xl font-bold">
              £
              {customer.treatmentPrice.toFixed(
                2,
              )}
            </div>

            {settings.invoices
              .showAmountIncludingVat && (
              <div className="mt-2 text-sm text-white/80">
                Including VAT
              </div>
            )}
          </div>
        </section>

        <section className="print-avoid mt-5 rounded-xl border-2 border-green-200 bg-green-50 p-5">
          <div className="grid grid-cols-[1fr_auto] items-center gap-5">
            <div>
              <div className="text-sm font-bold uppercase tracking-wide text-green-800">
                Next scheduled treatment
              </div>

              <div className="mt-2 text-2xl font-bold text-green-950">
                {treatment.nextVisitDate ||
                  customer.nextVisit ||
                  "Not yet scheduled"}
              </div>
            </div>

            <div className="rounded-full bg-white px-4 py-2 text-sm font-bold text-green-800">
              Group{" "}
              {customer.groupNumber}
            </div>
          </div>
        </section>

        <footer className="mt-6 flex items-end justify-between gap-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <div className="max-w-[68%]">
            <div className="font-semibold leading-5 text-slate-700">
              {
                settings.invoices
                  .footerMessage
              }
            </div>
          </div>

          <div className="text-right">
            <div>
              Invoice number:{" "}
              {invoiceNumber}
            </div>

            <div className="mt-1">
              Generated by{" "}
              {
                settings.business
                  .applicationName
              }
            </div>
          </div>
        </footer>
      </article>
    </main>
  );
}

function createVisitInformation(
  treatment: TreatmentRecord,
  wording: TreatmentWordingSettings,
) {
  if (
    treatment.status ===
    "Needs Rescheduling"
  ) {
    return wording.rescheduledVisit;
  }

  if (
    treatment.status === "Cancelled"
  ) {
    return wording.cancelledVisit;
  }

  const treatmentName =
    treatment.treatmentName.toLowerCase();

  if (
    treatmentName.includes("aerat")
  ) {
    return wording.aerationVisit;
  }

  if (
    treatmentName.includes("scarif")
  ) {
    return wording.scarificationVisit;
  }

  if (
    treatmentName.includes("overseed")
  ) {
    return wording.overseedingVisit;
  }

  if (
    treatmentName.includes("moss")
  ) {
    return wording.mossControlVisit;
  }

  const hasHerbicide =
    Boolean(treatment.herbicide) &&
    treatment.herbicide !== "None";

  const hasFertiliser =
    Boolean(treatment.fertiliser) &&
    treatment.fertiliser !== "None";

  if (
    hasHerbicide &&
    hasFertiliser
  ) {
    return wording
      .combinedFertiliserAndHerbicideVisit;
  }

  if (hasHerbicide) {
    return wording.herbicideVisit;
  }

  return wording.seasonalFertiliserVisit;
}

function createNonCompletedPreparation(
  treatment: TreatmentRecord,
  wording: TreatmentWordingSettings,
) {
  if (
    treatment.status ===
    "Needs Rescheduling"
  ) {
    return "No preparation is required until a replacement visit date has been arranged.";
  }

  if (
    treatment.status === "Cancelled"
  ) {
    return "No preparation is currently required. Please contact Sharpes Lawn Care if you would like to arrange another visit.";
  }

  return wording.nextVisitPreparation;
}

function getAdvisoryGridClass(
  advisoryCount: number,
) {
  if (advisoryCount === 1) {
    return "grid-cols-1";
  }

  if (advisoryCount === 2) {
    return "grid-cols-2";
  }

  return "grid-cols-3";
}

function createBusinessAddress(
  addressParts: Array<
    string | undefined
  >,
) {
  return addressParts
    .map((part) => part?.trim())
    .filter(
      (part): part is string =>
        Boolean(part),
    )
    .join("\n");
}

function formatTreatmentDate(
  treatment: TreatmentRecord,
) {
  if (treatment.completedDate) {
    return formatDate(
      treatment.completedDate,
    );
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(
    new Date(
      treatment.recordedDate,
    ),
  );
}

function formatDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(
    new Date(
      year,
      month - 1,
      day,
    ),
  );
}

function getDocumentDensityClass(
  textLength: number,
) {
  if (textLength > 1200) {
    return "document-density-very-compact";
  }

  if (textLength > 750) {
    return "document-density-compact";
  }

  return "document-density-normal";
}

function DocumentLabel({
  children,
  primaryColour,
}: {
  children: ReactNode;
  primaryColour: string;
}) {
  return (
    <div
      className="text-xs font-bold uppercase tracking-[0.14em]"
      style={{
        color: primaryColour,
      }}
    >
      {children}
    </div>
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

      <span className="text-right font-bold">
        {value}
      </span>
    </div>
  );
}

function AdvisoryBox({
  title,
  detail,
  type,
}: {
  title: string;
  detail: string;
  type: AdvisoryType;
}) {
  const styles =
    type === "danger"
      ? "border-red-400 bg-red-50 text-red-950"
      : type === "warning"
        ? "border-amber-400 bg-amber-50 text-amber-950"
        : "border-blue-400 bg-blue-50 text-blue-950";

  return (
    <article
      className={`rounded-xl border-2 p-4 text-center ${styles}`}
    >
      <div className="text-sm font-extrabold uppercase tracking-wide">
        {title}
      </div>

      <p className="mt-2 text-xs font-medium leading-5">
        {detail}
      </p>
    </article>
  );
}