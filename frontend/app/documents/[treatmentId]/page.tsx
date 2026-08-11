"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  CustomerTreatmentDocument,
  CustomerTreatmentDocumentPrintStyles,
} from "@/components/customer-treatment-document";
import { useCustomerStore } from "@/components/customer-store";
import {
  type CustomerProgramme,
  type ProgrammeVisit,
  useProgrammeStore,
} from "@/components/programme-store";
import {
  type TreatmentWordingSettings,
  useSettingsStore,
} from "@/components/settings-store";
import {
  getTreatmentDocumentWordingKey,
  useTreatmentDocumentWording,
} from "@/components/treatment-document-wording-store";
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

  const {
    wording: documentWording,
    ready: documentWordingReady,
  } = useTreatmentDocumentWording();

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
    settingsReady &&
    documentWordingReady;

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

  const invoiceReference =
    treatment.invoiceNumber.trim();

  const documentDate =
    getRecordDate(
      treatment,
    );

  const invoiceProblems: string[] = [];

  if (completed) {
    if (!invoiceReference) {
      invoiceProblems.push(
        "The invoice number is missing.",
      );
    }

    if (
      !Number.isFinite(
        customer.treatmentPrice,
      ) ||
      customer.treatmentPrice <= 0
    ) {
      invoiceProblems.push(
        "The customer treatment price must be greater than £0.00.",
      );
    }

    if (
      !isDateValue(
        documentDate,
      )
    ) {
      invoiceProblems.push(
        "The completed treatment does not have a valid document date.",
      );
    }
  }

  const invoiceBlocked =
    completed &&
    invoiceProblems.length > 0;

  const documentTitle =
    completed
      ? "Treatment report & invoice"
      : "Visit outcome record";

  const treatmentWording =
    documentWording[
      getTreatmentDocumentWordingKey(
        treatment.treatmentName,
      )
    ];

  const visitInformation =
    completed
      ? treatmentWording.description
      : createCustomerSafeVisitInformation(
          treatment,
          settings.treatmentWording,
        );

  const primaryColour =
    settings.branding.primaryColour ||
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
      settings.business as
        typeof settings.business &
          BusinessWithVat
    ).vatNumber?.trim() ?? "";

  const customerAddress =
    joinAddress([
      customer.address,
      customer.postcode,
    ]);

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

  const nextVisitDocument =
    nextVisit
      ? {
          label:
            nextVisit.label,
          treatmentName:
            getNextVisitTreatmentName({
              treatment,
              customerNumber:
                customer.customerNumber,
              programmes,
            }),
          date:
            formatDate(
              nextVisit.date,
            ),
          isOverride:
            nextVisit.isOverride,
        }
      : null;

  return (
    <main data-treatment-document-page className="min-h-screen bg-slate-200 px-4 py-6 print:min-h-0 print:bg-white print:p-0">
      <CustomerTreatmentDocumentPrintStyles />

      <style jsx global>{`
        @media print {
          html,
          body {
            width: auto !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }

          body > div {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }

          main[data-treatment-document-page] {
            display: block !important;
            position: static !important;
            width: auto !important;
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }

          .individual-print-document {
            position: absolute !important;
            top: 0 !important;
            left: 50% !important;
            width: 190mm !important;
            margin: 0 !important;
            padding: 0 !important;
            transform: translateX(-50%) !important;
          }
        }
      `}</style>

      {invoiceBlocked && (
        <div
          role="alert"
          className="print-hide mx-auto mb-4 max-w-[190mm] rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm leading-6 text-red-900"
        >
          <div className="font-bold">
            Invoice unavailable
          </div>

          <p className="mt-1">
            GreenFlow has blocked this completed-treatment invoice because one or more required invoice checks failed.
          </p>

          <ul className="mt-2 list-disc space-y-1 pl-5">
            {invoiceProblems.map(
              (problem) => (
                <li key={problem}>
                  {problem}
                </li>
              ),
            )}
          </ul>

          <p className="mt-2">
            Customer #{customer.customerNumber} · Treatment: {treatment.treatmentName}
          </p>
        </div>
      )}

      <div className="print-hide mx-auto mb-4 flex max-w-[190mm] flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/documents"
            className="font-semibold text-[#176b37] hover:underline"
          >
            ← Back to documents
          </Link>

          <h1 className="mt-1 text-xl font-bold">
            {documentTitle}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/customers/${customer.customerNumber}`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
          >
            Open customer
          </Link>

          <button
            type="button"
            disabled={invoiceBlocked}
            onClick={() => {
              if (
                invoiceBlocked
              ) {
                return;
              }

              window.print();
            }}
            title={
              invoiceBlocked
                ? "This completed treatment has invoice validation errors that must be corrected before printing."
                : undefined
            }
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white ${
              invoiceBlocked
                ? "cursor-not-allowed bg-slate-400"
                : "bg-[#176b37] hover:bg-[#125b2f]"
            }`}
          >
            Print or save PDF
          </button>
        </div>
      </div>

      <div className="individual-print-document mx-auto w-[190mm]">
        {invoiceBlocked ? (
          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-red-800">
              Invoice unavailable
            </h2>

            <p className="mt-3 text-slate-600">
              This completed treatment cannot be presented as an invoice until all invoice-integrity checks pass.
            </p>

            <ul className="mx-auto mt-4 max-w-xl list-disc space-y-2 pl-5 text-left text-sm text-slate-600">
              {invoiceProblems.map(
                (problem) => (
                  <li key={problem}>
                    {problem}
                  </li>
                ),
              )}
            </ul>

            <p className="mt-4 text-sm text-slate-500">
              Return to GreenFlow and correct the underlying treatment or customer record before printing or saving this document.
            </p>
          </div>
        ) : (
        <CustomerTreatmentDocument
          businessName={
            settings.business
              .businessName
          }
          businessAddress={
            businessAddress
          }
          mobile={
            settings.business.mobile ||
            ""
          }
          email={
            settings.business.email ||
            ""
          }
          website={
            settings.business.website ||
            ""
          }
          vatNumber={vatNumber}
          primaryColour={
            primaryColour
          }
          customerName={
            customer.fullName
          }
          customerAddress={
            customerAddress
          }
          customerNumber={
            customer.customerNumber
          }
          visitDate={
            formatDate(
              documentDate,
            )
          }
          treatmentTitle={
            completed
              ? treatmentWording.title
              : treatment.treatmentName
          }
          invoiceLabel="Invoice"
          invoiceReference={
            invoiceReference
          }
          treatmentDescription={
            visitInformation
          }
          mowingAdvice={
            completed
              ? treatmentWording
                  .mowingAdvice
              : ""
          }
          wateringAdvice={
            completed
              ? treatmentWording
                  .wateringAdvice
              : ""
          }
          safetyAdvice={
            completed
              ? treatmentWording
                  .safetyAdvice
              : ""
          }
          treatmentPrice={
            completed
              ? Number(
                  customer.treatmentPrice.toFixed(
                    2,
                  ),
                )
              : undefined
          }
          nextVisit={
            nextVisitDocument
          }
          showAftercare={
            completed
          }
          showPayment={
            completed
          }
          previewShadow
        />
        )}
      </div>
    </main>
  );
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