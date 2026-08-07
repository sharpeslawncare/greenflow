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
          margin: 6mm;
        }

        .print-document {
          display: none;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .no-print,
          .screen-document {
            display: none !important;
          }

          .print-document {
            display: block !important;
            box-sizing: border-box !important;
            width: 198mm !important;
            max-width: 198mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            color: #0f172a !important;
            font-size: 9.5pt !important;
            line-height: 1.3 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-document * {
            box-sizing: border-box !important;
          }

          .print-document section,
          .print-document header,
          .print-document footer,
          .print-document aside {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-contact-grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 3mm !important;
          }

          .print-address-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 10mm !important;
          }

          .print-treatment-grid {
            display: grid !important;
            grid-template-columns: minmax(0, 1.65fr) minmax(0, 0.85fr) !important;
            gap: 7mm !important;
          }

          .print-next-grid {
            display: grid !important;
            grid-template-columns: 14mm minmax(0, 1fr) !important;
            gap: 5mm !important;
            align-items: center !important;
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
            onClick={() => window.print()}
            className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
          >
            Print or save PDF
          </button>
        </div>
      </div>

      <article
        className="screen-document mx-auto min-h-[1123px] max-w-[794px] bg-white px-8 py-6 shadow-2xl"
        style={{ "--document-primary": primaryColour } as CSSProperties}
      >
        <header className="border-b border-slate-300 pb-4">
          <div className="flex items-start justify-between gap-8">
            <div className="min-w-0">
              <div
                className="text-3xl font-bold tracking-tight"
                style={{ color: primaryColour }}
              >
                {settings.business.businessName}
              </div>

              {settings.branding.applicationSubtitle && (
                <div className="mt-1 text-sm text-slate-600">
                  {settings.branding.applicationSubtitle}
                </div>
              )}

              <div className="mt-2 text-[11px] font-medium text-slate-500">
                Powered by GreenFlow
              </div>
            </div>

            <div className="text-right">
              <div
                className="text-xl font-bold uppercase tracking-wide"
                style={{ color: primaryColour }}
              >
                {documentTitle}
              </div>

              <div className="mt-3 space-y-1 text-sm text-slate-700">
                <div>
                  Invoice No:{" "}
                  <span className="font-bold text-slate-900">
                    {completed
                      ? treatment.invoiceNumber || "Pending"
                      : "Not applicable"}
                  </span>
                </div>

                <div>
                  Date:{" "}
                  <span className="font-semibold text-slate-900">
                    {formatDate(getRecordDate(treatment))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-[11px] text-slate-700 sm:grid-cols-4">
            {settings.business.mobile && (
              <ContactItem icon="☎" value={settings.business.mobile} colour={primaryColour} />
            )}
            {settings.business.email && (
              <ContactItem icon="✉" value={settings.business.email} colour={primaryColour} />
            )}
            {settings.business.website && (
              <ContactItem icon="●" value={settings.business.website} colour={primaryColour} />
            )}
            {vatNumber && (
              <ContactItem icon="#" value={`VAT ${vatNumber}`} colour={primaryColour} />
            )}
          </div>
        </header>

        <section className="grid gap-8 border-b border-slate-300 py-5 md:grid-cols-2">
          <div>
            <SmallHeading colour={primaryColour}>Customer</SmallHeading>
            <div className="mt-3 text-lg font-bold text-slate-950">
              {customer.fullName}
            </div>
            <div className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
              {customerAddress}
            </div>
          </div>

          <div className="md:border-l md:border-slate-200 md:pl-8">
            <SmallHeading colour={primaryColour}>
              {settings.business.businessName}
            </SmallHeading>
            <div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
              {businessAddress}
            </div>
          </div>
        </section>

        <section className="grid gap-7 border-b border-slate-300 py-5 md:grid-cols-[1.7fr_0.8fr]">
          <div className="min-w-0 md:pr-6">
            <div className="border-b pb-2" style={{ borderColor: primaryColour }}>
              <SmallHeading colour={primaryColour}>
                Today&apos;s treatment
              </SmallHeading>
            </div>

            <h1 className="mt-3 text-xl font-bold text-slate-950">
              {treatment.treatmentName}
            </h1>

            <div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
              {visitInformation}
            </div>

            <div className="mt-6">
              <SmallHeading colour={primaryColour}>Technician notes</SmallHeading>
              <div className="mt-3 space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-4 border-b border-dashed border-slate-300"
                  />
                ))}
              </div>
            </div>
          </div>

          {completed && activeAdvisories.length > 0 && (
            <aside className="md:border-l md:border-slate-200 md:pl-6">
              <div className="border-b pb-2" style={{ borderColor: primaryColour }}>
                <SmallHeading colour={primaryColour}>
                  Aftercare & advice
                </SmallHeading>
              </div>

              <div className="mt-3 divide-y divide-dashed divide-slate-200">
                {activeAdvisories.map((advisory) => (
                  <AdviceCard
                    key={advisory.id}
                    title={normaliseAdviceTitle(advisory.title)}
                    detail={advisory.wording}
                    type={advisory.type}
                  />
                ))}
              </div>
            </aside>
          )}
        </section>

        {completed && (
          <section className="border-b border-slate-300 py-4">
            <div className="flex items-end justify-between gap-6">
              <div>
                <SmallHeading colour={primaryColour}>Invoice</SmallHeading>
                <div className="mt-2 text-sm text-slate-600">Treatment charge</div>
              </div>
              <div className="text-4xl font-bold tracking-tight" style={{ color: primaryColour }}>
                £{customer.treatmentPrice.toFixed(2)}
              </div>
            </div>
          </section>
        )}

        {nextVisit && (
          <section className={`mt-4 rounded-xl border px-5 py-4 ${
            nextVisit.isOverride
              ? "border-amber-200 bg-amber-50/40"
              : "border-green-200 bg-green-50/40"
          }`}>
            <div className="grid gap-5 md:grid-cols-[72px_1fr] md:items-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full border text-2xl"
                style={{ borderColor: primaryColour, color: primaryColour }}
                aria-hidden="true"
              >
                ▣
              </div>

              <div>
                <div className={`text-xs font-bold uppercase tracking-[0.16em] ${
                  nextVisit.isOverride ? "text-amber-700" : "text-green-700"
                }`}>
                  {nextVisit.label}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {getNextVisitTreatmentName({
                    treatment,
                    customerNumber: customer.customerNumber,
                    programmes,
                  })}
                </div>
                <div className={`mt-1 text-[34px] font-bold leading-none tracking-tight ${
                  nextVisit.isOverride ? "text-amber-900" : "text-green-900"
                }`}>
                  {formatDate(nextVisit.date)}
                </div>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-4 border-t pt-3" style={{ borderColor: primaryColour }}>
          <div className="text-center text-sm font-medium" style={{ color: primaryColour }}>
            Thank you for choosing {settings.business.businessName}.
          </div>
        </footer>
      </article>

      <article
        className="print-document"
        style={{ "--document-primary": primaryColour } as CSSProperties}
      >
        <header className="border-b border-slate-300 pb-[3mm]">
          <div className="flex items-start justify-between gap-[8mm]">
            <div className="min-w-0">
              <div className="text-[22pt] font-bold leading-none" style={{ color: primaryColour }}>
                {settings.business.businessName}
              </div>
              {settings.branding.applicationSubtitle && (
                <div className="mt-[1mm] text-[9pt] text-slate-600">
                  {settings.branding.applicationSubtitle}
                </div>
              )}
              <div className="mt-[1.5mm] text-[7.5pt] text-slate-500">
                Powered by GreenFlow
              </div>
            </div>

            <div className="text-right">
              <div className="text-[13pt] font-bold uppercase tracking-wide" style={{ color: primaryColour }}>
                {documentTitle}
              </div>
              <div className="mt-[2mm] text-[8.5pt] leading-[1.35] text-slate-700">
                <div>
                  Invoice No: <strong>{completed ? treatment.invoiceNumber || "Pending" : "Not applicable"}</strong>
                </div>
                <div>
                  Date: <strong>{formatDate(getRecordDate(treatment))}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="print-contact-grid mt-[3mm] border-t border-slate-100 pt-[2mm] text-[7.5pt] text-slate-700">
            {settings.business.mobile ? (
              <PrintContactItem icon="☎" value={settings.business.mobile} colour={primaryColour} />
            ) : <span />}
            {settings.business.email ? (
              <PrintContactItem icon="✉" value={settings.business.email} colour={primaryColour} />
            ) : <span />}
            {settings.business.website ? (
              <PrintContactItem icon="●" value={settings.business.website} colour={primaryColour} />
            ) : <span />}
            {vatNumber ? (
              <PrintContactItem icon="#" value={`VAT ${vatNumber}`} colour={primaryColour} align="right" />
            ) : <span />}
          </div>
        </header>

        <section className="print-address-grid border-b border-slate-300 py-[4mm]">
          <div>
            <PrintHeading colour={primaryColour}>Customer</PrintHeading>
            <div className="mt-[1.5mm] text-[11pt] font-bold">{customer.fullName}</div>
            <div className="mt-[0.5mm] whitespace-pre-line text-[8.5pt] leading-[1.45] text-slate-700">
              {customerAddress}
            </div>
          </div>

          <div className="border-l border-slate-200 pl-[8mm]">
            <PrintHeading colour={primaryColour}>{settings.business.businessName}</PrintHeading>
            <div className="mt-[1.5mm] whitespace-pre-line text-[8.5pt] leading-[1.45] text-slate-700">
              {businessAddress}
            </div>
          </div>
        </section>

        <section className="print-treatment-grid border-b border-slate-300 py-[4mm]">
          <div className="min-w-0 pr-[4mm]">
            <div className="border-b pb-[1.5mm]" style={{ borderColor: primaryColour }}>
              <PrintHeading colour={primaryColour}>Today&apos;s treatment</PrintHeading>
            </div>

            <div className="mt-[2mm] text-[14pt] font-bold leading-tight">
              {treatment.treatmentName}
            </div>

            <div className="mt-[2mm] whitespace-pre-line text-[8.5pt] leading-[1.45] text-slate-700">
              {visitInformation}
            </div>

            <div className="mt-[4mm]">
              <PrintHeading colour={primaryColour}>Technician notes</PrintHeading>
              <div className="mt-[2mm] space-y-[2.8mm]">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-[3mm] border-b border-dashed border-slate-300" />
                ))}
              </div>
            </div>
          </div>

          {completed && activeAdvisories.length > 0 && (
            <aside className="border-l border-slate-200 pl-[6mm]">
              <div className="border-b pb-[1.5mm]" style={{ borderColor: primaryColour }}>
                <PrintHeading colour={primaryColour}>Aftercare & advice</PrintHeading>
              </div>

              <div className="mt-[1.5mm] divide-y divide-dashed divide-slate-200">
                {activeAdvisories.map((advisory) => (
                  <div key={advisory.id} className="py-[2mm] first:pt-0 last:pb-0">
                    <div className="text-[8pt] font-bold uppercase tracking-wide" style={{ color: primaryColour }}>
                      {normaliseAdviceTitle(advisory.title)}
                    </div>
                    <div className="mt-[0.7mm] text-[7.5pt] leading-[1.4] text-slate-700">
                      {advisory.wording}
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </section>

        {completed && (
          <section className="border-b border-slate-300 py-[3mm]">
            <div className="flex items-end justify-between gap-[8mm]">
              <div>
                <PrintHeading colour={primaryColour}>Invoice</PrintHeading>
                <div className="mt-[1mm] text-[8pt] text-slate-600">Treatment charge</div>
              </div>
              <div className="text-[23pt] font-bold leading-none" style={{ color: primaryColour }}>
                £{customer.treatmentPrice.toFixed(2)}
              </div>
            </div>
          </section>
        )}

        {nextVisit && (
          <section className={`mt-[4mm] rounded-[4mm] border px-[5mm] py-[4mm] ${
            nextVisit.isOverride
              ? "border-amber-200 bg-amber-50/40"
              : "border-green-200 bg-green-50/40"
          }`}>
            <div className="print-next-grid">
              <div
                className="flex h-[12mm] w-[12mm] items-center justify-center rounded-full border text-[14pt]"
                style={{ borderColor: primaryColour, color: primaryColour }}
                aria-hidden="true"
              >
                ▣
              </div>

              <div>
                <div className="text-[7.5pt] font-bold uppercase tracking-[0.14em]" style={{ color: primaryColour }}>
                  {nextVisit.label}
                </div>
                <div className="mt-[0.8mm] text-[8.5pt] font-semibold text-slate-900">
                  {getNextVisitTreatmentName({
                    treatment,
                    customerNumber: customer.customerNumber,
                    programmes,
                  })}
                </div>
                <div className="mt-[1mm] text-[22pt] font-bold leading-none" style={{ color: primaryColour }}>
                  {formatDate(nextVisit.date)}
                </div>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-[3mm] border-t pt-[2mm]" style={{ borderColor: primaryColour }}>
          <div className="text-center text-[8pt] font-medium" style={{ color: primaryColour }}>
            Thank you for choosing {settings.business.businessName}.
          </div>
        </footer>
      </article>
    </main>
  );
}

function ContactItem({
  icon,
  value,
  colour,
}: {
  icon: string;
  value: string;
  colour: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="font-bold" style={{ color: colour }} aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 break-words">{value}</span>
    </span>
  );
}

function PrintContactItem({
  icon,
  value,
  colour,
  align = "left",
}: {
  icon: string;
  value: string;
  colour: string;
  align?: "left" | "right";
}) {
  return (
    <span
      className={`inline-flex min-w-0 items-center gap-[1.5mm] ${
        align === "right" ? "justify-end" : "justify-start"
      }`}
    >
      <span className="shrink-0 font-bold" style={{ color: colour }} aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 break-words">{value}</span>
    </span>
  );
}

function PrintHeading({
  colour,
  children,
}: {
  colour: string;
  children: ReactNode;
}) {
  return (
    <div
      className="text-[7.5pt] font-bold uppercase tracking-[0.14em]"
      style={{ color: colour }}
    >
      {children}
    </div>
  );
}

function normaliseAdviceTitle(title: string) {
  const lower = title.trim().toLowerCase();

  if (lower.includes("access")) {
    return "Mowing";
  }

  return title;
}

function getNextVisitTreatmentName({
  treatment,
  customerNumber,
  programmes,
}: {
  treatment: TreatmentRecord;
  customerNumber: string;
  programmes: CustomerProgramme[];
}) {
  const candidate =
    programmes
      .filter(
        (programme) =>
          programme.customerNumber === customerNumber,
      )
      .flatMap((programme) => programme.visits)
      .filter(
        (visit) =>
          visit.scheduledDate > treatment.scheduledDate &&
          (visit.status === "Scheduled" ||
            visit.status === "Planned"),
      )
      .sort((first, second) =>
        first.scheduledDate.localeCompare(
          second.scheduledDate,
        ),
      )[0];

  return candidate?.treatmentName ?? "Next treatment";
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
  type: _type,
}: {
  title: string;
  detail: string;
  type: AdvisoryType;
}) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#338b45]"
          aria-hidden="true"
        />

        <div>
          <div className="text-sm font-bold uppercase tracking-wide text-[#176b37]">
            {title}
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-700">
            {detail}
          </p>
        </div>
      </div>
    </div>
  );
}