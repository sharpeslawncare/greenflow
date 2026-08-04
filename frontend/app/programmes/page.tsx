"use client";

import Link from "next/link";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import {
  type StoredCustomer,
  useCustomerStore,
} from "@/components/customer-store";
import {
  type CustomerProgramme,
  type ProgrammeVisit,
  useProgrammeStore,
} from "@/components/programme-store";
import {
  type SeasonCalendar,
  useSeasonStore,
} from "@/components/season-store";

type VisitDisplayRow = {
  visitNumber: number;
  treatmentName: string;
  groupDate: string;
  visit: ProgrammeVisit | null;
  included: boolean;
  overridden: boolean;
};

const OVERRIDE_NOTE = "[date override]";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

export default function ProgrammesPage() {
  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    seasons,
    ready: seasonsReady,
  } = useSeasonStore();

  const {
    programmes,
    ready: programmesReady,
    getProgrammeForCustomer,
    applySeasonDatesToCustomer,
    saveProgramme,
  } = useProgrammeStore();

  const currentYear =
    new Date().getFullYear();

  const [selectedYear, setSelectedYear] =
    useState(currentYear);

  const [
    selectedCustomerNumber,
    setSelectedCustomerNumber,
  ] = useState("");

  const [
    editingVisitNumber,
    setEditingVisitNumber,
  ] = useState<number | null>(
    null,
  );

  const [
    replacementDate,
    setReplacementDate,
  ] = useState("");

  const [search, setSearch] =
    useState("");

  const [message, setMessage] =
    useState("");

  const activeCustomers =
    useMemo(
      () =>
        customers
          .filter(
            (customer) =>
              customer.status ===
              "Active",
          )
          .sort((first, second) => {
            if (
              first.groupNumber !==
              second.groupNumber
            ) {
              return (
                first.groupNumber -
                second.groupNumber
              );
            }

            return first.fullName.localeCompare(
              second.fullName,
            );
          }),
      [customers],
    );

  const availableYears =
    useMemo(() => {
      const years =
        seasons.map(
          (season) =>
            season.year,
        );

      if (
        !years.includes(
          currentYear,
        )
      ) {
        years.push(
          currentYear,
        );
      }

      return Array.from(
        new Set(years),
      ).sort(
        (first, second) =>
          second - first,
      );
    }, [
      seasons,
      currentYear,
    ]);

  useEffect(() => {
    if (
      selectedCustomerNumber ||
      activeCustomers.length ===
        0
    ) {
      return;
    }

    setSelectedCustomerNumber(
      activeCustomers[0]
        .customerNumber,
    );
  }, [
    activeCustomers,
    selectedCustomerNumber,
  ]);

  const selectedCustomer =
    activeCustomers.find(
      (customer) =>
        customer.customerNumber ===
        selectedCustomerNumber,
    ) ?? null;

  const selectedSeason =
    seasons.find(
      (season) =>
        season.year ===
        selectedYear,
    ) ?? null;

  const selectedProgramme =
    selectedCustomer
      ? getProgrammeForCustomer(
          selectedCustomer.customerNumber,
          selectedYear,
        )
      : undefined;

  const selectedGroupDates =
    selectedCustomer &&
    selectedSeason
      ? selectedSeason.groupDates.find(
          (group) =>
            group.groupNumber ===
            selectedCustomer.groupNumber,
        ) ?? null
      : null;

  const visitRows =
    useMemo<VisitDisplayRow[]>(() => {
      if (
        !selectedSeason ||
        !selectedGroupDates
      ) {
        return [];
      }

      return selectedSeason.treatmentRounds.map(
        (round, index) => {
          const visit =
            selectedProgramme?.visits.find(
              (item) =>
                item.visitNumber ===
                round.visitNumber,
            ) ?? null;

          const groupDate =
            selectedGroupDates
              .treatmentDates[index];

          return {
            visitNumber:
              round.visitNumber,

            treatmentName:
              round.treatmentName,

            groupDate,

            visit,

            included:
              Boolean(visit),

            overridden:
              Boolean(
                visit &&
                  visit.scheduledDate !==
                    groupDate,
              ),
          };
        },
      );
    }, [
      selectedSeason,
      selectedGroupDates,
      selectedProgramme,
    ]);

  const filteredCustomers =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return activeCustomers;
      }

      return activeCustomers.filter(
        (customer) =>
          [
            customer.customerNumber,
            customer.fullName,
            customer.address,
            customer.postcode,
            String(
              customer.groupNumber,
            ),
          ].some((value) =>
            value
              .toLowerCase()
              .includes(query),
          ),
      );
    }, [
      activeCustomers,
      search,
    ]);

  const groupCustomerCount =
    selectedCustomer
      ? activeCustomers.filter(
          (customer) =>
            customer.groupNumber ===
            selectedCustomer.groupNumber,
        ).length
      : 0;

  const includedVisitCount =
    visitRows.filter(
      (row) =>
        row.included,
    ).length;

  const overriddenVisitCount =
    visitRows.filter(
      (row) =>
        row.overridden,
    ).length;

  function chooseCustomer(
    customerNumber: string,
  ) {
    setSelectedCustomerNumber(
      customerNumber,
    );

    setEditingVisitNumber(
      null,
    );

    setReplacementDate("");
  }

  function beginOverride(
    row: VisitDisplayRow,
  ) {
    if (!row.visit) {
      showMessage(
        "This treatment round is not part of the customer's programme.",
      );
      return;
    }

    if (
      row.visit.status ===
        "Completed" ||
      row.visit.status ===
        "Skipped"
    ) {
      showMessage(
        "Completed or skipped historical visits cannot be moved here.",
      );
      return;
    }

    setEditingVisitNumber(
      row.visitNumber,
    );

    setReplacementDate(
      row.visit.scheduledDate,
    );
  }

  function cancelOverride() {
    setEditingVisitNumber(
      null,
    );

    setReplacementDate("");
  }

  function saveOverride(
    row: VisitDisplayRow,
  ) {
    if (
      !selectedCustomer ||
      !selectedProgramme ||
      !row.visit
    ) {
      return;
    }

    if (
      !isDateValue(
        replacementDate,
      )
    ) {
      showMessage(
        "Choose a valid replacement date.",
      );
      return;
    }

    const today =
      toDateValue(
        new Date(),
      );

    if (
      replacementDate < today
    ) {
      showMessage(
        "A treatment cannot be scheduled on a date that has already passed.",
      );
      return;
    }

    const conflictingVisit =
      selectedProgramme.visits.find(
        (visit) =>
          visit.id !==
            row.visit?.id &&
          visit.status !==
            "Skipped" &&
          visit.scheduledDate ===
            replacementDate,
      );

    if (conflictingVisit) {
      showMessage(
        `This customer already has ${conflictingVisit.treatmentName} scheduled on ${formatDate(
          replacementDate,
        )}.`,
      );
      return;
    }

    const updatedProgramme:
      CustomerProgramme = {
      ...selectedProgramme,

      visits:
        selectedProgramme.visits.map(
          (visit) => {
            if (
              visit.id !==
              row.visit?.id
            ) {
              return visit;
            }

            const returningToGroupDate =
              replacementDate ===
              row.groupDate;

            return {
              ...visit,

              scheduledDate:
                replacementDate,

              notes:
                returningToGroupDate
                  ? removeOverrideNote(
                      visit.notes,
                    )
                  : addOverrideNote(
                      visit.notes,
                      row.groupDate,
                      replacementDate,
                    ),
            };
          },
        ),
    };

    saveProgramme(
      updatedProgramme,
    );

    setEditingVisitNumber(
      null,
    );

    setReplacementDate("");

    showMessage(
      replacementDate ===
        row.groupDate
        ? `${row.treatmentName} restored to the Group ${selectedCustomer.groupNumber} date.`
        : `${row.treatmentName} moved to ${formatDate(
            replacementDate,
          )} for ${selectedCustomer.fullName} only.`,
    );
  }

  function restoreAllGroupDates() {
    if (!selectedCustomer) {
      return;
    }

    const confirmed =
      window.confirm(
        `Restore all active ${selectedYear} visits for ${selectedCustomer.fullName} to the standard Group ${selectedCustomer.groupNumber} dates?`,
      );

    if (!confirmed) {
      return;
    }

    const result =
      applySeasonDatesToCustomer(
        selectedCustomer.customerNumber,
        selectedYear,
      );

    if (!result) {
      showMessage(
        "The season or group calendar could not be found.",
      );
      return;
    }

    setEditingVisitNumber(
      null,
    );

    setReplacementDate("");

    showMessage(
      `${selectedCustomer.fullName}'s active visits now use the standard Group ${selectedCustomer.groupNumber} dates.`,
    );
  }

  function showMessage(
    text: string,
  ) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3800);
  }

  const ready =
    customersReady &&
    seasonsReady &&
    programmesReady;

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading annual programmes...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1650px]">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-3xl font-bold">
                Annual Programmes
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Customers automatically inherit the
                five treatment dates assigned to
                their group. Use this page only to
                review schedules or create a
                customer-specific date override.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Field label="Season year">
                <select
                  value={selectedYear}
                  onChange={(event) => {
                    setSelectedYear(
                      Number(
                        event.target.value,
                      ),
                    );

                    setEditingVisitNumber(
                      null,
                    );

                    setReplacementDate(
                      "",
                    );
                  }}
                  className="min-w-40 rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-[#338b45] focus:ring-4 focus:ring-green-100"
                >
                  {availableYears.map(
                    (year) => (
                      <option
                        key={year}
                        value={year}
                      >
                        {year}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Link
                href="/season-planner"
                className="inline-flex h-11 items-center rounded-xl border border-[#338b45] bg-white px-4 text-sm font-semibold text-[#176b37] hover:bg-green-50"
              >
                Open Season Planner
              </Link>
            </div>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
              {message}
            </div>
          )}

          {!selectedSeason && (
            <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
              No season calendar exists for{" "}
              {selectedYear}. Create it in the{" "}
              <Link
                href="/season-planner"
                className="font-bold underline"
              >
                Season Planner
              </Link>
              .
            </section>
          )}

          <section className="grid gap-4 xl:grid-cols-[390px_1fr]">
            <aside className="space-y-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <Field label="Find customer">
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Name, customer number, postcode or group"
                    className={inputClass}
                  />
                </Field>

                <div className="mt-4 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                  {filteredCustomers.length ===
                  0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                      No active customers match the
                      search.
                    </div>
                  ) : (
                    filteredCustomers.map(
                      (customer) => {
                        const selected =
                          customer.customerNumber ===
                          selectedCustomerNumber;

                        const programme =
                          programmes.find(
                            (item) =>
                              item.customerNumber ===
                                customer.customerNumber &&
                              item.year ===
                                selectedYear,
                          );

                        return (
                          <button
                            key={
                              customer.customerNumber
                            }
                            type="button"
                            onClick={() =>
                              chooseCustomer(
                                customer.customerNumber,
                              )
                            }
                            className={`w-full rounded-xl border p-4 text-left transition ${
                              selected
                                ? "border-[#338b45] bg-green-50"
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-bold">
                                  {
                                    customer.fullName
                                  }
                                </div>

                                <div className="mt-1 text-xs text-slate-500">
                                  Customer{" "}
                                  {
                                    customer.customerNumber
                                  }
                                </div>
                              </div>

                              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                                Group{" "}
                                {
                                  customer.groupNumber
                                }
                              </span>
                            </div>

                            <div className="mt-2 text-sm text-slate-600">
                              {customer.address},{" "}
                              {customer.postcode}
                            </div>

                            <div className="mt-3 text-xs font-semibold text-slate-500">
                              {programme
                                ? `${programme.visits.length} included treatment${
                                    programme.visits.length ===
                                    1
                                      ? ""
                                      : "s"
                                  }`
                                : "No inherited programme available"}
                            </div>
                          </button>
                        );
                      },
                    )
                  )}
                </div>
              </article>
            </aside>

            <section className="min-w-0 space-y-4">
              {!selectedCustomer ? (
                <EmptyPanel>
                  Select an active customer to review
                  their inherited group schedule.
                </EmptyPanel>
              ) : (
                <>
                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-2xl font-bold">
                            {
                              selectedCustomer.fullName
                            }
                          </h2>

                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                            Group{" "}
                            {
                              selectedCustomer.groupNumber
                            }
                          </span>

                          {selectedProgramme && (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                              Schedule inherited
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          Customer{" "}
                          {
                            selectedCustomer.customerNumber
                          }{" "}
                          · {selectedCustomer.address},{" "}
                          {selectedCustomer.postcode}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {selectedCustomer.programmeStartDate
                            ? `Programme eligibility begins ${formatDate(
                                selectedCustomer.programmeStartDate,
                              )}. Past treatment rounds are excluded automatically.`
                            : "Established customer: all standard group rounds remain visible, including historical dates."}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={
                          restoreAllGroupDates
                        }
                        disabled={
                          !selectedProgramme ||
                          overriddenVisitCount ===
                            0
                        }
                        className="h-11 rounded-xl border border-[#338b45] bg-white px-4 text-sm font-semibold text-[#176b37] hover:bg-green-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                      >
                        Restore group dates
                      </button>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <SummaryCard
                        label="Assigned group"
                        value={String(
                          selectedCustomer.groupNumber,
                        )}
                        detail={`${groupCustomerCount} active customer${
                          groupCustomerCount ===
                          1
                            ? ""
                            : "s"
                        } in this group`}
                      />

                      <SummaryCard
                        label="Included rounds"
                        value={`${includedVisitCount}/5`}
                        detail="Eligible treatments"
                      />

                      <SummaryCard
                        label="Date overrides"
                        value={String(
                          overriddenVisitCount,
                        )}
                        detail="Customer-specific changes"
                      />

                      <SummaryCard
                        label="Standard price"
                        value={`£${selectedCustomer.treatmentPrice.toFixed(
                          2,
                        )}`}
                        detail="Per treatment visit"
                      />
                    </div>
                  </article>

                  <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="grid grid-cols-[75px_1.3fr_170px_170px_150px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <span>Round</span>
                      <span>Treatment</span>
                      <span>Group date</span>
                      <span>Customer date</span>
                      <span>Action</span>
                    </div>

                    {visitRows.length === 0 ? (
                      <div className="p-12 text-center text-sm text-slate-500">
                        The selected group does not
                        have dates for this season.
                      </div>
                    ) : (
                      visitRows.map(
                        (row) => {
                          const editing =
                            editingVisitNumber ===
                            row.visitNumber;

                          return (
                            <div
                              key={
                                row.visitNumber
                              }
                              className="grid grid-cols-[75px_1.3fr_170px_170px_150px] items-center gap-3 border-b border-slate-100 px-4 py-4 text-sm last:border-0"
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#176b37] font-bold text-white">
                                {
                                  row.visitNumber
                                }
                              </div>

                              <div>
                                <div className="font-bold">
                                  {
                                    row.treatmentName
                                  }
                                </div>

                                <div className="mt-1 text-xs text-slate-500">
                                  {row.visitNumber ===
                                  1
                                    ? "Season starting round"
                                    : `${selectedSeason?.treatmentRounds[
                                        row.visitNumber -
                                          1
                                      ]
                                        ?.gapAfterPreviousDays ?? 70} day standard gap`}
                                </div>
                              </div>

                              <div>
                                <div className="font-semibold">
                                  {formatDate(
                                    row.groupDate,
                                  )}
                                </div>

                                <div className="mt-1 text-xs text-slate-500">
                                  Group{" "}
                                  {
                                    selectedCustomer.groupNumber
                                  }
                                </div>
                              </div>

                              <div>
                                {!row.included ? (
                                  <div>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                                      Not included
                                    </span>

                                    <div className="mt-2 text-xs text-slate-500">
                                      Date passed before this
                                      customer became eligible.
                                    </div>
                                  </div>
                                ) : editing ? (
                                  <input
                                    type="date"
                                    min={toDateValue(
                                      new Date(),
                                    )}
                                    value={
                                      replacementDate
                                    }
                                    onChange={(
                                      event,
                                    ) =>
                                      setReplacementDate(
                                        event.target
                                          .value,
                                      )
                                    }
                                    className={
                                      inputClass
                                    }
                                  />
                                ) : (
                                  <div>
                                    <div className="font-semibold">
                                      {formatDate(
                                        row.visit
                                          ?.scheduledDate ??
                                          "",
                                      )}
                                    </div>

                                    <div className="mt-1">
                                      {row.overridden ? (
                                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                                          Override
                                        </span>
                                      ) : (
                                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-800">
                                          Group date
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div>
                                {!row.visit ? (
                                  <span className="text-xs font-semibold text-slate-400">
                                    Unavailable
                                  </span>
                                ) : editing ? (
                                  <div className="flex flex-col gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        saveOverride(
                                          row,
                                        )
                                      }
                                      className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                                    >
                                      Save date
                                    </button>

                                    <button
                                      type="button"
                                      onClick={
                                        cancelOverride
                                      }
                                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      beginOverride(
                                        row,
                                      )
                                    }
                                    disabled={
                                      row.visit.status ===
                                        "Completed" ||
                                      row.visit.status ===
                                        "Skipped"
                                    }
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                  >
                                    {row.overridden
                                      ? "Change override"
                                      : "Override date"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        },
                      )
                    )}
                  </article>

                  <article className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
                    <h2 className="font-bold">
                      How this page now works
                    </h2>

                    <p className="mt-1">
                      Dates are not generated here.
                      The Season Planner creates one
                      calendar for all groups, and
                      every customer inherits the
                      dates assigned to their group.
                      Only a deliberate customer
                      override is saved separately.
                    </p>
                  </article>
                </>
              )}
            </section>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function addOverrideNote(
  existingNotes: string,
  groupDate: string,
  replacementDate: string,
) {
  const cleaned =
    removeOverrideNote(
      existingNotes,
    );

  return [
    cleaned,
    `${OVERRIDE_NOTE} Standard group date ${formatDate(
      groupDate,
    )}; customer date ${formatDate(
      replacementDate,
    )}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function removeOverrideNote(
  notes: string,
) {
  return notes
    .split("\n")
    .filter(
      (line) =>
        !line.includes(
          OVERRIDE_NOTE,
        ),
    )
    .join("\n")
    .trim();
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
    return "No date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(parseDate(value));
}

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
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </article>
  );
}

function EmptyPanel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
      {children}
    </article>
  );
}