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
            Quotation Not Found
          </h1>

          <p className="mt-3 text-slate-500">
            This enquiry is no longer available.
          </p>

          <Link
            href="/enquiries"
            className="mt-6 inline-flex rounded-xl bg-[#176b37] px-5 py-3 font-semibold text-white"
          >
            Return to Enquiries
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

  const createdDate =
    isDateValue(enquiry.createdAt.slice(0, 10))
      ? enquiry.createdAt.slice(0, 10)
      : todayDate();

  const quoteDate =
    isDateValue(enquiry.quoteDate)
      ? enquiry.quoteDate
      : createdDate;

  const expiryDate =
    isDateValue(enquiry.quoteExpiryDate)
      ? enquiry.quoteExpiryDate
      : addDaysToDate(quoteDate, 30);

  const quoteStateIsPrintable =
    enquiry.quoteStatus === "Draft" ||
    enquiry.quoteStatus === "Presented" ||
    enquiry.quoteStatus === "Accepted" ||
    enquiry.status === "Quote Prepared" ||
    enquiry.status === "Quote Accepted" ||
    enquiry.status === "Converted to Customer";

  const quoteNumbersAreValid =
    Number.isFinite(enquiry.lawnSizeSquareMetres) &&
    enquiry.lawnSizeSquareMetres > 0 &&
    Number.isFinite(enquiry.quotedTreatmentPrice) &&
    enquiry.quotedTreatmentPrice > 0;

  const printableQuote =
    quoteStateIsPrintable &&
    quoteNumbersAreValid;

  const quoteExpired =
    expiryDate < todayDate();

  const lawnAreas = [...enquiry.lawnAreas].sort(
    (first, second) =>
      first.displayOrder - second.displayOrder,
  );

  const treatmentPrice =
    enquiry.quotedTreatmentPrice;

  const aerationPrice =
    treatmentPrice * 2;

  const scarificationPrice =
    treatmentPrice * 3;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
      {!printableQuote && (
        <div role="alert" className="no-print mx-auto mb-4 max-w-[900px] rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm leading-6 text-red-900">
          <div className="font-bold">Quotation is not ready to print</div>
          <p className="mt-1">
            GreenFlow requires a prepared/accepted quote state, a lawn area greater than 0 m² and a quoted treatment price greater than £0.00.
          </p>
        </div>
      )}

      {printableQuote && quoteExpired && (
        <div role="status" className="no-print mx-auto mb-4 max-w-[900px] rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
          <div className="font-bold">Quotation expired</div>
          <p className="mt-1">
            This quotation expired on {formatDate(expiryDate)}. Confirm the price and validity before sending it again.
          </p>
        </div>
      )}

      <div className="no-print mx-auto mb-4 flex max-w-[900px] flex-wrap items-center justify-between gap-3">
        <Link
          href="/enquiries"
          className="font-semibold text-[#176b37] hover:underline"
        >
          ← Back to enquiries
        </Link>

        <button
          type="button"
          disabled={!printableQuote}
          onClick={() => {
            if (!printableQuote) return;
            window.print();
          }}
          title={
            printableQuote
              ? undefined
              : "A valid prepared quotation is required before printing."
          }
          className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white ${
            printableQuote
              ? "bg-[#176b37] hover:bg-[#125b2f]"
              : "cursor-not-allowed bg-slate-400"
          }`}
        >
          Print or Save PDF
        </button>
      </div>

      {printableQuote ? (
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
              Lawn-Care Quotation
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
              Prepared For
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
              label="Quotation Number"
              value={
                enquiry.enquiryNumber
              }
            />

            <QuoteRow
              label="Quote Date"
              value={formatDate(
                quoteDate,
              )}
            />

            <QuoteRow
              label="Valid Until"
              value={formatDate(
                expiryDate,
              )}
            />

            <QuoteRow
              label="Quote Status"
              value={
                quoteExpired
                  ? `${enquiry.quoteStatus} · Expired`
                  : enquiry.quoteStatus
              }
            />
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 p-5">
          <QuoteLabel
            colour={primaryColour}
          >
            Your Lawn
          </QuoteLabel>

          {lawnAreas.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              {lawnAreas.map(
                (lawnArea, index) => (
                  <div
                    key={lawnArea.id}
                    className={`flex items-center justify-between gap-6 px-4 py-3 ${
                      index > 0
                        ? "border-t border-slate-200"
                        : ""
                    }`}
                  >
                    <span className="font-semibold text-slate-800">
                      {lawnArea.name}
                    </span>

                    <span className="font-bold text-slate-900">
                      {lawnArea.areaSquareMetres.toLocaleString(
                        "en-GB",
                      )}{" "}
                      m²
                    </span>
                  </div>
                ),
              )}

              <div className="flex items-center justify-between gap-6 border-t-2 border-slate-300 bg-slate-50 px-4 py-3">
                <span className="font-bold">
                  Total Lawn Area
                </span>

                <span className="text-lg font-bold">
                  {enquiry.lawnSizeSquareMetres.toLocaleString(
                    "en-GB",
                  )}{" "}
                  m²
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-between gap-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <span className="font-bold">
                Total Lawn Area
              </span>

              <span className="text-lg font-bold">
                {enquiry.lawnSizeSquareMetres.toLocaleString(
                  "en-GB",
                )}{" "}
                m²
              </span>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 p-5">
          <QuoteLabel
            colour={primaryColour}
          >
            Your Lawn-Care Programme
          </QuoteLabel>

          <p className="mt-4 leading-7 text-slate-700">
            Our standard lawn-care programme
            consists of five seasonal treatment
            visits through the year, normally
            around ten weeks apart. Each visit is
            selected to support the lawn at the
            appropriate point in the season.
          </p>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <ProgrammeRow
              treatment="T5 – Winter Moss Control 2"
              timing="Starts the year"
            />
            <ProgrammeRow
              treatment="T1 – Spring Weed & Feed"
              timing="Spring"
            />
            <ProgrammeRow
              treatment="T2 – Summer Weed & Feed"
              timing="Summer"
            />
            <ProgrammeRow
              treatment="T3 – Autumn Weed & Feed"
              timing="Autumn"
            />
            <ProgrammeRow
              treatment="T4 – Winter Moss Control 1"
              timing="Finishes the year"
            />
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 p-5">
          <QuoteLabel
            colour={primaryColour}
          >
            Pricing
          </QuoteLabel>

          <p className="mt-4 leading-7 text-slate-700">
            The standard treatment price below is
            charged for each of the five treatment
            visits in the annual programme. It is
            not an annual total.
          </p>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <PriceRow
              service="Standard Lawn Treatment"
              description="One seasonal treatment visit as part of the five-visit annual programme."
              price={`£${treatmentPrice.toFixed(2)}`}
              priceNote="per visit"
            />

            <PriceRow
              service="Hollow Tine Aeration"
              description="Helps relieve soil compaction, encourages healthy root growth and can help improve drainage."
              price={`£${aerationPrice.toFixed(2)}`}
              priceNote="additional service"
            />

            <PriceRow
              service="Scarification"
              description="Removes moss and thatch from the lawn, allowing water, air and nutrients to reach the root zone more effectively."
              price={`£${scarificationPrice.toFixed(2)}`}
              priceNote="additional service"
            />
          </div>

          {enquiry.minimumPriceApplied && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              The standard minimum treatment
              charge has been applied to this
              quotation.
            </div>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 p-5">
          <QuoteLabel
            colour={primaryColour}
          >
            Notes About Your Lawn
          </QuoteLabel>

          <p className="mt-3 whitespace-pre-line leading-7 text-slate-700">
            {enquiry.quoteNotes ||
              "No additional lawn notes were recorded for this quotation."}
          </p>

          {enquiry.extraWorkRequired && (
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <div className="font-bold">
                Specific Additional Work
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
        </section>

        <section className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
          <QuoteLabel
            colour={primaryColour}
          >
            What Happens Next
          </QuoteLabel>

          <p className="mt-3 leading-7 text-green-950">
            Once this quotation is accepted,
            {settings.business.businessName ||
              "the lawn-care business"} can create your
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
      ) : (
        <div className="mx-auto max-w-[900px] rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-red-800">
            Quotation Unavailable
          </h1>
          <p className="mt-3 text-slate-600">
            This enquiry cannot be presented as a customer quotation until its quote status, lawn area and quoted treatment price are valid.
          </p>
          <Link href="/enquiries" className="mt-6 inline-flex rounded-xl bg-[#176b37] px-5 py-3 font-semibold text-white">
            Return to Enquiries
          </Link>
        </div>
      )}
    </main>
  );
}

function ProgrammeRow({
  treatment,
  timing,
}: {
  treatment: string;
  timing: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-slate-200 px-4 py-3 last:border-b-0">
      <span className="font-semibold text-slate-800">
        {treatment}
      </span>

      <span className="text-right text-sm font-semibold text-slate-500">
        {timing}
      </span>
    </div>
  );
}

function PriceRow({
  service,
  description,
  price,
  priceNote,
}: {
  service: string;
  description: string;
  price: string;
  priceNote: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-6 border-b border-slate-200 px-4 py-4 last:border-b-0">
      <div>
        <div className="font-bold text-slate-900">
          {service}
        </div>

        <div className="mt-1 text-sm leading-6 text-slate-600">
          {description}
        </div>
      </div>

      <div className="min-w-[125px] text-right">
        <div className="text-xl font-bold text-slate-900">
          {price}
        </div>

        <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {priceNote}
        </div>
      </div>
    </div>
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

function toDateValue(
  date: Date,
) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
    !Number.isNaN(date.getTime()) &&
    toDateValue(date) === value
  );
}

function formatDate(value: string) {
  if (!isDateValue(value)) {
    return "No valid date";
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

function addDaysToDate(
  value: string,
  days: number,
) {
  const safeValue =
    isDateValue(value)
      ? value
      : todayDate();

  const date = parseDate(safeValue);

  date.setDate(
    date.getDate() + days,
  );

  return toDateValue(date);
}

function todayDate() {
  return toDateValue(
    new Date(),
  );
}