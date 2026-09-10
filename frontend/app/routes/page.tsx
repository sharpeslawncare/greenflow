"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { useFleetStore } from "@/components/fleet-store";
import { useRouteOrderStore } from "@/components/route-order-store";
import {
  formatDate,
  formatDateWithDay,
  getTodayDateValue,
} from "@/lib/date-utils";
import { formatProgrammeTreatmentLabel } from "@/lib/programme-treatment-labels";

type RouteCustomer = {
  customer: StoredCustomer;
  source: "programme" | "additional";
  treatmentName: string;
  price: number;
  scheduledDate: string;
  visitNumber: number;
  programmeId: string;
  programmeVisitId: string;
  overridden: boolean;
  completed: boolean;
};

type RouteMessageTone =
  | "success"
  | "error";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

export default function RoutesPage() {
  const searchParams =
    useSearchParams();

  const requestedDate =
    searchParams.get("date") ?? "";

  const preparationWorkflow =
    searchParams.get("workflow") === "prepare";

  const initialDate =
    isDateValue(requestedDate)
      ? requestedDate
      : getTodayDateValue();

  const initialYear =
    Number(initialDate.slice(0, 4)) ||
    new Date().getFullYear();

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


  const {
    activeVehicles,
    ready: fleetReady,
    getVehicle,
  } = useFleetStore();

  const {
    ready: routeOrderReady,
    getRouteOrder,
    saveRouteOrder,
    clearRouteOrder,
    createPostcodeOrder,
    sortBySavedRoute,
  } = useRouteOrderStore();

  const currentYear =
    new Date().getFullYear();

  const [selectedYear, setSelectedYear] =
    useState(initialYear);

  const [selectedDate, setSelectedDate] =
    useState(initialDate);

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

  const [messageTone, setMessageTone] =
    useState<RouteMessageTone>(
      "success",
    );

  useEffect(() => {
    if (!isDateValue(requestedDate)) {
      return;
    }

    if (requestedDate !== selectedDate) {
      setSelectedDate(requestedDate);
      setSelectedCustomers([]);
    }

    const requestedYear =
      Number(requestedDate.slice(0, 4));

    if (
      Number.isFinite(requestedYear) &&
      requestedYear > 0 &&
      requestedYear !== selectedYear
    ) {
      setSelectedYear(requestedYear);
    }
  }, [
    requestedDate,
    selectedDate,
    selectedYear,
  ]);

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

  const activeVanNumbers =
    useMemo(
      () =>
        new Set(
          activeVehicles.map(
            (vehicle) =>
              vehicle.number,
          ),
        ),
      [activeVehicles],
    );

  const customersWithInvalidVan =
    useMemo(
      () =>
        activeCustomers.filter(
          (customer) =>
            !activeVanNumbers.has(
              customer.vanNumber,
            ),
        ),
      [
        activeCustomers,
        activeVanNumbers,
      ],
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


  useEffect(() => {
    const activeNumbers =
      activeVehicles.map(
        (vehicle) =>
          vehicle.number,
      );

    if (
      activeNumbers.length === 0 ||
      activeNumbers.includes(
        destinationVan,
      )
    ) {
      return;
    }

    setDestinationVan(
      activeNumbers[0],
    );
  }, [
    activeVehicles,
    destinationVan,
  ]);

  const routeCustomers =
    useMemo<RouteCustomer[]>(() => {
      if (!selectedDate) {
        return [];
      }

      const seasonalItems =
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
                  source:
                    "programme" as const,
                  treatmentName:
                    visit.treatmentName,
                  price:
                    customer.treatmentPrice,
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
          },
        );

      const additionalItems =
        activeCustomers.flatMap(
          (customer) =>
            customer.additionalJobs
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
                customer,
                source:
                  "additional" as const,
                treatmentName:
                  job.treatmentName,
                price: job.price,
                scheduledDate:
                  job.scheduledDate,
                visitNumber: 0,
                programmeId:
                  `additional-jobs-${customer.customerNumber}`,
                programmeVisitId:
                  job.id,
                overridden: false,
                completed:
                  job.status ===
                  "Completed",
              })),
        );

      return sortBySavedRoute(
        [
          ...seasonalItems,
          ...additionalItems,
        ],
        selectedDate,
      );
    }, [
      programmes,
      activeCustomers,
      selectedSeason,
      treatments,
      selectedDate,
      sortBySavedRoute,
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


  const vanSummaries =
    useMemo(() => {
      const vanNumbers =
        activeVehicles.map(
          (vehicle) =>
            vehicle.number,
        );

      return vanNumbers.map(
        (vanNumber) => {
          const vanJobs =
            routeCustomers.filter(
              (item) =>
                item.customer.vanNumber ===
                vanNumber,
            );

          const completedJobs =
            vanJobs.filter(
              (item) =>
                item.completed,
            );

          const remainingJobs =
            vanJobs.filter(
              (item) =>
                !item.completed,
            );

          const totalArea =
            vanJobs.reduce(
              (total, item) =>
                total +
                item.customer.lawnSize,
              0,
            );

          const completedArea =
            completedJobs.reduce(
              (total, item) =>
                total +
                item.customer.lawnSize,
              0,
            );

          const remainingValue =
            remainingJobs.reduce(
              (total, item) =>
                total +
                item.price,
              0,
            );

          const progress =
            vanJobs.length > 0
              ? Math.round(
                  (completedJobs.length /
                    vanJobs.length) *
                    100,
                )
              : 0;

          return {
            vanNumber,
            totalJobs:
              vanJobs.length,
            completedJobs:
              completedJobs.length,
            remainingJobs:
              remainingJobs.length,
            totalArea,
            completedArea,
            remainingValue,
            progress,
            lockedGates:
              vanJobs.filter(
                (item) =>
                  item.customer.lockedGate,
              ).length,
            dogs:
              vanJobs.filter(
                (item) =>
                  item.customer.dogOnProperty,
              ).length,
            overrides:
              vanJobs.filter(
                (item) =>
                  item.overridden,
              ).length,
          };
        },
      );
    }, [
      activeVehicles,
      routeCustomers,
    ]);

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
        "error",
      );
      return;
    }

    if (
      !groupNumbers.includes(
        destinationGroup,
      )
    ) {
      showMessage(
        "Choose a valid destination group.",
        "error",
      );
      return;
    }

    if (
      !activeVanNumbers.has(
        destinationVan,
      )
    ) {
      showMessage(
        "Choose an active destination van before moving customers.",
        "error",
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
      } moved to Group ${destinationGroup}, ${
        getVehicle(
          destinationVan,
        )?.name ??
        `Van ${destinationVan}`
      }. Their future programme dates will follow the new group automatically.`,
    );
  }

  function updateVan(
    customer: StoredCustomer,
    vanNumber: number,
  ) {
    if (
      !activeVanNumbers.has(
        vanNumber,
      )
    ) {
      showMessage(
        "Choose an active van.",
        "error",
      );
      return;
    }

    updateCustomer({
      ...customer,
      vanNumber,
    });

    showMessage(
      `${customer.fullName} assigned to ${
        getVehicle(
          vanNumber,
        )?.name ??
        `Van ${vanNumber}`
      }.`,
    );
  }

  function moveRouteCustomer(
    vanNumber: number,
    customerNumber: string,
    direction: "up" | "down",
  ) {
    /*
     * Route order is a CUSTOMER-STOP order, not a job order.
     *
     * A customer can now have more than one job on the same
     * day (for example their programme treatment + Aeration).
     * The canonical route store deliberately saves unique
     * customer numbers, so the arrow controls must also work
     * from a unique list of customer stops.
     */
    const remainingNumbers =
      getRemainingRouteStops(
        routeCustomers,
        vanNumber,
      ).map(
        (stop) =>
          stop.customer.customerNumber,
      );

    const currentIndex =
      remainingNumbers.indexOf(
        customerNumber,
      );

    if (currentIndex < 0) {
      showMessage(
        "That customer is no longer available in the remaining route.",
        "error",
      );
      return;
    }

    const targetIndex =
      direction === "up"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= remainingNumbers.length
    ) {
      return;
    }

    const nextOrder = [
      ...remainingNumbers,
    ];

    [
      nextOrder[currentIndex],
      nextOrder[targetIndex],
    ] = [
      nextOrder[targetIndex],
      nextOrder[currentIndex],
    ];

    saveRouteOrder(
      selectedDate,
      vanNumber,
      nextOrder,
    );

    showMessage(
      "Route order updated. Jobs and Visit Centre will use the saved customer-stop order.",
    );
  }

  function optimiseVanRoute(
    vanNumber: number,
  ) {
    const remainingCustomers =
      routeCustomers
        .filter(
          (item) =>
            item.customer.vanNumber ===
              vanNumber &&
            !item.completed,
        )
        .map(
          (item) =>
            item.customer,
        );

    if (
      remainingCustomers.length === 0
    ) {
      showMessage(
        "There are no remaining customers to optimise.",
        "error",
      );
      return;
    }

    saveRouteOrder(
      selectedDate,
      vanNumber,
      createPostcodeOrder(
        remainingCustomers,
      ),
    );

    showMessage(
      `${
        getVehicle(
          vanNumber,
        )?.name ??
        `Van ${vanNumber}`
      } ordered by postcode area.`,
    );
  }

  function resetVanRoute(
    vanNumber: number,
  ) {
    clearRouteOrder(
      selectedDate,
      vanNumber,
    );

    showMessage(
      `${
        getVehicle(
          vanNumber,
        )?.name ??
        `Van ${vanNumber}`
      } route order reset.`,
    );
  }

  function showMessage(
    text: string,
    tone: RouteMessageTone = "success",
  ) {
    setMessage(text);
    setMessageTone(tone);

    window.setTimeout(() => {
      setMessage("");
    }, 3800);
  }

  const ready =
    customersReady &&
    programmesReady &&
    seasonsReady &&
    treatmentsReady &&
    fleetReady &&
    routeOrderReady;

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
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => {
                      const nextDate =
                        event.target.value;

                      setSelectedDate(
                        nextDate,
                      );

                      if (nextDate) {
                        setSelectedYear(
                          Number(
                            nextDate.slice(
                              0,
                              4,
                            ),
                          ),
                        );
                      }

                      setSelectedCustomers(
                        [],
                      );
                    }}
                    className="min-w-[190px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-[#338b45] focus:ring-4 focus:ring-green-100"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const today =
                        getTodayDateValue();

                      setSelectedDate(
                        today,
                      );

                      setSelectedYear(
                        Number(
                          today.slice(
                            0,
                            4,
                          ),
                        ),
                      );

                      setSelectedCustomers(
                        [],
                      );
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Today
                  </button>
                </div>
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

          {preparationWorkflow && (
            <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#176b37]">
                    Prepare the working day
                  </div>
                  <h2 className="mt-1 text-xl font-bold text-slate-950">
                    Step 2 of 3 · Check route
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    Put customers in the order you want to visit them, then continue to the route-ordered customer sheets.
                  </p>
                </div>

                <Link
                  href={`/communications?date=${selectedDate}&workflow=prepare`}
                  className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ← Back
                </Link>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <WorkflowProgressCard number="1" title="Contact customers" state="done" />
                <WorkflowProgressCard number="2" title="Check route" state="current" />
                <WorkflowProgressCard number="3" title="Print pack" state="later" />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50 p-4">
                <div>
                  <div className="font-bold text-green-950">Route looking right?</div>
                  <div className="mt-1 text-sm text-green-800">
                    Continue to the complete customer pack in this exact saved order.
                  </div>
                </div>

                <Link
                  href={`/jobs/print?date=${selectedDate}&workflow=prepare`}
                  className="inline-flex items-center rounded-xl bg-[#176b37] px-5 py-3 text-sm font-bold text-white hover:bg-[#125b2f]"
                >
                  Next: Print customer sheets →
                </Link>
              </div>
            </section>
          )}

          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Working day workflow
                </div>

                <h2 className="mt-1 text-lg font-bold text-slate-950">
                  {formatDateWithDay(selectedDate)}
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Review the route and working order for the selected date, then
                  continue into Visit Centre to record the work.
                </p>
              </div>

              <div className="text-xs font-semibold text-slate-500">
                Stage 2 of 4
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <WorkingDayStage
                number="1"
                title="Review Jobs"
                detail={`${routeCustomers.length} job${
                  routeCustomers.length === 1 ? "" : "s"
                } on the selected date.`}
                href={`/jobs?date=${selectedDate}`}
                state="complete"
              />

              <WorkingDayStage
                number="2"
                title="Groups & Routes"
                detail={`${groupsDueOnDate.length} group${
                  groupsDueOnDate.length === 1 ? "" : "s"
                } due · ${routeCustomers.filter((item) => !item.completed).length} remaining`}
                href={`/routes?date=${selectedDate}`}
                state="current"
              />

              <WorkingDayStage
                number="3"
                title="Visit Centre"
                detail="Follow the saved route order and record outcomes."
                href={`/visit-centre?date=${selectedDate}&group=${selectedGroup}`}
                state="next"
              />

              <WorkingDayStage
                number="4"
                title="Close Day"
                detail="Return to Dashboard for the end-of-day check."
                href={`/?date=${selectedDate}`}
                state="later"
              />
            </div>
          </section>

          {message && (
            <div
              role={
                messageTone === "error"
                  ? "alert"
                  : "status"
              }
              className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                messageTone === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-green-200 bg-green-50 text-green-800"
              }`}
            >
              {message}
            </div>
          )}

          {customersWithInvalidVan.length > 0 && (
            <section
              role="alert"
              className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"
            >
              <div className="font-bold">
                Van assignments need attention
              </div>

              <p className="mt-1">
                {customersWithInvalidVan.length} active customer{customersWithInvalidVan.length === 1 ? "" : "s"} are assigned to a van that is missing or inactive. GreenFlow has not changed those assignments automatically.
              </p>

              <p className="mt-2">
                Review the affected customers below and deliberately assign each one to an active van.
              </p>
            </section>
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

          {selectedSeason &&
            routeCustomers.length === 0 && (
              <section className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
                No routes or customer visits are scheduled for{" "}
                <strong>
                  {formatDateWithDay(
                    selectedDate,
                  )}
                </strong>
                . The working date remains on the actual calendar date rather
                than jumping to the next treatment day.
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

          <section className="mt-4">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  Daily Route Board
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Van workload and progress for{" "}
                  {formatDateWithDay(
                    selectedDate,
                  )}.
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {vanSummaries.map(
                (van) => (
                  <article
                    key={van.vanNumber}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#338b45]">
                          Route
                        </div>

                        <h3 className="mt-1 text-2xl font-bold">
                          {getVehicle(
                            van.vanNumber,
                          )?.name ??
                            `Van ${van.vanNumber}`}
                        </h3>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                        {van.totalJobs} job
                        {van.totalJobs === 1
                          ? ""
                          : "s"}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-slate-600">
                          Progress
                        </span>

                        <span className="font-bold">
                          {van.completedJobs} /{" "}
                          {van.totalJobs}
                        </span>
                      </div>

                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[#176b37] transition-all"
                          style={{
                            width: `${van.progress}%`,
                          }}
                        />
                      </div>

                      <div className="mt-1 text-right text-xs font-semibold text-slate-500">
                        {van.progress}%
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <InfoBox
                        label="Remaining"
                        value={String(
                          van.remainingJobs,
                        )}
                        detail="Jobs left"
                      />

                      <InfoBox
                        label="Remaining value"
                        value={`£${van.remainingValue.toFixed(
                          2,
                        )}`}
                        detail="Scheduled job values"
                      />

                      <InfoBox
                        label="Route area"
                        value={`${van.totalArea.toLocaleString(
                          "en-GB",
                        )} m²`}
                        detail="All due lawns"
                      />

                      <InfoBox
                        label="Completed area"
                        value={`${van.completedArea.toLocaleString(
                          "en-GB",
                        )} m²`}
                        detail="Recorded work"
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {van.lockedGates > 0 && (
                        <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">
                          {van.lockedGates} locked gate
                          {van.lockedGates === 1
                            ? ""
                            : "s"}
                        </span>
                      )}

                      {van.dogs > 0 && (
                        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
                          {van.dogs} dog warning
                          {van.dogs === 1
                            ? ""
                            : "s"}
                        </span>
                      )}

                      {van.overrides > 0 && (
                        <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-800">
                          {van.overrides} override
                          {van.overrides === 1
                            ? ""
                            : "s"}
                        </span>
                      )}
                    </div>

                    {van.remainingJobs > 0 && (
                      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wide text-blue-800">
                              Today&apos;s route order
                            </div>
                            <div className="mt-1 text-xs text-blue-800">
                              Use the arrows to put the remaining customers in the order you want to visit them. The saved order is shared with Jobs and Visit Centre.
                            </div>
                          </div>

                          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-blue-800">
                            {getRemainingRouteStops(
                              routeCustomers,
                              van.vanNumber,
                            ).length}{" "}
                            stops · {van.remainingJobs} jobs
                          </span>
                        </div>

                        <div className="mt-3 space-y-2">
                          {getRemainingRouteStops(
                            routeCustomers,
                            van.vanNumber,
                          ).map(
                            (
                              stop,
                              index,
                              stops,
                            ) => (
                              <div
                                key={
                                  stop.customer
                                    .customerNumber
                                }
                                className="flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2"
                              >
                                <span className="w-7 shrink-0 text-center text-sm font-bold text-blue-900">
                                  {index + 1}
                                </span>

                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-semibold text-slate-900">
                                    {
                                      stop.customer
                                        .fullName
                                    }
                                  </div>

                                  <div className="truncate text-xs text-slate-500">
                                    {
                                      stop.customer
                                        .postcode
                                    }
                                    {" · "}
                                    {stop.treatmentNames.map(formatProgrammeTreatmentLabel).join(
                                      " + ",
                                    )}
                                  </div>

                                  {stop.jobCount > 1 && (
                                    <div className="mt-0.5 text-[11px] font-semibold text-blue-700">
                                      {stop.jobCount} jobs at this customer stop
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    moveRouteCustomer(
                                      van.vanNumber,
                                      stop.customer
                                        .customerNumber,
                                      "up",
                                    )
                                  }
                                  disabled={index === 0}
                                  aria-label={`Move ${stop.customer.fullName} up`}
                                  title="Move up"
                                  className={`h-9 w-9 rounded-lg border text-base font-bold ${
                                    index === 0
                                      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
                                      : "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
                                  }`}
                                >
                                  ↑
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    moveRouteCustomer(
                                      van.vanNumber,
                                      stop.customer
                                        .customerNumber,
                                      "down",
                                    )
                                  }
                                  disabled={
                                    index ===
                                    stops.length - 1
                                  }
                                  aria-label={`Move ${stop.customer.fullName} down`}
                                  title="Move down"
                                  className={`h-9 w-9 rounded-lg border text-base font-bold ${
                                    index ===
                                    stops.length - 1
                                      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
                                      : "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
                                  }`}
                                >
                                  ↓
                                </button>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          optimiseVanRoute(
                            van.vanNumber,
                          )
                        }
                        className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100"
                      >
                        Optimise by postcode
                      </button>

                      {getRouteOrder(
                        selectedDate,
                        van.vanNumber,
                      ).length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            resetVanRoute(
                              van.vanNumber,
                            )
                          }
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Reset order
                        </button>
                      )}

                      <Link
                        href={`/jobs?date=${selectedDate}&van=${van.vanNumber}`}
                        className="rounded-xl border border-[#338b45] bg-white px-4 py-2.5 text-sm font-semibold text-[#176b37] hover:bg-green-50"
                      >
                        Open in Jobs
                      </Link>

                      <Link
                        href={`/visit-centre?date=${selectedDate}&van=${van.vanNumber}`}
                        className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
                      >
                        Open route
                      </Link>
                    </div>
                  </article>
                ),
              )}
            </div>
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
                        ? `${selectedRouteCustomers.length} job${
                            selectedRouteCustomers.length === 1
                              ? ""
                              : "s"
                          } are due for this group on ${formatDate(
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
                            item.price,
                          0,
                        )
                        .toFixed(2)}`}
                      detail="Scheduled job values"
                    />
                  </div>
                )}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Link
                    href={`/jobs?date=${selectedDate}`}
                    className="rounded-xl border border-[#338b45] bg-white px-4 py-2.5 text-sm font-semibold text-[#176b37] hover:bg-green-50"
                  >
                    Open group date in Jobs
                  </Link>

                  <Link
                    href={`/visit-centre?date=${selectedDate}&group=${selectedGroup}`}
                    className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
                  >
                    Open group in Visit Centre
                  </Link>
                </div>
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
                      {activeVehicles.map(
                        (vehicle) => (
                          <option
                            key={
                              vehicle.id
                            }
                            value={
                              vehicle.number
                            }
                          >
                            {
                              vehicle.name
                            }
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
                    disabled={
                      activeVehicles.length === 0
                    }
                    className={`h-11 rounded-xl px-4 text-sm font-semibold text-white ${
                      activeVehicles.length === 0
                        ? "cursor-not-allowed bg-slate-400"
                        : "bg-[#176b37] hover:bg-[#125b2f]"
                    }`}
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
                              className={`rounded-lg border bg-white px-2 py-2 text-sm ${
                                activeVanNumbers.has(
                                  customer.vanNumber,
                                )
                                  ? "border-slate-300"
                                  : "border-amber-400 bg-amber-50"
                              }`}
                            >
                              {!activeVanNumbers.has(
                                customer.vanNumber,
                              ) && (
                                <option
                                  value={
                                    customer.vanNumber
                                  }
                                  disabled
                                >
                                  Van {customer.vanNumber} — inactive/missing
                                </option>
                              )}

                              {activeVehicles.map(
                                (vehicle) => (
                                  <option
                                    key={
                                      vehicle.id
                                    }
                                    value={
                                      vehicle.number
                                    }
                                  >
                                    {
                                      vehicle.name
                                    }
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

function WorkflowProgressCard({
  number,
  title,
  state,
}: {
  number: string;
  title: string;
  state: "done" | "current" | "later";
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        state === "done"
          ? "border-green-200 bg-green-50"
          : state === "current"
            ? "border-[#338b45] bg-green-50"
            : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
            state === "done" || state === "current"
              ? "bg-[#176b37] text-white"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {state === "done" ? "✓" : number}
        </span>
        <div>
          <div className="text-sm font-bold text-slate-950">{title}</div>
          <div className="mt-0.5 text-xs font-semibold text-slate-500">
            {state === "done" ? "Done" : state === "current" ? "Current step" : "Next"}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkingDayStage({
  number,
  title,
  detail,
  href,
  state,
}: {
  number: string;
  title: string;
  detail: string;
  href: string;
  state: "complete" | "current" | "next" | "later";
}) {
  const styles =
    state === "current"
      ? "border-green-300 bg-green-50"
      : state === "complete"
        ? "border-slate-200 bg-white"
        : state === "next"
          ? "border-blue-200 bg-blue-50/60"
          : "border-slate-200 bg-slate-50";

  const badgeStyles =
    state === "current"
      ? "bg-[#176b37] text-white"
      : state === "complete"
        ? "bg-green-100 text-green-800"
        : state === "next"
          ? "bg-blue-100 text-blue-800"
          : "bg-slate-200 text-slate-700";

  const actionLabel =
    state === "current"
      ? "Current stage"
      : state === "complete"
        ? "Back to Jobs"
        : state === "next"
          ? "Continue to Visit Centre"
          : "Open Dashboard";

  return (
    <Link
      href={href}
      className={`group rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${styles}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${badgeStyles}`}
        >
          {state === "complete" ? "✓" : number}
        </span>

        <div className="min-w-0">
          <div className="font-bold text-slate-950">
            {title}
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-600">
            {detail}
          </p>

          <div className="mt-3 text-xs font-black text-slate-700">
            {actionLabel}
            {state !== "current" && (
              <span className="ml-1 inline-block transition group-hover:translate-x-0.5">
                →
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function getRemainingRouteStops(
  routeCustomers: RouteCustomer[],
  vanNumber: number,
) {
  const stops = new Map<
    string,
    {
      customer: StoredCustomer;
      treatmentNames: string[];
      jobCount: number;
    }
  >();

  routeCustomers
    .filter(
      (item) =>
        item.customer.vanNumber ===
          vanNumber &&
        !item.completed,
    )
    .forEach((item) => {
      const customerNumber =
        item.customer.customerNumber;

      const existing =
        stops.get(customerNumber);

      if (existing) {
        if (
          !existing.treatmentNames.includes(
            item.treatmentName,
          )
        ) {
          existing.treatmentNames.push(
            item.treatmentName,
          );
        }

        existing.jobCount += 1;
        return;
      }

      stops.set(customerNumber, {
        customer: item.customer,
        treatmentNames: [
          item.treatmentName,
        ],
        jobCount: 1,
      });
    });

  return Array.from(
    stops.values(),
  );
}

function isDateValue(
  value: string,
): value is string {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const [year, month, day] =
    value.split("-").map(Number);

  const date =
    new Date(year, month - 1, day);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
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