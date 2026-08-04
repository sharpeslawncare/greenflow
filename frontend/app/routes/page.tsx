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
import { useProgrammeStore } from "@/components/programme-store";
import { useSeasonStore } from "@/components/season-store";
import { useTreatmentStore } from "@/components/treatment-store";

type RouteCustomer = {
  customer: StoredCustomer;
  treatmentName: string;
  scheduledDate: string;
  visitNumber: number;
  programmeId: string;
  programmeVisitId: string;
  overridden: boolean;
  completed: boolean;
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

export default function RoutesPage() {
  const {
    customers,
    ready: customersReady,
    updateCustomer,
  } = useCustomerStore();

  const {
    programmes,
    ready: programmesReady,
  } = useProgrammeStore();

  const {
    seasons,
    ready: seasonsReady,
  } = useSeasonStore();

  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const currentYear =
    new Date().getFullYear();

  const [selectedYear, setSelectedYear] =
    useState(currentYear);

  const [selectedDate, setSelectedDate] =
    useState("");

  const [selectedGroup, setSelectedGroup] =
    useState(1);

  const [selectedCustomers, setSelectedCustomers] =
    useState<string[]>([]);

  const [destinationGroup, setDestinationGroup] =
    useState(1);

  const [destinationVan, setDestinationVan] =
    useState(1);

  const [search, setSearch] =
    useState("");

  const [message, setMessage] =
    useState("");

  const selectedSeason =
    seasons.find(
      (season) =>
        season.year === selectedYear,
    ) ?? null;

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

  const activeCustomers =
    useMemo(
      () =>
        customers.filter(
          (customer) =>
            customer.status ===
            "Active",
        ),
      [customers],
    );

  const groupNumbers =
    useMemo(() => {
      const configuredGroups =
        selectedSeason
          ? Array.from(
              {
                length:
                  selectedSeason.groupCount,
              },
              (_, index) =>
                index + 1,
            )
          : [];

      const assignedGroups =
        activeCustomers.map(
          (customer) =>
            customer.groupNumber,
        );

      return Array.from(
        new Set([
          ...configuredGroups,
          ...assignedGroups,
        ]),
      ).sort(
        (first, second) =>
          first - second,
      );
    }, [
      selectedSeason,
      activeCustomers,
    ]);

  const seasonDates =
    useMemo(() => {
      if (!selectedSeason) {
        return [];
      }

      return Array.from(
        new Set(
          selectedSeason.groupDates.flatMap(
            (group) =>
              group.treatmentDates,
          ),
        ),
      ).sort();
    }, [selectedSeason]);

  useEffect(() => {
    if (
      selectedDate &&
      seasonDates.includes(
        selectedDate,
      )
    ) {
      return;
    }

    const today =
      toDateValue(new Date());

    const nextDate =
      seasonDates.find(
        (date) =>
          date >= today,
      ) ??
      seasonDates[0] ??
      "";

    setSelectedDate(nextDate);
  }, [
    seasonDates,
    selectedDate,
  ]);

  useEffect(() => {
    if (
      groupNumbers.includes(
        selectedGroup,
      )
    ) {
      return;
    }

    const firstGroup =
      groupNumbers[0] ?? 1;

    setSelectedGroup(
      firstGroup,
    );

    setDestinationGroup(
      firstGroup,
    );
  }, [
    groupNumbers,
    selectedGroup,
  ]);

  const routeCustomers =
    useMemo<RouteCustomer[]>(() => {
      if (!selectedDate) {
        return [];
      }

      return programmes
        .flatMap((programme) => {
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
                (visit.status ===
                  "Scheduled" ||
                  visit.status ===
                    "Planned" ||
                  visit.status ===
                    "Completed"),
            )
            .map((visit) => {
              const standardDate =
                selectedSeason
                  ?.groupDates.find(
                    (group) =>
                      group.groupNumber ===
                      customer.groupNumber,
                  )
                  ?.treatmentDates[
                    visit.visitNumber -
                      1
                  ] ??
                visit.scheduledDate;

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
                customer,
                treatmentName:
                  visit.treatmentName,
                scheduledDate:
                  visit.scheduledDate,
                visitNumber:
                  visit.visitNumber,
                programmeId:
                  programme.id,
                programmeVisitId:
                  visit.id,
                overridden:
                  standardDate !==
                  visit.scheduledDate,
                completed,
              };
            });
        })
        .sort((first, second) => {
          if (
            first.customer.vanNumber !==
            second.customer.vanNumber
          ) {
            return (
              first.customer.vanNumber -
              second.customer.vanNumber
            );
          }

          if (
            first.customer.groupNumber !==
            second.customer.groupNumber
          ) {
            return (
              first.customer.groupNumber -
              second.customer.groupNumber
            );
          }

          return first.customer.fullName.localeCompare(
            second.customer.fullName,
          );
        });
    }, [
      programmes,
      activeCustomers,
      selectedSeason,
      treatments,
      selectedDate,
    ]);

  const groupsDueOnDate =
    useMemo(() => {
      return Array.from(
        new Set(
          routeCustomers.map(
            (item) =>
              item.customer.groupNumber,
          ),
        ),
      ).sort(
        (first, second) =>
          first - second,
      );
    }, [routeCustomers]);

  useEffect(() => {
    if (
      groupsDueOnDate.length ===
        0 ||
      groupsDueOnDate.includes(
        selectedGroup,
      )
    ) {
      return;
    }

    setSelectedGroup(
      groupsDueOnDate[0],
    );

    setDestinationGroup(
      groupsDueOnDate[0],
    );
  }, [
    groupsDueOnDate,
    selectedGroup,
  ]);

  const selectedGroupCustomers =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return activeCustomers
        .filter(
          (customer) =>
            customer.groupNumber ===
            selectedGroup,
        )
        .filter(
          (customer) =>
            !query ||
            [
              customer.customerNumber,
              customer.fullName,
              customer.address,
              customer.postcode,
              String(
                customer.vanNumber,
              ),
            ].some((value) =>
              value
                .toLowerCase()
                .includes(query),
            ),
        )
        .sort((first, second) => {
          if (
            first.vanNumber !==
            second.vanNumber
          ) {
            return (
              first.vanNumber -
              second.vanNumber
            );
          }

          return first.fullName.localeCompare(
            second.fullName,
          );
        });
    }, [
      activeCustomers,
      selectedGroup,
      search,
    ]);

  const groupSummaries =
    useMemo(() => {
      return groupNumbers.map(
        (groupNumber) => {
          const groupCustomers =
            activeCustomers.filter(
              (customer) =>
                customer.groupNumber ===
                groupNumber,
            );

          const groupDates =
            selectedSeason
              ?.groupDates.find(
                (group) =>
                  group.groupNumber ===
                  groupNumber,
              );

          const dateIndex =
            groupDates
              ? groupDates.treatmentDates.findIndex(
                  (date) =>
                    date ===
                    selectedDate,
                )
              : -1;

          return {
            groupNumber,
            customerCount:
              groupCustomers.length,
            totalArea:
              groupCustomers.reduce(
                (total, customer) =>
                  total +
                  customer.lawnSize,
                0,
              ),
            totalValue:
              groupCustomers.reduce(
                (total, customer) =>
                  total +
                  customer.treatmentPrice,
                0,
              ),
            dueToday:
              routeCustomers.filter(
                (item) =>
                  item.customer.groupNumber ===
                  groupNumber,
              ).length,
            treatmentName:
              dateIndex >= 0
                ? selectedSeason
                    ?.treatmentRounds[
                      dateIndex
                    ]
                    ?.treatmentName ??
                  ""
                : "",
          };
        },
      );
    }, [
      groupNumbers,
      activeCustomers,
      selectedSeason,
      selectedDate,
      routeCustomers,
    ]);

  const selectedSummary =
    groupSummaries.find(
      (group) =>
        group.groupNumber ===
        selectedGroup,
    );

  const selectedRouteCustomers =
    routeCustomers.filter(
      (item) =>
        item.customer.groupNumber ===
        selectedGroup,
    );

  const completedRouteCount =
    selectedRouteCustomers.filter(
      (item) =>
        item.completed,
    ).length;

  const remainingRouteCount =
    selectedRouteCustomers.length -
    completedRouteCount;

  const selectedArea =
    selectedCustomers.reduce(
      (total, customerNumber) => {
        const customer =
          customers.find(
            (item) =>
              item.customerNumber ===
              customerNumber,
          );

        return (
          total +
          (customer?.lawnSize ??
            0)
        );
      },
      0,
    );

  const allDisplayedSelected =
    selectedGroupCustomers.length >
      0 &&
    selectedGroupCustomers.every(
      (customer) =>
        selectedCustomers.includes(
          customer.customerNumber,
        ),
    );

  function chooseGroup(
    groupNumber: number,
  ) {
    setSelectedGroup(
      groupNumber,
    );

    setDestinationGroup(
      groupNumber,
    );

    setSelectedCustomers([]);
    setSearch("");
  }

  function toggleCustomer(
    customerNumber: string,
  ) {
    setSelectedCustomers(
      (current) =>
        current.includes(
          customerNumber,
        )
          ? current.filter(
              (number) =>
                number !==
                customerNumber,
            )
          : [
              ...current,
              customerNumber,
            ],
    );
  }

  function toggleAllDisplayed() {
    const displayedNumbers =
      selectedGroupCustomers.map(
        (customer) =>
          customer.customerNumber,
      );

    if (allDisplayedSelected) {
      setSelectedCustomers(
        (current) =>
          current.filter(
            (number) =>
              !displayedNumbers.includes(
                number,
              ),
          ),
      );

      return;
    }

    setSelectedCustomers(
      (current) =>
        Array.from(
          new Set([
            ...current,
            ...displayedNumbers,
          ]),
        ),
    );
  }

  function moveSelectedCustomers() {
    if (
      selectedCustomers.length ===
      0
    ) {
      showMessage(
        "Select at least one customer first.",
      );
      return;
    }

    for (
      const customerNumber of
      selectedCustomers
    ) {
      const customer =
        customers.find(
          (item) =>
            item.customerNumber ===
            customerNumber,
        );

      if (!customer) {
        continue;
      }

      updateCustomer({
        ...customer,
        groupNumber:
          destinationGroup,
        vanNumber:
          destinationVan,
      });
    }

    const movedCount =
      selectedCustomers.length;

    setSelectedCustomers([]);

    showMessage(
      `${movedCount} customer${
        movedCount === 1
          ? ""
          : "s"
      } moved to Group ${destinationGroup}, Van ${destinationVan}. Their future programme dates will follow the new group automatically.`,
    );
  }

  function updateVan(
    customer: StoredCustomer,
    vanNumber: number,
  ) {
    updateCustomer({
      ...customer,
      vanNumber,
    });

    showMessage(
      `${customer.fullName} assigned to Van ${vanNumber}.`,
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
    programmesReady &&
    seasonsReady &&
    treatmentsReady;

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading groups and routes...
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
                Groups & Routes
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Route workload is derived from the
                shared Season Calendar, customer
                group assignments, vans and
                customer-specific date overrides.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Field label="Season">
                <select
                  value={selectedYear}
                  onChange={(event) => {
                    setSelectedYear(
                      Number(
                        event.target.value,
                      ),
                    );
                    setSelectedCustomers(
                      [],
                    );
                  }}
                  className="min-w-32 rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-[#338b45] focus:ring-4 focus:ring-green-100"
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

              <Field label="Working date">
                <select
                  value={selectedDate}
                  onChange={(event) => {
                    setSelectedDate(
                      event.target.value,
                    );
                    setSelectedCustomers(
                      [],
                    );
                  }}
                  className="min-w-[270px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-[#338b45] focus:ring-4 focus:ring-green-100"
                >
                  {seasonDates.length ===
                  0 ? (
                    <option value="">
                      No season dates
                    </option>
                  ) : (
                    seasonDates.map(
                      (date) => (
                        <option
                          key={date}
                          value={date}
                        >
                          {formatDateWithDay(
                            date,
                          )}
                        </option>
                      ),
                    )
                  )}
                </select>
              </Field>

              <Link
                href={
                  selectedDate
                    ? `/jobs?date=${selectedDate}`
                    : "/jobs"
                }
                className="inline-flex h-11 items-center rounded-xl bg-[#176b37] px-5 text-sm font-semibold text-white hover:bg-[#125b2f]"
              >
                Open date in Jobs
              </Link>
            </div>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          {!selectedSeason && (
            <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
              No Season Calendar is available for{" "}
              {selectedYear}. Create one in the{" "}
              <Link
                href="/season-planner"
                className="font-bold underline"
              >
                Season Planner
              </Link>
              .
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="Date workload"
              value={String(
                routeCustomers.length,
              )}
              detail="Customers due"
            />

            <SummaryCard
              label="Groups due"
              value={String(
                groupsDueOnDate.length,
              )}
              detail="Includes overrides"
            />

            <SummaryCard
              label="Completed"
              value={String(
                routeCustomers.filter(
                  (item) =>
                    item.completed,
                ).length,
              )}
              detail="Recorded outcomes"
            />

            <SummaryCard
              label="Remaining"
              value={String(
                routeCustomers.filter(
                  (item) =>
                    !item.completed,
                ).length,
              )}
              detail="Still to visit"
            />

            <SummaryCard
              label="Expected value"
              value={`£${routeCustomers
                .filter(
                  (item) =>
                    !item.completed,
                )
                .reduce(
                  (total, item) =>
                    total +
                    item.customer
                      .treatmentPrice,
                  0,
                )
                .toFixed(2)}`}
              detail="Remaining jobs"
            />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[350px_1fr]">
            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-bold">
                Customer groups
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Select a group to review membership
                and the route due on the chosen date.
              </p>

              <div className="mt-4 max-h-[68vh] space-y-2 overflow-y-auto pr-1">
                {groupSummaries.map(
                  (group) => {
                    const selected =
                      group.groupNumber ===
                      selectedGroup;

                    return (
                      <button
                        key={
                          group.groupNumber
                        }
                        type="button"
                        onClick={() =>
                          chooseGroup(
                            group.groupNumber,
                          )
                        }
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          selected
                            ? "border-[#338b45] bg-green-50"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-bold">
                              Group{" "}
                              {
                                group.groupNumber
                              }
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {
                                group.customerCount
                              }{" "}
                              customer
                              {group.customerCount ===
                              1
                                ? ""
                                : "s"}
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              group.dueToday >
                              0
                                ? "bg-green-100 text-green-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {
                              group.dueToday
                            }{" "}
                            due
                          </span>
                        </div>

                        {group.treatmentName && (
                          <div className="mt-2 text-xs font-semibold text-[#176b37]">
                            {
                              group.treatmentName
                            }
                          </div>
                        )}

                        <div className="mt-3 flex justify-between text-xs">
                          <span className="text-slate-500">
                            {group.totalArea.toLocaleString(
                              "en-GB",
                            )}{" "}
                            m²
                          </span>

                          <span className="font-semibold">
                            £
                            {group.totalValue.toFixed(
                              2,
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            </aside>

            <section className="min-w-0 space-y-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      Group {selectedGroup}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedRouteCustomers.length >
                      0
                        ? `${selectedRouteCustomers[0].treatmentName} is due for this group on ${formatDate(
                            selectedDate,
                          )}.`
                        : `No standard or overridden visits from this group are due on ${formatDate(
                            selectedDate,
                          )}.`}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-6 text-right">
                    <HeaderStat
                      label="Customers"
                      value={String(
                        selectedSummary
                          ?.customerCount ??
                          0,
                      )}
                    />

                    <HeaderStat
                      label="Due"
                      value={String(
                        selectedRouteCustomers.length,
                      )}
                    />

                    <HeaderStat
                      label="Remaining"
                      value={String(
                        remainingRouteCount,
                      )}
                    />
                  </div>
                </div>

                {selectedRouteCustomers.length >
                  0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <InfoBox
                      label="Completed"
                      value={String(
                        completedRouteCount,
                      )}
                      detail="Recorded today"
                    />

                    <InfoBox
                      label="Route area"
                      value={`${selectedRouteCustomers
                        .reduce(
                          (total, item) =>
                            total +
                            item.customer
                              .lawnSize,
                          0,
                        )
                        .toLocaleString(
                          "en-GB",
                        )} m²`}
                      detail="All jobs due"
                    />

                    <InfoBox
                      label="Route value"
                      value={`£${selectedRouteCustomers
                        .reduce(
                          (total, item) =>
                            total +
                            item.customer
                              .treatmentPrice,
                          0,
                        )
                        .toFixed(2)}`}
                      detail="Standard prices"
                    />
                  </div>
                )}
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[1fr_150px_125px_auto] lg:items-end">
                  <Field label="Search this group">
                    <input
                      value={search}
                      onChange={(event) =>
                        setSearch(
                          event.target.value,
                        )
                      }
                      placeholder="Name, number, address, postcode or van"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Move to group">
                    <select
                      value={
                        destinationGroup
                      }
                      onChange={(event) =>
                        setDestinationGroup(
                          Number(
                            event.target
                              .value,
                          ),
                        )
                      }
                      className={inputClass}
                    >
                      {groupNumbers.map(
                        (groupNumber) => (
                          <option
                            key={
                              groupNumber
                            }
                            value={
                              groupNumber
                            }
                          >
                            Group{" "}
                            {
                              groupNumber
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field label="Assign van">
                    <select
                      value={
                        destinationVan
                      }
                      onChange={(event) =>
                        setDestinationVan(
                          Number(
                            event.target
                              .value,
                          ),
                        )
                      }
                      className={inputClass}
                    >
                      {[1, 2, 3].map(
                        (van) => (
                          <option
                            key={van}
                            value={van}
                          >
                            Van {van}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <button
                    type="button"
                    onClick={
                      moveSelectedCustomers
                    }
                    className="h-11 rounded-xl bg-[#176b37] px-4 text-sm font-semibold text-white hover:bg-[#125b2f]"
                  >
                    Move selected
                  </button>
                </div>

                {selectedCustomers.length >
                  0 && (
                  <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    {selectedCustomers.length} selected
                    ·{" "}
                    {selectedArea.toLocaleString(
                      "en-GB",
                    )}{" "}
                    m²
                  </div>
                )}
              </article>

              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="grid grid-cols-[42px_85px_1.15fr_1.5fr_90px_120px_135px] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <input
                    type="checkbox"
                    checked={
                      allDisplayedSelected
                    }
                    onChange={
                      toggleAllDisplayed
                    }
                    className="h-4 w-4"
                    aria-label="Select all customers"
                  />

                  <span>Number</span>
                  <span>Customer</span>
                  <span>Address</span>
                  <span>Area</span>
                  <span>Van</span>
                  <span>Date status</span>
                </div>

                <div className="max-h-[48vh] overflow-y-auto">
                  {selectedGroupCustomers.length ===
                  0 ? (
                    <div className="p-10 text-center text-slate-500">
                      No active customers are assigned
                      to this group.
                    </div>
                  ) : (
                    selectedGroupCustomers.map(
                      (customer) => {
                        const routeItem =
                          selectedRouteCustomers.find(
                            (item) =>
                              item.customer
                                .customerNumber ===
                              customer.customerNumber,
                          );

                        return (
                          <div
                            key={
                              customer.customerNumber
                            }
                            className="grid grid-cols-[42px_85px_1.15fr_1.5fr_90px_120px_135px] items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0 hover:bg-green-50/40"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCustomers.includes(
                                customer.customerNumber,
                              )}
                              onChange={() =>
                                toggleCustomer(
                                  customer.customerNumber,
                                )
                              }
                              className="h-4 w-4"
                            />

                            <Link
                              href={`/customers/${customer.customerNumber}`}
                              className="font-bold text-[#176b37] hover:underline"
                            >
                              {
                                customer.customerNumber
                              }
                            </Link>

                            <div>
                              <div className="font-semibold">
                                {
                                  customer.fullName
                                }
                              </div>

                              <div className="mt-0.5 flex flex-wrap gap-2 text-xs">
                                {customer.lockedGate && (
                                  <span className="font-bold text-red-600">
                                    Locked gate
                                  </span>
                                )}

                                {customer.dogOnProperty && (
                                  <span className="font-bold text-amber-700">
                                    Dog
                                  </span>
                                )}
                              </div>
                            </div>

                            <span className="text-slate-600">
                              {customer.address},{" "}
                              {customer.postcode}
                            </span>

                            <span>
                              {customer.lawnSize.toLocaleString(
                                "en-GB",
                              )}{" "}
                              m²
                            </span>

                            <select
                              value={
                                customer.vanNumber
                              }
                              onChange={(event) =>
                                updateVan(
                                  customer,
                                  Number(
                                    event.target
                                      .value,
                                  ),
                                )
                              }
                              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
                            >
                              {[1, 2, 3].map(
                                (van) => (
                                  <option
                                    key={van}
                                    value={van}
                                  >
                                    Van {van}
                                  </option>
                                ),
                              )}
                            </select>

                            {routeItem ? (
                              <div>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                    routeItem.completed
                                      ? "bg-green-100 text-green-800"
                                      : routeItem.overridden
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {routeItem.completed
                                    ? "Completed"
                                    : routeItem.overridden
                                      ? "Override due"
                                      : "Due"}
                                </span>

                                <div className="mt-2 text-xs text-slate-500">
                                  {
                                    routeItem.treatmentName
                                  }
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">
                                Not due
                              </span>
                            )}
                          </div>
                        );
                      },
                    )
                  )}
                </div>
              </article>
            </section>
          </section>
        </div>
      </main>
    </AppShell>
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

function formatDateWithDay(
  value: string,
) {
  if (!isDateValue(value)) {
    return "No date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
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
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 h-1.5 w-10 rounded-full bg-[#338b45]" />

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

function HeaderStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-xl font-bold">
        {value}
      </div>
    </div>
  );
}

function InfoBox({
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
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </div>
  );
}