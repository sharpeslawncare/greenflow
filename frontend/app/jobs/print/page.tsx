"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  type CSSProperties,
  type ReactNode,
  useMemo,
} from "react";

import { AppShell } from "@/components/app-shell";
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
import {
  formatDateWithDay,
  getTodayDateValue,
} from "@/lib/date-utils";

type PrintJob = {
  id: string;
  programme: CustomerProgramme;
  visit: ProgrammeVisit;
  customer: ReturnType<
    typeof useCustomerStore
  >["customers"][number];
};

export default function DailyCustomerSheetsPage() {
  const searchParams =
    useSearchParams();

  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    programmes,
    ready: programmesReady,
  } = useProgrammeStore();

  const {
    settings,
    ready: settingsReady,
  } = useSettingsStore();

  const requestedDate =
    searchParams.get("date");

  const requestedGroup =
    Number(
      searchParams.get("group") ??
        "0",
    );

  const requestedVan =
    Number(
      searchParams.get("van") ??
        "0",
    );

  const selectedDate =
    isDateValue(requestedDate)
      ? requestedDate
      : getTodayDateValue();

  const jobs =
    useMemo<PrintJob[]>(() => {
      return programmes
        .flatMap((programme) => {
          const customer =
            customers.find(
              (item) =>
                item.customerNumber ===
                programme.customerNumber,
            );

          if (
            !customer ||
            customer.status !== "Active"
          ) {
            return [];
          }

          return programme.visits
            .filter(
              (visit) =>
                visit.scheduledDate ===
                  selectedDate &&
                (visit.status ===
                  "Scheduled" ||
                  visit.status ===
                    "Planned"),
            )
            .map((visit) => ({
              id: `${programme.id}-${visit.id}`,
              programme,
              visit,
              customer,
            }));
        })
        .filter(
          (job) =>
            (requestedGroup <= 0 ||
              job.customer
                .groupNumber ===
                requestedGroup) &&
            (requestedVan <= 0 ||
              job.customer.vanNumber ===
                requestedVan),
        )
        .sort(
          (first, second) => {
            if (
              first.customer
                .groupNumber !==
              second.customer
                .groupNumber
            ) {
              return (
                first.customer
                  .groupNumber -
                second.customer
                  .groupNumber
              );
            }

            if (
              first.customer
                .vanNumber !==
              second.customer
                .vanNumber
            ) {
              return (
                first.customer
                  .vanNumber -
                second.customer
                  .vanNumber
              );
            }

            return first.customer.fullName.localeCompare(
              second.customer.fullName,
            );
          },
        );
    }, [
      programmes,
      customers,
      selectedDate,
      requestedGroup,
      requestedVan,
    ]);

  const activeAdvisories =
    settings.advisories
      .filter(
        (advisory) =>
          advisory.active,
      )
      .slice(0, 3);

  const ready =
    customersReady &&
    programmesReady &&
    settingsReady;

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Preparing customer sheets...
          </div>
        </main>
      </AppShell>
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

  return (
    <AppShell>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }

        .customer-sheet-print {
          display: none;
        }

        @media print {
          html,
          body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }

          aside {
            display: none !important;
          }

          .customer-sheet-screen {
            display: none !important;
          }

          .customer-sheet-print {
            display: block !important;
          }

          .customer-sheet-page {
            box-sizing: border-box !important;
            width: 194mm !important;
            min-height: 279mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            break-after: page !important;
            page-break-after: always !important;
            color: #0f172a !important;
            font-family:
              Arial,
              Helvetica,
              sans-serif !important;
          }

          .customer-sheet-page:last-child {
            break-after: auto !important;
            page-break-after: auto !important;
          }

          .customer-sheet-page * {
            box-sizing: border-box !important;
          }

          .customer-sheet-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <main className="customer-sheet-screen p-5 md:p-7">
        <div className="mx-auto max-w-5xl">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link
                href={`/jobs?date=${selectedDate}${
                  requestedGroup > 0
                    ? `&group=${requestedGroup}`
                    : ""
                }${
                  requestedVan > 0
                    ? `&van=${requestedVan}`
                    : ""
                }`}
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Back to Today&apos;s Jobs
              </Link>

              <h1 className="mt-2 text-3xl font-bold">
                Customer Sheets
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Print one customer-facing treatment and invoice information sheet for every scheduled visit on the selected day.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                window.print()
              }
              disabled={
                jobs.length === 0
              }
              className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#125b2f] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Print {jobs.length} Customer Sheet
              {jobs.length === 1
                ? ""
                : "s"}
            </button>
          </header>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <PreviewStat
                label="Working date"
                value={formatDateWithDay(
                  selectedDate,
                )}
              />

              <PreviewStat
                label="Sheets"
                value={String(
                  jobs.length,
                )}
              />

              <PreviewStat
                label="Scope"
                value={
                  requestedGroup > 0
                    ? `Group ${requestedGroup}`
                    : "All scheduled groups"
                }
              />
            </div>

            {jobs.length === 0 ? (
              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
                No scheduled customer sheets are available for this date.
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[70px_1.2fr_1.7fr_1.3fr_90px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>#</span>
                  <span>Customer</span>
                  <span>Address</span>
                  <span>Treatment</span>
                  <span>Price</span>
                </div>

                {jobs.map(
                  (job, index) => (
                    <div
                      key={job.id}
                      className="grid grid-cols-[70px_1.2fr_1.7fr_1.3fr_90px] items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm"
                    >
                      <span className="font-bold text-slate-400">
                        {index + 1}
                      </span>

                      <div>
                        <div className="font-semibold">
                          {
                            job.customer
                              .fullName
                          }
                        </div>

                        <div className="mt-0.5 text-xs text-slate-500">
                          #
                          {
                            job.customer
                              .customerNumber
                          }
                        </div>
                      </div>

                      <span className="text-slate-600">
                        {
                          job.customer
                            .address
                        }
                        ,{" "}
                        {
                          job.customer
                            .postcode
                        }
                      </span>

                      <span className="font-semibold">
                        {
                          job.visit
                            .treatmentName
                        }
                      </span>

                      <span className="font-bold">
                        £
                        {job.customer.treatmentPrice.toFixed(
                          2,
                        )}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      <div className="customer-sheet-print">
        {jobs.map((job) => {
          const nextVisit =
            getNextProgrammeVisit(
              job.programme,
              job.visit,
            );

          const customerAddress =
            joinAddress([
              job.customer.address,
              job.customer.postcode,
            ]);

          const visitInformation =
            createScheduledVisitInformation(
              job.visit.treatmentName,
              settings.treatmentWording,
            );

          return (
            <article
              key={job.id}
              className="customer-sheet-page"
              style={
                {
                  "--document-primary":
                    primaryColour,
                } as CSSProperties
              }
            >
              <header className="customer-sheet-avoid border-b border-slate-300 pb-[4mm]">
                <div className="flex items-start justify-between gap-[10mm]">
                  <div>
                    <div
                      className="text-[22pt] font-bold leading-none"
                      style={{
                        color:
                          primaryColour,
                      }}
                    >
                      {
                        settings
                          .business
                          .businessName
                      }
                    </div>

                    {settings.branding
                      .applicationSubtitle && (
                      <div className="mt-[1mm] text-[9pt] text-slate-600">
                        {
                          settings
                            .branding
                            .applicationSubtitle
                        }
                      </div>
                    )}

                    <div className="mt-[1.5mm] text-[7.5pt] text-slate-500">
                      Powered by GreenFlow
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className="text-[13pt] font-bold uppercase tracking-wide"
                      style={{
                        color:
                          primaryColour,
                      }}
                    >
                      Treatment & Invoice
                    </div>

                    <div className="mt-[2mm] text-[8.5pt] text-slate-700">
                      {formatDateWithDay(
                        selectedDate,
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-[3mm] grid grid-cols-4 gap-[3mm] border-t border-slate-100 pt-[2mm] text-[7.2pt] text-slate-700">
                  <ContactStripItem
                    label="Phone"
                    value={
                      settings.business
                        .mobile
                    }
                    colour={
                      primaryColour
                    }
                  />

                  <ContactStripItem
                    label="Email"
                    value={
                      settings.business
                        .email
                    }
                    colour={
                      primaryColour
                    }
                  />

                  <ContactStripItem
                    label="Web"
                    value={
                      settings.business
                        .website
                    }
                    colour={
                      primaryColour
                    }
                  />

                  <ContactStripItem
                    label="Customer"
                    value={`#${job.customer.customerNumber}`}
                    colour={
                      primaryColour
                    }
                  />
                </div>
              </header>

              <section className="customer-sheet-avoid grid grid-cols-2 gap-[10mm] border-b border-slate-300 py-[5mm]">
                <div>
                  <PrintHeading
                    colour={
                      primaryColour
                    }
                  >
                    Customer
                  </PrintHeading>

                  <div className="mt-[1.5mm] text-[12pt] font-bold">
                    {
                      job.customer
                        .fullName
                    }
                  </div>

                  <div className="mt-[1mm] whitespace-pre-line text-[9pt] leading-[1.45] text-slate-700">
                    {customerAddress}
                  </div>
                </div>

                <div className="border-l border-slate-200 pl-[8mm]">
                  <PrintHeading
                    colour={
                      primaryColour
                    }
                  >
                    {
                      settings.business
                        .businessName
                    }
                  </PrintHeading>

                  <div className="mt-[1.5mm] whitespace-pre-line text-[9pt] leading-[1.45] text-slate-700">
                    {businessAddress}
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-[1.65fr_0.85fr] gap-[7mm] border-b border-slate-300 py-[5mm]">
                <div className="pr-[4mm]">
                  <div
                    className="border-b pb-[1.5mm]"
                    style={{
                      borderColor:
                        primaryColour,
                    }}
                  >
                    <PrintHeading
                      colour={
                        primaryColour
                      }
                    >
                      Today&apos;s treatment
                    </PrintHeading>
                  </div>

                  <div className="mt-[2mm] text-[15pt] font-bold">
                    {
                      job.visit
                        .treatmentName
                    }
                  </div>

                  <div className="mt-[2mm] whitespace-pre-line text-[9pt] leading-[1.5] text-slate-700">
                    {visitInformation}
                  </div>

                  <div className="mt-[5mm]">
                    <PrintHeading
                      colour={
                        primaryColour
                      }
                    >
                      Technician notes
                    </PrintHeading>

                    <div className="mt-[2mm] space-y-[3.2mm]">
                      {Array.from({
                        length: 4,
                      }).map(
                        (
                          _,
                          index,
                        ) => (
                          <div
                            key={
                              index
                            }
                            className="h-[3mm] border-b border-dashed border-slate-300"
                          />
                        ),
                      )}
                    </div>
                  </div>
                </div>

                <aside className="border-l border-slate-200 pl-[6mm]">
                  <div
                    className="border-b pb-[1.5mm]"
                    style={{
                      borderColor:
                        primaryColour,
                    }}
                  >
                    <PrintHeading
                      colour={
                        primaryColour
                      }
                    >
                      Aftercare & advice
                    </PrintHeading>
                  </div>

                  <div className="mt-[1.5mm] divide-y divide-dashed divide-slate-200">
                    {activeAdvisories.map(
                      (
                        advisory,
                      ) => (
                        <div
                          key={
                            advisory.id
                          }
                          className="py-[2.3mm] first:pt-0 last:pb-0"
                        >
                          <div
                            className="text-[8pt] font-bold uppercase tracking-wide"
                            style={{
                              color:
                                primaryColour,
                            }}
                          >
                            {normaliseAdviceTitle(
                              advisory.title,
                            )}
                          </div>

                          <div className="mt-[0.8mm] text-[7.7pt] leading-[1.4] text-slate-700">
                            {
                              advisory.wording
                            }
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </aside>
              </section>

              <section className="customer-sheet-avoid border-b border-slate-300 py-[4mm]">
                <div className="flex items-end justify-between gap-[8mm]">
                  <div>
                    <PrintHeading
                      colour={
                        primaryColour
                      }
                    >
                      Invoice
                    </PrintHeading>

                    <div className="mt-[1mm] text-[8pt] text-slate-600">
                      Treatment charge
                    </div>
                  </div>

                  <div
                    className="text-[25pt] font-bold leading-none"
                    style={{
                      color:
                        primaryColour,
                    }}
                  >
                    £
                    {job.customer.treatmentPrice.toFixed(
                      2,
                    )}
                  </div>
                </div>
              </section>

              {nextVisit && (
                <section className="customer-sheet-avoid mt-[5mm] rounded-[4mm] border border-green-200 bg-green-50/40 px-[5mm] py-[4mm]">
                  <div className="grid grid-cols-[14mm_1fr] items-center gap-[5mm]">
                    <div
                      className="flex h-[12mm] w-[12mm] items-center justify-center rounded-full border text-[14pt]"
                      style={{
                        borderColor:
                          primaryColour,
                        color:
                          primaryColour,
                      }}
                      aria-hidden="true"
                    >
                      ▣
                    </div>

                    <div>
                      <div
                        className="text-[7.5pt] font-bold uppercase tracking-[0.14em]"
                        style={{
                          color:
                            primaryColour,
                        }}
                      >
                        Next planned treatment
                      </div>

                      <div className="mt-[0.8mm] text-[8.5pt] font-semibold">
                        {
                          nextVisit
                            .treatmentName
                        }
                      </div>

                      <div
                        className="mt-[1mm] text-[23pt] font-bold leading-none"
                        style={{
                          color:
                            primaryColour,
                        }}
                      >
                        {formatDate(
                          nextVisit.scheduledDate,
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <footer
                className="customer-sheet-avoid mt-[4mm] border-t pt-[2mm]"
                style={{
                  borderColor:
                    primaryColour,
                }}
              >
                <div
                  className="text-center text-[8pt] font-medium"
                  style={{
                    color:
                      primaryColour,
                  }}
                >
                  Thank you for choosing{" "}
                  {
                    settings.business
                      .businessName
                  }
                  .
                </div>
              </footer>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}

function PreviewStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-2 font-semibold">
        {value}
      </div>
    </div>
  );
}

function ContactStripItem({
  label,
  value,
  colour,
}: {
  label: string;
  value: string;
  colour: string;
}) {
  return (
    <div className="min-w-0">
      <div
        className="font-bold uppercase tracking-wide"
        style={{
          color: colour,
        }}
      >
        {label}
      </div>

      <div className="mt-[0.5mm] break-words">
        {value || "—"}
      </div>
    </div>
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
      style={{
        color: colour,
      }}
    >
      {children}
    </div>
  );
}

function normaliseAdviceTitle(
  title: string,
) {
  const lower =
    title.trim().toLowerCase();

  if (
    lower.includes("access")
  ) {
    return "Mowing";
  }

  return title;
}

function createScheduledVisitInformation(
  treatmentName: string,
  wording: TreatmentWordingSettings,
) {
  const name =
    treatmentName.toLowerCase();

  if (name.includes("moss")) {
    return wording.mossControlVisit;
  }

  if (name.includes("aerat")) {
    return wording.aerationVisit;
  }

  if (name.includes("scarif")) {
    return wording.scarificationVisit;
  }

  if (name.includes("seed")) {
    return wording.overseedingVisit;
  }

  return wording.seasonalFertiliserVisit;
}

function getNextProgrammeVisit(
  programme: CustomerProgramme,
  currentVisit: ProgrammeVisit,
) {
  return (
    programme.visits
      .filter(
        (visit) =>
          visit.scheduledDate >
            currentVisit.scheduledDate &&
          (visit.status ===
            "Scheduled" ||
            visit.status ===
              "Planned"),
      )
      .sort((first, second) =>
        first.scheduledDate.localeCompare(
          second.scheduledDate,
        ),
      )[0] ?? null
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
  value: string | null,
): value is string {
  return Boolean(
    value &&
      /^\d{4}-\d{2}-\d{2}$/.test(
        value,
      ),
  );
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

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(parseDate(value));
}