"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { CSSProperties } from "react";

import { useEnquiryStore } from "@/components/enquiry-store";
import { useSettingsStore } from "@/components/settings-store";

export default function QuotePage() {
  const params = useParams<{
    enquiryId: string;
  }>();

  const {
    enquiries,
    ready: enquiriesReady,
  } = useEnquiryStore();

  const {
    settings,
    ready: settingsReady,
  } = useSettingsStore();

  const enquiry = enquiries.find(
    (item) =>
      item.id === params.enquiryId,
  );

  if (
    !enquiriesReady ||
    !settingsReady
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-2xl bg-white p-10 text-slate-500 shadow-sm">
          Loading quotation...
        </div>
      </main>
    );
  }

  if (!enquiry) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-lg rounded-2xl bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold">
            Quotation not found
          </h1>

          <p className="mt-3 text-slate-500">
            This enquiry is no longer available.
          </p>

          <Link
            href="/enquiries"
            className="mt-6 inline-flex rounded-xl bg-[#176b37] px-5 py-3 font-semibold text-white"
          >
            Return to enquiries
          </Link>
        </div>
      </main>
    );
  }

  const primaryColour =
    settings.branding.primaryColour ||
    "#176b37";

  const businessAddress = joinAddress([
    settings.business.addressLine1,
    settings.business.addressLine2,
    settings.business.town,
    settings.business.county,
    settings.business.postcode,
  ]);

  const customerName =
    enquiry.fullName ||
    [enquiry.firstName, enquiry.surname]
      .filter(Boolean)
      .join(" ");

  const quoteDate =
    enquiry.quoteDate ||
    enquiry.createdAt.slice(0, 10);

  const expiryDate =
    enquiry.quoteExpiryDate ||
    addDaysToDate(quoteDate, 30);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-[900px] flex-wrap items-center justify-between gap-3">
        <Link
          href="/enquiries"
          className="font-semibold text-[#176b37] hover:underline"
        >
          ← Back to enquiries
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
        className="mx-auto box-border min-h-[297mm] w-[210mm] bg-white p-[14mm] text-slate-900 shadow-lg print:min-h-0 print:shadow-none"
        style={
          {
            "--quote-primary":
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
              Lawn-care quotation
            </div>

            <div className="mt-3 text-sm text-slate-500">
              Reference:{" "}
              <strong className="text-slate-800">
                {enquiry.enquiryNumber}
              </strong>
            </div>
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
          </div>
        </header>

        <section className="mt-6 grid grid-cols-[1.25fr_0.75fr] gap-8">
          <div>
            <QuoteLabel
              colour={primaryColour}
            >
              Prepared for
            </QuoteLabel>

            <div className="mt-2 text-xl font-bold">
              {customerName ||
                "Prospective customer"}
            </div>

            <div className="mt-2 leading-6 text-slate-700">
              {enquiry.address}
            </div>

            <div className="leading-6 text-slate-700">
              {enquiry.postcode}
            </div>

            {enquiry.emailAddress && (
              <div className="mt-3 text-sm text-slate-600">
                {enquiry.emailAddress}
              </div>
            )}

            {enquiry.mobilePhone && (
              <div className="text-sm text-slate-600">
                {enquiry.mobilePhone}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <QuoteRow
              label="Quotation number"
              value={
                enquiry.enquiryNumber
              }
            />

            <QuoteRow
              label="Quote date"
              value={formatDate(
                quoteDate,
              )}
            />

            <QuoteRow
              label="Valid until"
              value={formatDate(
                expiryDate,
              )}
            />

            <QuoteRow
              label="Quote status"
              value={
                enquiry.quoteStatus
              }
            />
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 p-5">
          <QuoteLabel
            colour={primaryColour}
          >
            Proposed lawn-care service
          </QuoteLabel>

          <p className="mt-4 leading-7 text-slate-700">
            We are pleased to provide a
            quotation for regular seasonal
            lawn-care treatments at the
            property shown above.
          </p>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[1.5fr_0.75fr_0.75fr] bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              <span>Service</span>
              <span>Lawn area</span>
              <span className="text-right">
                Price per visit
              </span>
            </div>

            <div className="grid grid-cols-[1.5fr_0.75fr_0.75fr] items-center border-t border-slate-200 px-4 py-5">
              <div>
                <div className="font-bold">
                  Regular seasonal lawn
                  treatment
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  Treatment selected according
                  to seasonal lawn requirements.
                </div>
              </div>

              <div className="font-semibold">
                {enquiry.lawnSizeSquareMetres.toLocaleString(
                  "en-GB",
                )}{" "}
                m²
              </div>

              <div className="text-right text-xl font-bold">
                £
                {enquiry.quotedTreatmentPrice.toFixed(
                  2,
                )}
              </div>
            </div>
          </div>

          {enquiry.minimumPriceApplied && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              The standard minimum treatment
              charge has been applied to this
              quotation.
            </div>
          )}
        </section>

        <section className="mt-6 grid grid-cols-[1.25fr_0.75fr] gap-5">
          <div className="rounded-xl border border-slate-200 p-5">
            <QuoteLabel
              colour={primaryColour}
            >
              Quotation information
            </QuoteLabel>

            <p className="mt-3 whitespace-pre-line leading-7 text-slate-700">
              {enquiry.quoteNotes ||
                "This quotation covers the regular seasonal lawn-treatment service discussed during the enquiry or site visit."}
            </p>

            {enquiry.extraWorkRequired && (
              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <div className="font-bold">
                  Possible additional work
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {enquiry.extraWorkDescription ||
                    "Additional lawn-renovation work may be recommended separately."}
                </p>

                {enquiry.preferredExtraWorkSeason && (
                  <div className="mt-2 text-sm font-semibold text-slate-700">
                    Suggested season:{" "}
                    {
                      enquiry.preferredExtraWorkSeason
                    }
                  </div>
                )}
              </div>
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
              Quoted price
            </div>

            <div className="mt-3 text-4xl font-bold">
              £
              {enquiry.quotedTreatmentPrice.toFixed(
                2,
              )}
            </div>

            <div className="mt-2 text-sm text-white/80">
              Per standard treatment visit
            </div>

            {settings.invoices
              .showAmountIncludingVat && (
              <div className="mt-4 border-t border-white/25 pt-4 text-sm">
                Including VAT where applicable
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
          <QuoteLabel
            colour={primaryColour}
          >
            What happens next
          </QuoteLabel>

          <p className="mt-3 leading-7 text-green-950">
            Once this quotation is accepted,
            Sharpes Lawn Care can create your
            customer account and arrange the
            first suitable seasonal treatment
            visit.
          </p>

          <p className="mt-3 text-sm leading-6 text-green-900">
            Please contact us before the quote
            expiry date if you would like to
            proceed or discuss any aspect of
            this quotation.
          </p>
        </section>

        <footer className="mt-8 flex items-end justify-between gap-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <div className="max-w-[70%] leading-5">
            This quotation is based on the
            information and lawn measurements
            recorded at the time it was
            prepared. Additional work will be
            quoted separately unless clearly
            included above.
          </div>

          <div className="text-right">
            <div>
              {
                settings.business
                  .businessName
              }
            </div>

            <div className="mt-1">
              {enquiry.enquiryNumber}
            </div>
          </div>
        </footer>
      </article>
    </main>
  );
}

function QuoteLabel({
  children,
  colour,
}: {
  children: React.ReactNode;
  colour: string;
}) {
  return (
    <div
      className="text-xs font-bold uppercase tracking-[0.14em]"
      style={{
        color: colour,
      }}
    >
      {children}
    </div>
  );
}

function QuoteRow({
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

function joinAddress(
  values: Array<
    string | undefined
  >,
) {
  return values
    .map((value) => value?.trim())
    .filter(
      (value): value is string =>
        Boolean(value),
    )
    .join("\n");
}

function parseDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(parseDate(value));
}

function addDaysToDate(
  value: string,
  days: number,
) {
  const date = parseDate(value);

  date.setDate(
    date.getDate() + days,
  );

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}