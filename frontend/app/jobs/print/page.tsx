"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useMemo,
} from "react";

import { AppShell } from "@/components/app-shell";
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
  useSettingsStore,
} from "@/components/settings-store";
import {
  getTreatmentDocumentWordingKey,
  useTreatmentDocumentWording,
} from "@/components/treatment-document-wording-store";
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

type BusinessWithVat = {
  vatNumber?: string;
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

  const {
    wording: documentWording,
    ready: documentWordingReady,
  } = useTreatmentDocumentWording();

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

  const ready =
    customersReady &&
    programmesReady &&
    settingsReady &&
    documentWordingReady;

  if (!ready) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
          Preparing customer sheets...
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
    <>
      <AppShell>
        <style jsx global>{`
          .customer-sheet-print {
            display: none;
          }

          @media print {
            .customer-sheet-screen {
              display: none !important;
            }

            .customer-sheet-print {
              display: block !important;
              margin: 0 !important;
              padding: 0 !important;
            }
          }
        `}</style>

        <CustomerTreatmentDocumentPrintStyles />

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
                value={`${jobs.length} customer sheet${
                  jobs.length === 1 ? "" : "s"
                }`}
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

      </AppShell>

      <div className="customer-sheet-print">
        {jobs.map((job, index) => {
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

          const treatmentWording =
            documentWording[
              getTreatmentDocumentWordingKey(
                job.visit.treatmentName,
              )
            ];

          return (
            <CustomerTreatmentDocument
              key={job.id}
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
              vatNumber={
                vatNumber
              }
              primaryColour={
                primaryColour
              }
              customerName={
                job.customer.fullName
              }
              customerAddress={
                customerAddress
              }
              customerNumber={
                job.customer
                  .customerNumber
              }
              visitDate={
                formatDate(
                  selectedDate,
                )
              }
              treatmentTitle={
                treatmentWording.title
              }
              invoiceLabel="Invoice / Reference"
              invoiceReference={
                job.customer
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
                job.customer
                  .treatmentPrice
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
                          nextVisit
                            .scheduledDate,
                        ),
                      isOverride:
                        false,
                    }
                  : null
              }
              pageBreakAfter={
                index <
                jobs.length - 1
              }
            />
          );
        })}
      </div>
    </>
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