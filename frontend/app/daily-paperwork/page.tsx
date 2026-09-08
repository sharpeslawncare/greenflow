"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import {
  CustomerTreatmentDocument,
  CustomerTreatmentDocumentPrintStyles,
} from "@/components/customer-treatment-document";
import {
  type StoredCustomer,
  useCustomerStore,
} from "@/components/customer-store";
import {
  type CustomerProgramme,
  useProgrammeStore,
} from "@/components/programme-store";
import { useRouteOrderStore } from "@/components/route-order-store";
import { useSettingsStore } from "@/components/settings-store";
import {
  getTreatmentDocumentWordingKey,
  useTreatmentDocumentWording,
} from "@/components/treatment-document-wording-store";
import { useTreatmentStore } from "@/components/treatment-store";
import {
  formatDateWithDay,
  getTodayDateValue,
} from "@/lib/date-utils";

type DailyPaperworkItem = {
  id: string;
  source: "programme" | "additional";
  customer: StoredCustomer;
  treatmentName: string;
  price: number;
  scheduledDate: string;
  programmeId: string;
  programmeVisitId: string;
  completed: boolean;
};

type BusinessWithVat = {
  vatNumber?: string;
};

export default function DailyPaperworkPage() {
  const searchParams = useSearchParams();

  const requestedDate =
    searchParams.get("date") ?? "";

  const selectedDate =
    isDateValue(requestedDate)
      ? requestedDate
      : getTodayDateValue();

  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    programmes,
    ready: programmesReady,
  } = useProgrammeStore();

  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const {
    settings,
    ready: settingsReady,
  } = useSettingsStore();

  const {
    wording: documentWording,
    ready: documentWordingReady,
  } = useTreatmentDocumentWording();

  const {
    ready: routeOrderReady,
    sortBySavedRoute,
  } = useRouteOrderStore();

  const activeCustomers = useMemo(
    () =>
      customers.filter(
        (customer) =>
          customer.status === "Active",
      ),
    [customers],
  );

  const paperworkItems =
    useMemo<DailyPaperworkItem[]>(() => {
      const programmeItems =
        programmes.flatMap(
          (programme) => {
            const customer =
              activeCustomers.find(
                (item) =>
                  item.customerNumber ===
                  programme.customerNumber,
              );

            if (!customer) {
              return [];
            }

            return programme.visits
              .filter(
                (visit) =>
                  visit.scheduledDate ===
                    selectedDate &&
                  (
                    visit.status ===
                      "Scheduled" ||
                    visit.status ===
                      "Planned" ||
                    visit.status ===
                      "Completed"
                  ),
              )
              .map((visit) => {
                const completed =
                  treatments.some(
                    (treatment) =>
                      treatment.status ===
                        "Completed" &&
                      (
                        (
                          treatment.programmeId ===
                            programme.id &&
                          treatment.programmeVisitId ===
                            visit.id
                        ) ||
                        (
                          !treatment.programmeVisitId &&
                          treatment.customerNumber ===
                            customer.customerNumber &&
                          treatment.scheduledDate ===
                            visit.scheduledDate &&
                          treatment.treatmentName ===
                            visit.treatmentName
                        )
                      ),
                  );

                return {
                  id:
                    `programme-${programme.id}-${visit.id}`,
                  source:
                    "programme" as const,
                  customer,
                  treatmentName:
                    visit.treatmentName,
                  price:
                    customer.treatmentPrice,
                  scheduledDate:
                    visit.scheduledDate,
                  programmeId:
                    programme.id,
                  programmeVisitId:
                    visit.id,
                  completed,
                };
              });
          },
        );

      const additionalItems =
        activeCustomers.flatMap(
          (customer) =>
            (customer.additionalJobs ?? [])
              .filter(
                (job) =>
                  job.scheduledDate ===
                    selectedDate &&
                  (
                    job.status ===
                      "Scheduled" ||
                    job.status ===
                      "Completed"
                  ),
              )
              .map((job) => ({
                id:
                  `additional-${customer.customerNumber}-${job.id}`,
                source:
                  "additional" as const,
                customer,
                treatmentName:
                  job.treatmentName,
                price: job.price,
                scheduledDate:
                  job.scheduledDate,
                programmeId:
                  `additional-jobs-${customer.customerNumber}`,
                programmeVisitId:
                  job.id,
                completed:
                  job.status ===
                  "Completed",
              })),
        );

      return sortBySavedRoute(
        [
          ...programmeItems,
          ...additionalItems,
        ],
        selectedDate,
      );
    }, [
      activeCustomers,
      programmes,
      selectedDate,
      sortBySavedRoute,
      treatments,
    ]);

  const routeStops = useMemo(
    () =>
      createRouteStops(
        paperworkItems,
      ),
    [paperworkItems],
  );

  const ready =
    customersReady &&
    programmesReady &&
    treatmentsReady &&
    settingsReady &&
    documentWordingReady &&
    routeOrderReady;

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-2xl bg-white p-10 text-slate-500 shadow-sm">
          Preparing daily paperwork...
        </div>
      </main>
    );
  }

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

  return (
    <main
      data-daily-paperwork-page
      className="min-h-screen bg-slate-100 px-4 py-6 print:min-h-0 print:bg-white print:p-0"
    >
      <CustomerTreatmentDocumentPrintStyles />

      <style jsx global>{`
        @media print {
          main[data-daily-paperwork-page] {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .daily-paperwork-print-stack {
            width: 190mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }

          .daily-paperwork-print-stack
            > .paperwork-sheet {
            width: 190mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <div className="print-hide mx-auto mb-5 max-w-[1180px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                href={`/?date=${selectedDate}`}
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Dashboard
              </Link>

              <div className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[#176b37]">
                Day preparation
              </div>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                Print day&apos;s paperwork
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {formatDateWithDay(
                  selectedDate,
                )} · paperwork follows the same saved customer-stop route order used by Groups &amp; Routes, Jobs and Visit Centre.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/routes?date=${selectedDate}`}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Review route
              </Link>

              <button
                type="button"
                disabled={
                  paperworkItems.length ===
                  0
                }
                onClick={() =>
                  window.print()
                }
                className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white transition ${
                  paperworkItems.length ===
                  0
                    ? "cursor-not-allowed bg-slate-400"
                    : "bg-[#176b37] hover:bg-[#125b2f]"
                }`}
              >
                Print all paperwork
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Customer stops"
              value={String(
                routeStops.length,
              )}
              detail="Canonical route order"
            />

            <SummaryCard
              label="Sheets"
              value={String(
                paperworkItems.length,
              )}
              detail="One sheet per job"
            />

            <SummaryCard
              label="Programme"
              value={String(
                paperworkItems.filter(
                  (item) =>
                    item.source ===
                    "programme",
                ).length,
              )}
              detail="Seasonal visits"
            />

            <SummaryCard
              label="Additional"
              value={String(
                paperworkItems.filter(
                  (item) =>
                    item.source ===
                    "additional",
                ).length,
              )}
              detail="Additional Jobs"
            />
          </div>
        </div>

        {paperworkItems.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm font-semibold text-blue-900">
            No programme visits or scheduled Additional Jobs are recorded for{" "}
            {formatDateWithDay(
              selectedDate,
            )}.
          </div>
        ) : (
          <section className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                  Print order
                </div>

                <h2 className="mt-1 text-xl font-bold text-blue-950">
                  Route preview
                </h2>

                <p className="mt-1 text-sm leading-6 text-blue-900">
                  Customers with more than one job stay together at the same route stop. Their individual sheets print one after another.
                </p>
              </div>

              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-800">
                {routeStops.length} stop
                {routeStops.length === 1
                  ? ""
                  : "s"}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {routeStops.map(
                (stop, index) => (
                  <div
                    key={`${stop.vanNumber}-${stop.customerNumber}`}
                    className="grid gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 sm:grid-cols-[46px_1fr_auto] sm:items-center"
                  >
                    <div className="text-center text-lg font-black text-blue-900">
                      {index + 1}
                    </div>

                    <div>
                      <div className="font-bold text-slate-950">
                        {stop.customerName}
                      </div>

                      <div className="mt-0.5 text-xs text-slate-500">
                        {stop.postcode} ·{" "}
                        {stop.treatmentNames.join(
                          " + ",
                        )}
                      </div>
                    </div>

                    <div className="text-xs font-bold text-slate-500">
                      {stop.jobCount} sheet
                      {stop.jobCount === 1
                        ? ""
                        : "s"}
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>
        )}
      </div>

      {paperworkItems.length > 0 && (
        <div className="daily-paperwork-print-stack mx-auto w-[190mm] space-y-5 print:space-y-0">
          {paperworkItems.map(
            (item, index) => {
              const wordingKey =
                getTreatmentDocumentWordingKey(
                  item.treatmentName,
                );

              const treatmentWording =
                documentWording[
                  wordingKey
                ];

              const nextVisit =
                findNextPlannedVisit({
                  programmes,
                  customerNumber:
                    item.customer
                      .customerNumber,
                  afterDate:
                    item.scheduledDate,
                });

              return (
                <div
                  key={item.id}
                  className="paperwork-sheet"
                >
                  <CustomerTreatmentDocument
                    businessName={
                      settings.business
                        .businessName
                    }
                    businessAddress={
                      businessAddress
                    }
                    mobile={
                      settings.business
                        .mobile || ""
                    }
                    email={
                      settings.business
                        .email || ""
                    }
                    website={
                      settings.business
                        .website || ""
                    }
                    vatNumber={vatNumber}
                    primaryColour={
                      primaryColour
                    }
                    customerName={
                      item.customer
                        .fullName
                    }
                    customerAddress={joinAddress([
                      item.customer
                        .address,
                      item.customer
                        .postcode,
                    ])}
                    customerNumber={
                      item.customer
                        .customerNumber
                    }
                    visitDate={formatDate(
                      item.scheduledDate,
                    )}
                    treatmentTitle={
                      item.source ===
                      "additional"
                        ? item.treatmentName
                        : treatmentWording
                            .title
                    }
                    invoiceLabel="Customer reference"
                    invoiceReference={
                      item.customer
                        .customerNumber
                    }
                    treatmentDescription={
                      treatmentWording
                        .description
                    }
                    mowingAdvice={
                      treatmentWording
                        .mowingAdvice
                    }
                    wateringAdvice={
                      treatmentWording
                        .wateringAdvice
                    }
                    safetyAdvice={
                      treatmentWording
                        .safetyAdvice
                    }
                    treatmentPrice={
                      item.price
                    }
                    nextVisit={
                      nextVisit
                        ? {
                            label:
                              "Next planned treatment",
                            treatmentName:
                              nextVisit
                                .treatmentName,
                            date:
                              formatDate(
                                nextVisit.date,
                              ),
                            isOverride:
                              false,
                          }
                        : null
                    }
                    showAftercare
                    showPayment
                    pageBreakAfter={
                      index <
                      paperworkItems.length -
                        1
                    }
                    previewShadow
                  />
                </div>
              );
            },
          )}
        </div>
      )}
    </main>
  );
}

function createRouteStops(
  items: DailyPaperworkItem[],
) {
  const stops: Array<{
    customerNumber: string;
    customerName: string;
    postcode: string;
    vanNumber: number;
    treatmentNames: string[];
    jobCount: number;
  }> = [];

  items.forEach((item) => {
    const previous =
      stops[stops.length - 1];

    if (
      previous &&
      previous.customerNumber ===
        item.customer.customerNumber &&
      previous.vanNumber ===
        item.customer.vanNumber
    ) {
      previous.jobCount += 1;

      if (
        !previous.treatmentNames.includes(
          item.treatmentName,
        )
      ) {
        previous.treatmentNames.push(
          item.treatmentName,
        );
      }

      return;
    }

    stops.push({
      customerNumber:
        item.customer.customerNumber,
      customerName:
        item.customer.fullName,
      postcode:
        item.customer.postcode,
      vanNumber:
        item.customer.vanNumber,
      treatmentNames: [
        item.treatmentName,
      ],
      jobCount: 1,
    });
  });

  return stops;
}

function findNextPlannedVisit({
  programmes,
  customerNumber,
  afterDate,
}: {
  programmes: CustomerProgramme[];
  customerNumber: string;
  afterDate: string;
}) {
  return (
    programmes
      .filter(
        (programme) =>
          programme.customerNumber ===
          customerNumber,
      )
      .flatMap(
        (programme) =>
          programme.visits,
      )
      .filter(
        (visit) =>
          visit.scheduledDate >
            afterDate &&
          (
            visit.status ===
              "Scheduled" ||
            visit.status ===
              "Planned"
          ),
      )
      .map((visit) => ({
        date:
          visit.scheduledDate,
        treatmentName:
          visit.treatmentName,
      }))
      .sort((first, second) =>
        first.date.localeCompare(
          second.date,
        ),
      )[0] ?? null
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black text-slate-950">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </div>
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

  const date = parseDate(value);

  return (
    !Number.isNaN(
      date.getTime(),
    ) &&
    toDateValue(date) === value
  );
}

function parseDate(
  value: string,
) {
  const [
    year,
    month,
    day,
  ] = value
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
  ).format(
    parseDate(value),
  );
}