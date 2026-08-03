"use client";

import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";
import {
  type EnquiryRecord,
  type EnquirySource,
  type EnquiryStatus,
  type QuoteStatus,
  useEnquiryStore,
} from "@/components/enquiry-store";
import {
  type CustomerProgramme,
  type ProgrammeVisit,
  useProgrammeStore,
} from "@/components/programme-store";
import {
  demoCustomers,
  type Customer,
} from "@/lib/demo-customers";

type StatusFilter =
  | EnquiryStatus
  | "All";

const enquirySources: EnquirySource[] = [
  "Recommendation",
  "Website",
  "Telephone",
  "Email",
  "Social Media",
  "Other",
];

const enquiryStatuses: EnquiryStatus[] = [
  "New Enquiry",
  "Visit Arranged",
  "Quote Prepared",
  "Quote Accepted",
  "Quote Declined",
  "Converted to Customer",
  "Closed",
];

const quoteStatuses: QuoteStatus[] = [
  "Not Prepared",
  "Draft",
  "Presented",
  "Accepted",
  "Declined",
];

const standardTreatmentNames = [
  "Early winter moss control",
  "Spring weed and feed",
  "Summer weed and feed",
  "Autumn weed and feed",
  "Winter moss control",
];

export default function EnquiriesPage() {
  const {
    enquiries,
    ready: enquiriesReady,
    addEnquiry,
    updateEnquiry,
    deleteEnquiry,
    calculateQuote,
    markConverted,
    restoreDemoEnquiries,
  } = useEnquiryStore();

  const {
    ready: customersReady,
    addCustomer,
    getNextCustomerNumber,
  } = useCustomerStore();

  const {
    ready: programmesReady,
    saveProgramme,
  } = useProgrammeStore();

  const currentYear =
    new Date().getFullYear();

  const [draft, setDraft] =
    useState<EnquiryRecord | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("All");

  const [message, setMessage] =
    useState("");

  const [
    generateProgramme,
    setGenerateProgramme,
  ] = useState(true);

  const [
    programmeYear,
    setProgrammeYear,
  ] = useState(currentYear);

  const [
    programmeStartDate,
    setProgrammeStartDate,
  ] = useState(todayDate());

  const filteredEnquiries = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return [...enquiries]
      .filter((enquiry) => {
        const matchesStatus =
          statusFilter === "All" ||
          enquiry.status === statusFilter;

        if (!matchesStatus) {
          return false;
        }

        if (!query) {
          return true;
        }

        return [
          enquiry.enquiryNumber,
          enquiry.fullName,
          enquiry.address,
          enquiry.postcode,
          enquiry.emailAddress,
          enquiry.mobilePhone,
          enquiry.source,
          enquiry.referredBy,
        ].some((value) =>
          value
            .toLowerCase()
            .includes(query),
        );
      })
      .sort(
        (first, second) =>
          new Date(
            second.updatedAt,
          ).getTime() -
          new Date(
            first.updatedAt,
          ).getTime(),
      );
  }, [
    enquiries,
    search,
    statusFilter,
  ]);

  useEffect(() => {
    if (
      draft ||
      filteredEnquiries.length === 0
    ) {
      return;
    }

    setDraft({
      ...filteredEnquiries[0],
    });
  }, [draft, filteredEnquiries]);

  const selectedEnquiry = draft;

  const newCount = enquiries.filter(
    (enquiry) =>
      enquiry.status === "New Enquiry",
  ).length;

  const visitsArrangedCount =
    enquiries.filter(
      (enquiry) =>
        enquiry.status ===
        "Visit Arranged",
    ).length;

  const quotesOutstandingCount =
    enquiries.filter(
      (enquiry) =>
        enquiry.quoteStatus === "Draft" ||
        enquiry.quoteStatus ===
          "Presented",
    ).length;

  const acceptedCount = enquiries.filter(
    (enquiry) =>
      enquiry.quoteStatus ===
        "Accepted" ||
      enquiry.status ===
        "Quote Accepted" ||
      enquiry.status ===
        "Converted to Customer",
  ).length;

  function selectEnquiry(
    enquiry: EnquiryRecord,
  ) {
    setDraft({
      ...enquiry,
    });

    setProgrammeYear(currentYear);
    setProgrammeStartDate(todayDate());
    setGenerateProgramme(true);
  }

  function createNewEnquiry() {
    const enquiry = addEnquiry();

    setDraft({
      ...enquiry,
    });

    setProgrammeYear(currentYear);
    setProgrammeStartDate(todayDate());
    setGenerateProgramme(true);

    showMessage(
      `${enquiry.enquiryNumber} created.`,
    );
  }

  function updateDraft<
    K extends keyof EnquiryRecord,
  >(
    field: K,
    value: EnquiryRecord[K],
  ) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const updated: EnquiryRecord = {
        ...current,
        [field]: value,
      };

      if (
        field === "firstName" ||
        field === "surname"
      ) {
        updated.fullName = [
          updated.firstName,
          updated.surname,
        ]
          .map((part) => part.trim())
          .filter(Boolean)
          .join(" ");
      }

      return updated;
    });
  }

  function saveEnquiry(
    event?: FormEvent<HTMLFormElement>,
  ) {
    event?.preventDefault();

    if (!draft) {
      showMessage(
        "Select or create an enquiry first.",
      );
      return;
    }

    if (
      !draft.firstName.trim() &&
      !draft.surname.trim()
    ) {
      showMessage(
        "Enter at least a first name or surname.",
      );
      return;
    }

    if (!draft.address.trim()) {
      showMessage(
        "Enter the enquiry address.",
      );
      return;
    }

    const savedEnquiry: EnquiryRecord = {
      ...draft,

      firstName:
        draft.firstName.trim(),

      surname:
        draft.surname.trim(),

      fullName: [
        draft.firstName,
        draft.surname,
      ]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(" "),

      address:
        draft.address.trim(),

      postcode:
        draft.postcode
          .trim()
          .toUpperCase(),
    };

    updateEnquiry(savedEnquiry);

    setDraft(savedEnquiry);

    showMessage(
      `${draft.enquiryNumber} saved.`,
    );
  }

  function arrangeVisit() {
    if (!draft) {
      return;
    }

    setDraft({
      ...draft,

      status: "Visit Arranged",

      siteVisitDate:
        draft.siteVisitDate ||
        todayDate(),

      siteVisitTime:
        draft.siteVisitTime ||
        "10:00",
    });

    showMessage(
      "Site visit prepared. Save the enquiry to retain the change.",
    );
  }

  function calculateCurrentQuote() {
    if (!draft) {
      return;
    }

    const result = calculateQuote(
      draft.lawnSizeSquareMetres,
      draft.pricePerSquareMetre,
      18,
    );

    setDraft({
      ...draft,

      lawnMeasured:
        draft.lawnSizeSquareMetres >
        0,

      calculatedTreatmentPrice:
        result.calculatedPrice,

      quotedTreatmentPrice:
        result.finalPrice,

      minimumPriceApplied:
        result.minimumPriceApplied,

      quoteStatus:
        draft.quoteStatus ===
        "Not Prepared"
          ? "Draft"
          : draft.quoteStatus,

      status:
        draft.status ===
          "New Enquiry" ||
        draft.status ===
          "Visit Arranged"
          ? "Quote Prepared"
          : draft.status,

      quoteDate:
        draft.quoteDate ||
        todayDate(),

      quoteExpiryDate:
        draft.quoteExpiryDate ||
        addDaysToDate(
          todayDate(),
          30,
        ),
    });

    showMessage(
      `Quotation calculated at £${result.finalPrice.toFixed(
        2,
      )}.`,
    );
  }

  function markQuotePresented() {
    if (!draft) {
      return;
    }

    setDraft({
      ...draft,
      status: "Quote Prepared",
      quoteStatus: "Presented",
      quoteDate:
        draft.quoteDate ||
        todayDate(),
      quoteExpiryDate:
        draft.quoteExpiryDate ||
        addDaysToDate(
          todayDate(),
          30,
        ),
    });

    showMessage(
      "Quote marked as presented. Save the enquiry to retain the change.",
    );
  }

  function markQuoteAccepted() {
    if (!draft) {
      return;
    }

    setDraft({
      ...draft,
      status: "Quote Accepted",
      quoteStatus: "Accepted",
    });

    showMessage(
      "Quote marked as accepted. Save before converting the enquiry.",
    );
  }

  function markQuoteDeclined() {
    if (!draft) {
      return;
    }

    setDraft({
      ...draft,
      status: "Quote Declined",
      quoteStatus: "Declined",
    });

    showMessage(
      "Quote marked as declined. Save the enquiry to retain the change.",
    );
  }

  function convertAcceptedEnquiry() {
    if (!draft) {
      showMessage(
        "Select an enquiry first.",
      );
      return;
    }

    if (
      draft.status !==
        "Quote Accepted" &&
      draft.quoteStatus !==
        "Accepted"
    ) {
      showMessage(
        "The quotation must be accepted before conversion.",
      );
      return;
    }

    if (
      draft.convertedCustomerNumber
    ) {
      showMessage(
        `This enquiry has already been converted into customer ${draft.convertedCustomerNumber}.`,
      );
      return;
    }

    if (!draft.fullName.trim()) {
      showMessage(
        "Enter the customer name before converting.",
      );
      return;
    }

    if (!draft.address.trim()) {
      showMessage(
        "Enter the customer address before converting.",
      );
      return;
    }

    if (
      draft.lawnSizeSquareMetres <= 0
    ) {
      showMessage(
        "Record the measured lawn size before converting.",
      );
      return;
    }

    if (
      draft.quotedTreatmentPrice <= 0
    ) {
      showMessage(
        "Calculate or enter the treatment price before converting.",
      );
      return;
    }

    if (
      generateProgramme &&
      !programmeStartDate
    ) {
      showMessage(
        "Choose the first treatment date.",
      );
      return;
    }

    const customerNumber =
      getNextCustomerNumber();

    const programmeVisits =
      generateProgramme
        ? buildCustomerProgrammeVisits(
            customerNumber,
            programmeYear,
            programmeStartDate,
          )
        : [];

    const firstProgrammeVisit =
      programmeVisits[0];

    const newCustomer: Customer = {
      ...demoCustomers[0],

      customerNumber,

      firstName:
        draft.firstName.trim(),

      surname:
        draft.surname.trim(),

      fullName:
        draft.fullName.trim(),

      address:
        draft.address.trim(),

      postcode:
        draft.postcode
          .trim()
          .toUpperCase(),

      email:
        draft.emailAddress.trim(),

      homePhone:
        draft.homePhone.trim(),

      mobilePhone:
        draft.mobilePhone.trim(),

      groupNumber:
        draft.suggestedGroupNumber,

      vanNumber:
        draft.suggestedVanNumber,

      lawnSize:
        draft.lawnSizeSquareMetres,

      treatmentPrice:
        draft.quotedTreatmentPrice,

      status: "Active",

      lastVisit:
        draft
          .treatmentStartedImmediately
          ? formatDisplayDate(
              todayDate(),
            )
          : "Not yet visited",

      nextVisit:
        firstProgrammeVisit
          ? formatDisplayDate(
              firstProgrammeVisit
                .scheduledDate,
            )
          : "Not yet scheduled",

      lockedGate: false,

      dogOnProperty: false,

      notes: [
        draft.internalNotes.trim(),

        draft.extraWorkRequired
          ? `Future extra work: ${draft.extraWorkDescription.trim()}${
              draft
                .preferredExtraWorkSeason
                ? ` Preferred season: ${draft.preferredExtraWorkSeason}.`
                : ""
            }`
          : "",

        `Converted from ${draft.enquiryNumber}.`,
      ]
        .filter(Boolean)
        .join("\n"),
    };

    const result =
      addCustomer(newCustomer);

    if (!result.success) {
      showMessage(result.message);
      return;
    }

    if (
      generateProgramme &&
      programmeVisits.length > 0
    ) {
      const programme: CustomerProgramme =
        {
          id: `programme-${customerNumber}-${programmeYear}`,

          customerNumber,

          year: programmeYear,

          createdAt:
            new Date().toISOString(),

          programmeName:
            "Standard annual programme",

          startDate:
            programmeStartDate,

          avoidWednesdays: true,

          avoidWeekends: true,

          visits: programmeVisits,
        };

      saveProgramme(programme);
    }

    markConverted(
      draft.id,
      customerNumber,
    );

    const convertedDraft: EnquiryRecord =
      {
        ...draft,

        status:
          "Converted to Customer",

        quoteStatus: "Accepted",

        convertedCustomerNumber:
          customerNumber,

        convertedAt:
          new Date().toISOString(),
      };

    setDraft(convertedDraft);

    if (
      generateProgramme &&
      programmeVisits.length > 0
    ) {
      showMessage(
        `${draft.fullName} is now customer ${customerNumber}. ${programmeVisits.length} programme visits were created.`,
      );

      return;
    }

    showMessage(
      `${draft.fullName} is now customer ${customerNumber}.`,
    );
  }

  function removeSelectedEnquiry() {
    if (!draft) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${draft.enquiryNumber} for ${
        draft.fullName ||
        "this enquiry"
      }?`,
    );

    if (!confirmed) {
      return;
    }

    deleteEnquiry(draft.id);

    const remaining =
      enquiries.filter(
        (enquiry) =>
          enquiry.id !== draft.id,
      );

    setDraft(
      remaining[0]
        ? {
            ...remaining[0],
          }
        : null,
    );

    showMessage(
      "Enquiry deleted.",
    );
  }

  function restoreDemoData() {
    const confirmed = window.confirm(
      "Restore the original demonstration enquiries? Current enquiry records will be replaced.",
    );

    if (!confirmed) {
      return;
    }

    restoreDemoEnquiries();
    setDraft(null);

    showMessage(
      "Demo enquiries restored.",
    );
  }

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  const ready =
    enquiriesReady &&
    customersReady &&
    programmesReady;

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading enquiries...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1600px]">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-3xl font-bold">
                Enquiries & Quotes
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Record enquiries,
                arrange site visits,
                prepare quotations and
                convert accepted work into
                active customers.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={restoreDemoData}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
              >
                Restore demo enquiries
              </button>

              <button
                type="button"
                onClick={createNewEnquiry}
                className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
              >
                + New enquiry
              </button>
            </div>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="New enquiries"
              value={String(newCount)}
              detail="Awaiting first action"
            />

            <SummaryCard
              label="Visits arranged"
              value={String(
                visitsArrangedCount,
              )}
              detail="Site measurements planned"
            />

            <SummaryCard
              label="Quotes outstanding"
              value={String(
                quotesOutstandingCount,
              )}
              detail="Draft or presented"
              warning={
                quotesOutstandingCount >
                0
              }
            />

            <SummaryCard
              label="Accepted"
              value={String(
                acceptedCount,
              )}
              detail="Accepted or converted"
            />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr]">
            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <Field label="Search enquiries">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Name, address, postcode or number"
                  className={inputClass}
                />
              </Field>

              <div className="mt-3">
                <Field label="Status">
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target
                          .value as StatusFilter,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="All">
                      All statuses
                    </option>

                    {enquiryStatuses.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
              </div>

              <div className="mt-4 max-h-[67vh] space-y-2 overflow-y-auto pr-1">
                {filteredEnquiries.length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                    No enquiries match
                    the current filter.
                  </div>
                ) : (
                  filteredEnquiries.map(
                    (enquiry) => {
                      const isSelected =
                        draft?.id ===
                        enquiry.id;

                      return (
                        <button
                          key={enquiry.id}
                          type="button"
                          onClick={() =>
                            selectEnquiry(
                              enquiry,
                            )
                          }
                          className={`w-full rounded-xl border p-4 text-left transition ${
                            isSelected
                              ? "border-[#338b45] bg-green-50"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-bold">
                                {enquiry.fullName ||
                                  "Unnamed enquiry"}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {
                                  enquiry.enquiryNumber
                                }{" "}
                                ·{" "}
                                {
                                  enquiry.source
                                }
                              </div>
                            </div>

                            <StatusBadge
                              status={
                                enquiry.status
                              }
                            />
                          </div>

                          <div className="mt-3 text-sm text-slate-600">
                            {enquiry.address ||
                              "Address not recorded"}
                          </div>

                          <div className="mt-3 flex items-end justify-between gap-3">
                            <div className="text-xs text-slate-500">
                              Updated
                              <div className="font-semibold text-slate-700">
                                {formatDateTime(
                                  enquiry.updatedAt,
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs text-slate-500">
                                Quote
                              </div>

                              <div className="font-bold">
                                {enquiry.quotedTreatmentPrice >
                                0
                                  ? `£${enquiry.quotedTreatmentPrice.toFixed(
                                      2,
                                    )}`
                                  : "Not prepared"}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    },
                  )
                )}
              </div>
            </aside>

            <section className="min-w-0">
              {!selectedEnquiry ? (
                <article className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                  <h2 className="text-xl font-bold">
                    Select or create an
                    enquiry
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Choose an enquiry from
                    the left, or create a
                    new one to begin.
                  </p>
                </article>
              ) : (
                <form
                  onSubmit={saveEnquiry}
                  className="space-y-4"
                >
                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-2xl font-bold">
                            {selectedEnquiry.fullName ||
                              "New enquiry"}
                          </h2>

                          <StatusBadge
                            status={
                              selectedEnquiry.status
                            }
                          />
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {
                            selectedEnquiry.enquiryNumber
                          }{" "}
                          · Created{" "}
                          {formatDateTime(
                            selectedEnquiry.createdAt,
                          )}
                        </p>
                      </div>

                     <div className="flex flex-wrap gap-2">
  <button
    type="button"
    onClick={arrangeVisit}
    className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100"
  >
    Arrange visit
  </button>

  <Link
    href={`/quotes/${selectedEnquiry.id}`}
    className="rounded-xl border border-[#338b45] bg-white px-4 py-2.5 text-sm font-semibold text-[#176b37] hover:bg-green-50"
  >
    View quotation
  </Link>

  <button
    type="submit"
    className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
  >
    Save enquiry
  </button>
</div> 
                    </div>
                  </article>

                  <section className="grid gap-4 lg:grid-cols-2">
                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SectionHeading
                        title="Customer details"
                        description="Record the person making the enquiry and how they found Sharpes Lawn Care."
                      />

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <Field label="First name">
                          <input
                            value={
                              selectedEnquiry.firstName
                            }
                            onChange={(event) =>
                              updateDraft(
                                "firstName",
                                event.target
                                  .value,
                              )
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Surname">
                          <input
                            value={
                              selectedEnquiry.surname
                            }
                            onChange={(event) =>
                              updateDraft(
                                "surname",
                                event.target
                                  .value,
                              )
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Enquiry source">
                          <select
                            value={
                              selectedEnquiry.source
                            }
                            onChange={(event) =>
                              updateDraft(
                                "source",
                                event.target
                                  .value as EnquirySource,
                              )
                            }
                            className={inputClass}
                          >
                            {enquirySources.map(
                              (source) => (
                                <option
                                  key={source}
                                  value={source}
                                >
                                  {source}
                                </option>
                              ),
                            )}
                          </select>
                        </Field>

                        <Field label="Recommended by">
                          <input
                            value={
                              selectedEnquiry.referredBy
                            }
                            onChange={(event) =>
                              updateDraft(
                                "referredBy",
                                event.target
                                  .value,
                              )
                            }
                            disabled={
                              selectedEnquiry.source !==
                              "Recommendation"
                            }
                            placeholder="Existing customer name"
                            className={inputClass}
                          />
                        </Field>

                        <div className="sm:col-span-2">
                          <Field label="Address">
                            <input
                              value={
                                selectedEnquiry.address
                              }
                              onChange={(event) =>
                                updateDraft(
                                  "address",
                                  event.target
                                    .value,
                                )
                              }
                              className={inputClass}
                            />
                          </Field>
                        </div>

                        <Field label="Postcode">
                          <input
                            value={
                              selectedEnquiry.postcode
                            }
                            onChange={(event) =>
                              updateDraft(
                                "postcode",
                                event.target.value.toUpperCase(),
                              )
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Mobile phone">
                          <input
                            value={
                              selectedEnquiry.mobilePhone
                            }
                            onChange={(event) =>
                              updateDraft(
                                "mobilePhone",
                                event.target
                                  .value,
                              )
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Home phone">
                          <input
                            value={
                              selectedEnquiry.homePhone
                            }
                            onChange={(event) =>
                              updateDraft(
                                "homePhone",
                                event.target
                                  .value,
                              )
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Email address">
                          <input
                            type="email"
                            value={
                              selectedEnquiry.emailAddress
                            }
                            onChange={(event) =>
                              updateDraft(
                                "emailAddress",
                                event.target
                                  .value,
                              )
                            }
                            className={inputClass}
                          />
                        </Field>

                        <div className="sm:col-span-2">
                          <Field label="Initial message">
                            <textarea
                              rows={4}
                              value={
                                selectedEnquiry.initialMessage
                              }
                              onChange={(event) =>
                                updateDraft(
                                  "initialMessage",
                                  event.target
                                    .value,
                                )
                              }
                              className={inputClass}
                            />
                          </Field>
                        </div>

                        <div className="sm:col-span-2">
                          <Field label="Internal notes">
                            <textarea
                              rows={3}
                              value={
                                selectedEnquiry.internalNotes
                              }
                              onChange={(event) =>
                                updateDraft(
                                  "internalNotes",
                                  event.target
                                    .value,
                                )
                              }
                              className={inputClass}
                            />
                          </Field>
                        </div>
                      </div>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SectionHeading
                        title="Site visit"
                        description="Record when the lawn will be measured and the suggested route allocation."
                      />

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <Field label="Enquiry status">
                          <select
                            value={
                              selectedEnquiry.status
                            }
                            onChange={(event) =>
                              updateDraft(
                                "status",
                                event.target
                                  .value as EnquiryStatus,
                              )
                            }
                            className={inputClass}
                          >
                            {enquiryStatuses.map(
                              (status) => (
                                <option
                                  key={status}
                                  value={status}
                                >
                                  {status}
                                </option>
                              ),
                            )}
                          </select>
                        </Field>

                        <Field label="Site visit date">
                          <input
                            type="date"
                            value={
                              selectedEnquiry.siteVisitDate
                            }
                            onChange={(event) =>
                              updateDraft(
                                "siteVisitDate",
                                event.target
                                  .value,
                              )
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Site visit time">
                          <input
                            type="time"
                            value={
                              selectedEnquiry.siteVisitTime
                            }
                            onChange={(event) =>
                              updateDraft(
                                "siteVisitTime",
                                event.target
                                  .value,
                              )
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Suggested group">
                          <input
                            type="number"
                            min="1"
                            value={
                              selectedEnquiry.suggestedGroupNumber
                            }
                            onChange={(event) =>
                              updateDraft(
                                "suggestedGroupNumber",
                                Number(
                                  event.target
                                    .value,
                                ) || 1,
                              )
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Suggested van">
                          <select
                            value={
                              selectedEnquiry.suggestedVanNumber
                            }
                            onChange={(event) =>
                              updateDraft(
                                "suggestedVanNumber",
                                Number(
                                  event.target
                                    .value,
                                ),
                              )
                            }
                            className={inputClass}
                          >
                            <option value={1}>
                              Van 1
                            </option>

                            <option value={2}>
                              Van 2
                            </option>

                            <option value={3}>
                              Van 3
                            </option>
                          </select>
                        </Field>

                        <ToggleField
                          label="Lawn measured"
                          description="Confirm that the lawn measurement is complete."
                          checked={
                            selectedEnquiry.lawnMeasured
                          }
                          onChange={(checked) =>
                            updateDraft(
                              "lawnMeasured",
                              checked,
                            )
                          }
                        />

                        <ToggleField
                          label="Treatment started immediately"
                          description="Use when the first treatment was completed during the quotation visit."
                          checked={
                            selectedEnquiry.treatmentStartedImmediately
                          }
                          onChange={(checked) =>
                            updateDraft(
                              "treatmentStartedImmediately",
                              checked,
                            )
                          }
                        />
                      </div>
                    </article>
                  </section>

                  <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SectionHeading
                        title="Lawn measurement and quotation"
                        description="Calculate the price from lawn area and price per square metre, with a minimum £18 charge."
                      />

                      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Field label="Lawn size (m²)">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              selectedEnquiry.lawnSizeSquareMetres
                            }
                            onChange={(event) =>
                              updateDraft(
                                "lawnSizeSquareMetres",
                                Number(
                                  event.target
                                    .value,
                                ) || 0,
                              )
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Price per m²">
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={
                              selectedEnquiry.pricePerSquareMetre
                            }
                            onChange={(event) =>
                              updateDraft(
                                "pricePerSquareMetre",
                                Number(
                                  event.target
                                    .value,
                                ) || 0,
                              )
                            }
                            className={inputClass}
                          />
                        </Field>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={
                              calculateCurrentQuote
                            }
                            className="w-full rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
                          >
                            Calculate quote
                          </button>
                        </div>

                        <ResultBox
                          label="Calculated price"
                          value={`£${selectedEnquiry.calculatedTreatmentPrice.toFixed(
                            2,
                          )}`}
                          detail="Area × price per m²"
                        />

                        <ResultBox
                          label="Quoted treatment price"
                          value={`£${selectedEnquiry.quotedTreatmentPrice.toFixed(
                            2,
                          )}`}
                          detail={
                            selectedEnquiry.minimumPriceApplied
                              ? "£18 minimum applied"
                              : "Editable final quotation"
                          }
                          warning={
                            selectedEnquiry.minimumPriceApplied
                          }
                        />

                        <Field label="Override final quote">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              selectedEnquiry.quotedTreatmentPrice
                            }
                            onChange={(event) =>
                              updateDraft(
                                "quotedTreatmentPrice",
                                Number(
                                  event.target
                                    .value,
                                ) || 0,
                              )
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Quote status">
                          <select
                            value={
                              selectedEnquiry.quoteStatus
                            }
                            onChange={(event) =>
                              updateDraft(
                                "quoteStatus",
                                event.target
                                  .value as QuoteStatus,
                              )
                            }
                            className={inputClass}
                          >
                            {quoteStatuses.map(
                              (status) => (
                                <option
                                  key={status}
                                  value={status}
                                >
                                  {status}
                                </option>
                              ),
                            )}
                          </select>
                        </Field>

                        <Field label="Quote date">
                          <input
                            type="date"
                            value={
                              selectedEnquiry.quoteDate
                            }
                            onChange={(event) =>
                              updateDraft(
                                "quoteDate",
                                event.target
                                  .value,
                              )
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Quote expiry">
                          <input
                            type="date"
                            value={
                              selectedEnquiry.quoteExpiryDate
                            }
                            onChange={(event) =>
                              updateDraft(
                                "quoteExpiryDate",
                                event.target
                                  .value,
                              )
                            }
                            className={inputClass}
                          />
                        </Field>

                        <div className="sm:col-span-2 lg:col-span-3">
                          <Field label="Quote notes">
                            <textarea
                              rows={4}
                              value={
                                selectedEnquiry.quoteNotes
                              }
                              onChange={(event) =>
                                updateDraft(
                                  "quoteNotes",
                                  event.target
                                    .value,
                                )
                              }
                              className={inputClass}
                            />
                          </Field>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={
                            markQuotePresented
                          }
                          className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100"
                        >
                          Mark presented
                        </button>

                        <button
                          type="button"
                          onClick={
                            markQuoteAccepted
                          }
                          className="rounded-xl border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100"
                        >
                          Mark accepted
                        </button>

                        <button
                          type="button"
                          onClick={
                            markQuoteDeclined
                          }
                          className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                        >
                          Mark declined
                        </button>
                      </div>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SectionHeading
                        title="Extra work and conversion"
                        description="Record future work and convert an accepted enquiry into a customer."
                      />

                      <div className="mt-5 space-y-4">
                        <ToggleField
                          label="Extra work required"
                          description="Record scarification, aeration, overseeding or other work."
                          checked={
                            selectedEnquiry.extraWorkRequired
                          }
                          onChange={(checked) =>
                            updateDraft(
                              "extraWorkRequired",
                              checked,
                            )
                          }
                        />

                        <Field label="Work description">
                          <textarea
                            rows={5}
                            value={
                              selectedEnquiry.extraWorkDescription
                            }
                            onChange={(event) =>
                              updateDraft(
                                "extraWorkDescription",
                                event.target
                                  .value,
                              )
                            }
                            disabled={
                              !selectedEnquiry.extraWorkRequired
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Preferred season">
                          <select
                            value={
                              selectedEnquiry.preferredExtraWorkSeason
                            }
                            onChange={(event) =>
                              updateDraft(
                                "preferredExtraWorkSeason",
                                event.target
                                  .value,
                              )
                            }
                            disabled={
                              !selectedEnquiry.extraWorkRequired
                            }
                            className={inputClass}
                          >
                            <option value="">
                              Not selected
                            </option>

                            <option value="Spring">
                              Spring
                            </option>

                            <option value="Summer">
                              Summer
                            </option>

                            <option value="Autumn">
                              Autumn
                            </option>

                            <option value="Winter">
                              Winter
                            </option>
                          </select>
                        </Field>

                        {selectedEnquiry.status ===
                          "Quote Accepted" && (
                          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                            <div className="font-bold text-green-900">
                              Ready to become a
                              customer
                            </div>

                            <p className="mt-2 text-sm leading-6 text-green-800">
                              GreenFlow will create
                              the customer record and
                              can also create the
                              remaining annual
                              programme.
                            </p>

                            <ToggleField
                              label="Generate annual programme"
                              description="Create scheduled treatment visits automatically."
                              checked={
                                generateProgramme
                              }
                              onChange={
                                setGenerateProgramme
                              }
                            />

                            {generateProgramme && (
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <Field label="Programme year">
                                  <input
                                    type="number"
                                    min="2020"
                                    max="2100"
                                    value={
                                      programmeYear
                                    }
                                    onChange={(
                                      event,
                                    ) =>
                                      setProgrammeYear(
                                        Number(
                                          event
                                            .target
                                            .value,
                                        ) ||
                                          currentYear,
                                      )
                                    }
                                    className={
                                      inputClass
                                    }
                                  />
                                </Field>

                                <Field label="First treatment date">
                                  <input
                                    type="date"
                                    value={
                                      programmeStartDate
                                    }
                                    onChange={(
                                      event,
                                    ) =>
                                      setProgrammeStartDate(
                                        event
                                          .target
                                          .value,
                                      )
                                    }
                                    className={
                                      inputClass
                                    }
                                  />
                                </Field>

                                <div className="rounded-xl border border-green-200 bg-white p-3 text-xs leading-5 text-green-800 sm:col-span-2">
                                  Visits are generated
                                  approximately 70 days
                                  apart. Wednesdays and
                                  weekends are avoided.
                                  Dates outside the
                                  selected year are not
                                  included.
                                </div>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={
                                convertAcceptedEnquiry
                              }
                              className="mt-4 w-full rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
                            >
                              Convert to customer
                            </button>
                          </div>
                        )}

                        {selectedEnquiry.status ===
                          "Converted to Customer" && (
                          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                            <div className="font-bold text-blue-900">
                              Customer created
                            </div>

                            <p className="mt-2 text-sm text-blue-800">
                              This enquiry became
                              customer{" "}
                              <strong>
                                {
                                  selectedEnquiry.convertedCustomerNumber
                                }
                              </strong>
                              .
                            </p>

                            <Link
                              href={`/customers/${selectedEnquiry.convertedCustomerNumber}`}
                              className="mt-4 inline-flex rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                            >
                              Open customer profile
                            </Link>
                          </div>
                        )}
                      </div>
                    </article>
                  </section>

                  <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <button
                      type="button"
                      onClick={
                        removeSelectedEnquiry
                      }
                      className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      Delete enquiry
                    </button>

                    <button
                      type="submit"
                      className="rounded-xl bg-[#176b37] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
                    >
                      Save all changes
                    </button>
                  </section>
                </form>
              )}
            </section>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function buildCustomerProgrammeVisits(
  customerNumber: string,
  programmeYear: number,
  firstTreatmentDate: string,
): ProgrammeVisit[] {
  if (!firstTreatmentDate) {
    return [];
  }

  const visits: ProgrammeVisit[] = [];

  let scheduledDate =
    parseDateValue(
      firstTreatmentDate,
    );

  for (
    let index = 0;
    index <
    standardTreatmentNames.length;
    index += 1
  ) {
    if (index > 0) {
      scheduledDate =
        addCalendarDays(
          scheduledDate,
          70,
        );
    }

    scheduledDate =
      moveToAvailableWorkingDay(
        scheduledDate,
      );

    if (
      scheduledDate.getFullYear() !==
      programmeYear
    ) {
      continue;
    }

    visits.push({
      id: `programme-visit-${customerNumber}-${programmeYear}-${index + 1}`,

      visitNumber:
        visits.length + 1,

      treatmentName:
        standardTreatmentNames[index],

      scheduledDate:
        toDateInputValue(
          scheduledDate,
        ),

      gapAfterPreviousDays:
        visits.length === 0
          ? 0
          : 70,

      status: "Scheduled",

      notes: "",
    });
  }

  return visits;
}

function moveToAvailableWorkingDay(
  date: Date,
) {
  let result = new Date(date);

  while (true) {
    const day = result.getDay();

    const isWednesday =
      day === 3;

    const isWeekend =
      day === 0 ||
      day === 6;

    if (
      !isWednesday &&
      !isWeekend
    ) {
      return result;
    }

    result = addCalendarDays(
      result,
      1,
    );
  }
}

function parseDateValue(
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

function addCalendarDays(
  date: Date,
  days: number,
) {
  const result = new Date(date);

  result.setDate(
    result.getDate() + days,
  );

  return result;
}

function toDateInputValue(
  date: Date,
) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function todayDate() {
  return toDateInputValue(
    new Date(),
  );
}

function formatDisplayDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(
    parseDateValue(value),
  );
}

function addDaysToDate(
  value: string,
  days: number,
) {
  return toDateInputValue(
    addCalendarDays(
      parseDateValue(value),
      days,
    ),
  );
}

function formatDateTime(
  value: string,
) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(
    new Date(value),
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <div className="text-sm font-semibold">
          {label}
        </div>

        <div className="mt-1 text-xs text-slate-500">
          {description}
        </div>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked,
          )
        }
        className="h-5 w-5"
      />
    </label>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`mb-3 h-1.5 w-10 rounded-full ${
          warning
            ? "bg-amber-500"
            : "bg-[#338b45]"
        }`}
      />

      <div className="text-sm font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </article>
  );
}

function ResultBox({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        warning
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: EnquiryStatus;
}) {
  const styles =
    status ===
      "Converted to Customer" ||
    status === "Quote Accepted"
      ? "bg-green-100 text-green-800"
      : status ===
            "Quote Declined" ||
          status === "Closed"
        ? "bg-red-100 text-red-700"
        : status ===
            "Quote Prepared"
          ? "bg-blue-100 text-blue-800"
          : status ===
              "Visit Arranged"
            ? "bg-amber-100 text-amber-800"
            : "bg-slate-100 text-slate-700";

  return (
    <span
      className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}
    >
      {status}
    </span>
  );
}