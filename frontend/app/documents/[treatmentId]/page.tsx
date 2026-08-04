"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type {
  CSSProperties,
  ReactNode,
} from "react";

import { useCustomerStore } from "@/components/customer-store";
import {
  type CustomerProgramme,
  type ProgrammeVisit,
  useProgrammeStore,
} from "@/components/programme-store";
import {
  type AdvisoryType,
  type TreatmentWordingSettings,
  useSettingsStore,
} from "@/components/settings-store";
import { useSeasonStore } from "@/components/season-store";
import {
  type TreatmentRecord,
  useTreatmentStore,
} from "@/components/treatment-store";

type NextVisitInformation = {
  date: string;
  label:
    | "Next planned treatment"
    | "Replacement visit";
  isOverride: boolean;
};

type BusinessWithVat = {
  vatNumber?: string;
};

export default function TreatmentDocumentPage() {
  const params =
    useParams<{
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
    programmes,
    ready: programmesReady,
  } = useProgrammeStore();

  const {
    seasons,
    ready: seasonsReady,
  } = useSeasonStore();

  const {
    settings,
    ready: settingsReady,
  } = useSettingsStore();

  const treatment =
    treatments.find(
      (item) =>
        item.id ===
        params.treatmentId,
    );

  const customer =
    treatment
      ? customers.find(
          (item) =>
            item.customerNumber ===
            treatment.customerNumber,
        )
      : undefined;

  const ready =
    customersReady &&
    treatmentsReady &&
    programmesReady &&
    seasonsReady &&
    settingsReady;

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-2xl bg-white p-10 text-slate-500 shadow-sm">
          Loading customer document...
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
            The treatment or customer record is no longer available.
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

  const completed =
    treatment.status ===
    "Completed";

  const documentTitle =
    completed
      ? "Treatment report & invoice"
      : "Visit outcome record";

  const visitInformation =
    createCustomerSafeVisitInformation(
      treatment,
      settings.treatmentWording,
    );

  const primaryColour =
    settings.branding
      .primaryColour ||
    "#176b37";

  const businessAddress =
    joinAddress([
      settings.business.addressLine1,
      settings.business.addressLine2,
      settings.business.town,
      settings.business.county,
      settings.business.postcode,
    ]);

  const vatNumber =
    (
      settings.business as typeof settings.business &
        BusinessWithVat
    ).vatNumber?.trim() ?? "";

  const customerAddress =
    joinAddress([
      customer.address,
      customer.postcode,
    ]);

  const activeAdvisories =
    completed
      ? settings.advisories
          .filter(
            (advisory) =>
              advisory.active,
          )
          .slice(0, 3)
      : [];

  const nextVisit =
    getNextVisitInformation({
      treatment,
      customerNumber:
        customer.customerNumber,
      groupNumber:
        customer.groupNumber,
      programmes,
      seasons,
    });

  return (
    <main className="min-h-screen bg-slate-200 px-4 py-6 print:bg-white print:p-0">
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 0;
            background: white;
          }

          .no-print {
            display: none !important;
          }

          .a4-document {
            width: 210mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[794px] flex-wrap items-center justify-between gap-3">
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

          <Link
            href="/treatments"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
          >
            Internal treatment record
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
        className="a4-document mx-auto min-h-[1123px] max-w-[794px] overflow-hidden rounded-[24px] bg-white shadow-2xl"
        style={
          {
            "--document-primary":
              primaryColour,
          } as CSSProperties
        }
      >
        <header className="border-b border-slate-200 px-8 py-6">
          <div className="flex items-start justify-between gap-8">
            <div>
              <div
                className="text-4xl font-bold tracking-tight"
                style={{
                  color:
                    primaryColour,
                }}
              >
                {
                  settings.business
                    .businessName
                }
              </div>

              <div className="mt-1 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                {documentTitle}
              </div>
            </div>

            <div className="max-w-[320px] whitespace-pre-line text-right text-[11px] leading-[1.45] text-slate-600">
              <div className="font-bold text-slate-900">
                {
                  settings.business
                    .businessName
                }
              </div>

              {businessAddress && (
                <div>
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

              {settings.business
                .mobile && (
                <div>
                  Mobile:{" "}
                  {
                    settings.business
                      .mobile
                  }
                </div>
              )}

              {settings.business
                .email && (
                <div>
                  Email:{" "}
                  {
                    settings.business
                      .email
                  }
                </div>
              )}

              {settings.business
                .website && (
                <div>
                  Web:{" "}
                  {
                    settings.business
                      .website
                  }
                </div>
              )}

              {vatNumber && (
                <div>
                  VAT: {vatNumber}
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="px-8 py-6">
          <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <SmallHeading colour={primaryColour}>
                Customer
              </SmallHeading>

              <div className="mt-2 text-lg font-bold">
                {customer.fullName}
              </div>

              <div className="mt-1 whitespace-pre-line text-sm leading-5 text-slate-600">
                {customerAddress}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <DocumentMetaRow
                label="Customer number"
                value={
                  customer.customerNumber
                }
              />

              <DocumentMetaRow
                label="Invoice number"
                value={
                  completed
                    ? treatment.invoiceNumber ||
                      "Pending"
                    : "Not applicable"
                }
              />

              <DocumentMetaRow
                label="Visit date"
                value={formatDate(
                  getRecordDate(
                    treatment,
                  ),
                )}
              />
            </div>
          </div>

          <section className="mt-5 min-h-[255px] rounded-xl border border-slate-200 p-5">
            <div>
              <SmallHeading colour={primaryColour}>
                Today&apos;s visit
              </SmallHeading>

              <h1 className="mt-2 text-2xl font-bold">
                {
                  treatment.treatmentName
                }
              </h1>
            </div>

            <p className="mt-4 whitespace-pre-line text-[14px] leading-7 text-slate-700">
              {visitInformation}
            </p>

            {treatment.notes && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold">
                  Lawn observations and advice
                </div>

                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                  {removeInternalProductInformation(
                    treatment.notes,
                  )}
                </p>
              </div>
            )}
          </section>

          {completed &&
            activeAdvisories.length >
              0 && (
              <section className="mt-5">
                <div className="flex items-center justify-between">
                  <SmallHeading colour={primaryColour}>
                    Important aftercare
                  </SmallHeading>

                  <span className="text-xs text-slate-400">
                    Please follow the guidance below
                  </span>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {activeAdvisories.map(
                    (advisory) => (
                      <AdviceCard
                        key={advisory.id}
                        title={advisory.title}
                        detail={advisory.wording}
                        type={advisory.type}
                      />
                    ),
                  )}
                </div>
              </section>
            )}

          {completed && (
            <section className="mt-5 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-xl border border-slate-200 p-4">
                <SmallHeading colour={primaryColour}>
                  Payment information
                </SmallHeading>

                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                  {
                    settings.invoices
                      .paymentInstructions
                  }
                </p>

                {settings.invoices
                  .vatWording && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                    {
                      settings.invoices
                        .vatWording
                    }
                  </p>
                )}
              </div>

              <div
                className="rounded-xl p-4 text-white shadow-sm"
                style={{
                  backgroundColor:
                    primaryColour,
                }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
                  Treatment charge
                </div>

                <div className="mt-2 text-4xl font-bold tracking-tight">
                  £
                  {customer.treatmentPrice.toFixed(
                    2,
                  )}
                </div>

                <div className="mt-1 text-xs text-white/80">
                  Including VAT
                </div>
              </div>
            </section>
          )}

          {nextVisit && (
            <section
              className={`mt-5 rounded-xl border p-5 ${
                nextVisit.isOverride
                  ? "border-amber-300 bg-amber-50"
                  : "border-green-200 bg-green-50"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div
                    className={`text-xs font-bold uppercase tracking-[0.16em] ${
                      nextVisit.isOverride
                        ? "text-amber-700"
                        : "text-green-700"
                    }`}
                  >
                    {nextVisit.label}
                  </div>

                  <div className="mt-2 text-sm text-slate-600">
                    {nextVisit.isOverride
                      ? "This is the agreed customer-specific replacement date."
                      : "This is the next date in your annual programme."}
                  </div>
                </div>

                <div
                  className={`text-3xl font-bold ${
                    nextVisit.isOverride
                      ? "text-amber-900"
                      : "text-green-900"
                  }`}
                >
                  {formatDate(
                    nextVisit.date,
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="mt-6 flex items-end justify-between gap-6">
            <div>
              <div className="text-sm text-slate-500">
                Many thanks
              </div>

              <div
                className="mt-2 text-lg font-semibold"
                style={{
                  color:
                    primaryColour,
                }}
              >
                {settings.business
                  .proprietorName ||
                  settings.business
                    .businessName}
              </div>
            </div>

            <div className="max-w-[58%] text-right text-[11px] leading-5 text-slate-500">
              {completed
                ? settings.invoices
                    .footerMessage
                : "This document records the outcome of the scheduled visit. No charge is shown unless the visit was completed."}
            </div>
          </section>
        </section>
      </article>
    </main>
  );
}

function getNextVisitInformation({
  treatment,
  customerNumber,
  groupNumber,
  programmes,
  seasons,
}: {
  treatment: TreatmentRecord;
  customerNumber: string;
  groupNumber: number;
  programmes: CustomerProgramme[];
  seasons: ReturnType<
    typeof useSeasonStore
  >["seasons"];
}): NextVisitInformation | null {
  if (
    (
      treatment.status ===
        "Rescheduled" ||
      treatment.status ===
        "Needs Rescheduling"
    ) &&
    isDateValue(
      treatment.nextVisitDate,
    )
  ) {
    return {
      date:
        treatment.nextVisitDate,
      label:
        "Replacement visit",
      isOverride: true,
    };
  }

  const linked =
    findLinkedProgrammeVisit(
      programmes,
      treatment,
    );

  const programme =
    linked?.programme ??
    programmes
      .filter(
        (item) =>
          item.customerNumber ===
          customerNumber,
      )
      .sort(
        (first, second) =>
          first.year -
          second.year,
      )
      .find(
        (item) =>
          item.visits.some(
            (visit) =>
              visit.scheduledDate >
                treatment.scheduledDate &&
              (visit.status ===
                "Scheduled" ||
                visit.status ===
                  "Planned"),
          ),
      );

  if (!programme) {
    return null;
  }

  const nextVisit =
    programme.visits
      .filter(
        (visit) =>
          visit.scheduledDate >
            treatment.scheduledDate &&
          (visit.status ===
            "Scheduled" ||
            visit.status ===
              "Planned"),
      )
      .sort(
        (first, second) =>
          first.scheduledDate.localeCompare(
            second.scheduledDate,
          ),
      )[0];

  if (!nextVisit) {
    return null;
  }

  const season =
    seasons.find(
      (item) =>
        item.year ===
        programme.year,
    );

  const standardGroupDate =
    season?.groupDates.find(
      (group) =>
        group.groupNumber ===
        groupNumber,
    )?.treatmentDates[
      nextVisit.visitNumber - 1
    ];

  const isOverride =
    Boolean(
      standardGroupDate &&
        standardGroupDate !==
          nextVisit.scheduledDate,
    );

  return {
    date:
      nextVisit.scheduledDate,
    label:
      isOverride
        ? "Replacement visit"
        : "Next planned treatment",
    isOverride,
  };
}

function findLinkedProgrammeVisit(
  programmes: CustomerProgramme[],
  treatment: TreatmentRecord,
): {
  programme: CustomerProgramme;
  visit: ProgrammeVisit;
} | null {
  if (
    treatment.programmeId &&
    treatment.programmeVisitId
  ) {
    const programme =
      programmes.find(
        (item) =>
          item.id ===
          treatment.programmeId,
      );

    const visit =
      programme?.visits.find(
        (item) =>
          item.id ===
          treatment.programmeVisitId,
      );

    if (
      programme &&
      visit
    ) {
      return {
        programme,
        visit,
      };
    }
  }

  for (const programme of programmes) {
    if (
      programme.customerNumber !==
      treatment.customerNumber
    ) {
      continue;
    }

    const visit =
      programme.visits.find(
        (item) =>
          item.treatmentName ===
            treatment.treatmentName &&
          (
            item.scheduledDate ===
              treatment.scheduledDate ||
            item.status ===
              "Completed" ||
            item.status ===
              "Skipped"
          ),
      );

    if (visit) {
      return {
        programme,
        visit,
      };
    }
  }

  return null;
}

function createCustomerSafeVisitInformation(
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
    treatment.status ===
    "Rescheduled"
  ) {
    return treatment.nextVisitDate
      ? `The original visit could not be completed. A replacement visit has been arranged for ${formatDate(
          treatment.nextVisitDate,
        )}.`
      : wording.rescheduledVisit;
  }

  if (
    treatment.status ===
    "Cancelled"
  ) {
    return wording.cancelledVisit;
  }

  const treatmentName =
    treatment.treatmentName.toLowerCase();

  if (
    treatmentName.includes(
      "moss",
    )
  ) {
    return wording.mossControlVisit;
  }

  if (
    treatmentName.includes(
      "aerat",
    )
  ) {
    return wording.aerationVisit;
  }

  if (
    treatmentName.includes(
      "scarif",
    )
  ) {
    return wording.scarificationVisit;
  }

  if (
    treatmentName.includes(
      "seed",
    )
  ) {
    return wording.overseedingVisit;
  }

  return wording.seasonalFertiliserVisit;
}

function removeInternalProductInformation(
  notes: string,
) {
  const blockedTerms = [
    "chemical:",
    "fertiliser:",
    "fertilizer:",
    "herbicide:",
    "application rate:",
    "product required:",
    "active ingredient:",
    "registration number:",
    "tank fills:",
    "flow rate:",
    "nozzle:",
    "knapsack:",
    "pressure:",
    "spray width:",
  ];

  const safeLines =
    notes
      .split("\n")
      .filter((line) => {
        const lower =
          line
            .trim()
            .toLowerCase();

        return !blockedTerms.some(
          (term) =>
            lower.startsWith(
              term,
            ),
        );
      })
      .join("\n")
      .trim();

  return (
    safeLines ||
    "No additional customer-facing remarks were recorded."
  );
}

function getRecordDate(
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

function joinAddress(
  values: string[],
) {
  return values
    .map((value) =>
      value.trim(),
    )
    .filter(Boolean)
    .join("\n");
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

function isDateValue(
  value: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const date =
    parseDate(value);

  return (
    !Number.isNaN(
      date.getTime(),
    ) &&
    toDateValue(date) === value
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
  if (!isDateValue(value)) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(parseDate(value));
}

function SmallHeading({
  colour,
  children,
}: {
  colour: string;
  children: ReactNode;
}) {
  return (
    <div
      className="text-xs font-bold uppercase tracking-[0.16em]"
      style={{
        color: colour,
      }}
    >
      {children}
    </div>
  );
}

function DocumentMetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-5 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="text-right font-semibold">
        {value}
      </span>
    </div>
  );
}

function AdviceCard({
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
      ? {
          card:
            "border-red-200 bg-red-50",
          icon:
            "bg-red-100 text-red-700",
          title:
            "text-red-900",
        }
      : type === "warning"
        ? {
            card:
              "border-amber-200 bg-amber-50",
            icon:
              "bg-amber-100 text-amber-700",
            title:
              "text-amber-900",
          }
        : {
            card:
              "border-blue-200 bg-blue-50",
            icon:
              "bg-blue-100 text-blue-700",
            title:
              "text-blue-900",
          };

  const symbol =
    type === "danger"
      ? "!"
      : type === "warning"
        ? "↟"
        : "●";

  return (
    <div
      className={`rounded-xl border p-3 ${styles.card}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${styles.icon}`}
        >
          {symbol}
        </div>

        <div
          className={`text-sm font-bold ${styles.title}`}
        >
          {title}
        </div>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-700">
        {detail}
      </p>
    </div>
  );
}