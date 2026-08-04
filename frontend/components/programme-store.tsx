"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type StoredCustomer,
  useCustomerStore,
} from "@/components/customer-store";

import {
  type GroupSeasonDates,
  type SeasonCalendar,
  useSeasonStore,
} from "@/components/season-store";

export type ProgrammeVisitStatus =
  | "Planned"
  | "Scheduled"
  | "Completed"
  | "Skipped";

export type ProgrammeVisit = {
  id: string;

  /*
   * The original treatment-round number remains
   * stable even when earlier rounds are omitted.
   *
   * A new customer beginning during Treatment 3
   * therefore receives visits numbered 3, 4 and 5.
   */
  visitNumber: number;

  treatmentName: string;
  scheduledDate: string;

  /*
   * This remains the configured season gap, such
   * as 70 days. It is not recalculated from the
   * displayed calendar dates.
   */
  gapAfterPreviousDays: number;

  status: ProgrammeVisitStatus;
  notes: string;
};

export type CustomerProgramme = {
  id: string;
  customerNumber: string;
  year: number;

  createdAt: string;

  programmeName: string;

  /*
   * For an established customer this is their
   * Group Treatment 1 date.
   *
   * For a new mid-season customer this is their
   * first eligible future treatment date.
   */
  startDate: string;

  avoidWednesdays: boolean;
  avoidWeekends: boolean;

  visits: ProgrammeVisit[];
};

type ProgrammeStoreValue = {
  programmes: CustomerProgramme[];
  ready: boolean;

  saveProgramme: (
    programme: CustomerProgramme,
  ) => void;

  deleteProgramme: (
    programmeId: string,
  ) => void;

  getProgrammeForCustomer: (
    customerNumber: string,
    year: number,
  ) => CustomerProgramme | undefined;

  getProgrammesForCustomer: (
    customerNumber: string,
  ) => CustomerProgramme[];

  applySeasonDatesToCustomer: (
    customerNumber: string,
    year: number,
  ) => CustomerProgramme | null;

  ensureProgrammesForSeason: (
    year: number,
  ) => number;

  canScheduleDate: (
    customerNumber: string,
    date: string,
  ) => boolean;
};

const ProgrammeStoreContext =
  createContext<ProgrammeStoreValue | null>(
    null,
  );

const STORAGE_KEY =
  "greenflow-customer-programmes-v1";

const STANDARD_PROGRAMME_NAME =
  "Standard Annual Lawn Care Programme";

export function ProgrammeStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    seasons,
    ready: seasonsReady,
  } = useSeasonStore();

  const [
    programmes,
    setProgrammes,
  ] = useState<CustomerProgramme[]>(
    [],
  );

  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    const saved =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (saved) {
      try {
        const parsed = JSON.parse(
          saved,
        ) as Array<
          Partial<CustomerProgramme>
        >;

        if (Array.isArray(parsed)) {
          setProgrammes(
            parsed
              .map(
                normaliseStoredProgramme,
              )
              .sort(
                sortProgrammes,
              ),
          );
        }
      } catch {
        window.localStorage.removeItem(
          STORAGE_KEY,
        );

        setProgrammes([]);
      }
    }

    setReady(true);
  }, []);

  /*
   * Customers are synchronised automatically.
   *
   * There is no need to press Generate Programme
   * for every customer.
   *
   * Their group number provides all standard dates.
   */
  useEffect(() => {
    if (
      !ready ||
      !customersReady ||
      !seasonsReady
    ) {
      return;
    }

    setProgrammes((current) => {
      const next =
        synchroniseAllProgrammes(
          current,
          customers,
          seasons,
        );

      return programmesAreEqual(
        current,
        next,
      )
        ? current
        : next;
    });
  }, [
    ready,
    customersReady,
    seasonsReady,
    customers,
    seasons,
  ]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(programmes),
    );
  }, [programmes, ready]);

  function saveProgramme(
    programme: CustomerProgramme,
  ) {
    const customer =
      customers.find(
        (item) =>
          item.customerNumber ===
          programme.customerNumber,
      );

    const season =
      seasons.find(
        (item) =>
          item.year ===
          programme.year,
      );

    let normalised =
      normaliseStoredProgramme(
        programme,
      );

    if (
      customer &&
      season
    ) {
      const groupDates =
        getGroupSeasonDates(
          season,
          customer.groupNumber,
        );

      if (groupDates) {
        normalised =
          mergeProgrammeWithSeason({
            existing:
              normalised,

            customer,
            season,
            groupDates,
          });
      }
    }

    /*
     * A manually added Scheduled or Planned visit
     * with a past date is removed.
     *
     * Completed and Skipped historical records are
     * retained.
     */
    normalised = {
      ...normalised,

      visits:
        removeInvalidPastActiveVisits(
          normalised.visits,
          customer,
        ),
    };

    normalised = {
      ...normalised,

      startDate:
        normalised.visits[0]
          ?.scheduledDate ??
        "",
    };

    setProgrammes(
      (current) => {
        const existingIndex =
          current.findIndex(
            (item) =>
              item.customerNumber ===
                normalised.customerNumber &&
              item.year ===
                normalised.year,
          );

        if (
          existingIndex === -1
        ) {
          return [
            normalised,
            ...current,
          ].sort(
            sortProgrammes,
          );
        }

        return current
          .map(
            (item, index) =>
              index ===
              existingIndex
                ? normalised
                : item,
          )
          .sort(
            sortProgrammes,
          );
      },
    );
  }

  function deleteProgramme(
    programmeId: string,
  ) {
    setProgrammes((current) =>
      current.filter(
        (programme) =>
          programme.id !==
          programmeId,
      ),
    );
  }

  function getProgrammeForCustomer(
    customerNumber: string,
    year: number,
  ) {
    return programmes.find(
      (programme) =>
        programme.customerNumber ===
          customerNumber &&
        programme.year === year,
    );
  }

  function getProgrammesForCustomer(
    customerNumber: string,
  ) {
    return programmes
      .filter(
        (programme) =>
          programme.customerNumber ===
          customerNumber,
      )
      .sort(
        (first, second) =>
          second.year -
          first.year,
      );
  }

  function applySeasonDatesToCustomer(
    customerNumber: string,
    year: number,
  ) {
    const customer =
      customers.find(
        (item) =>
          item.customerNumber ===
          customerNumber,
      );

    const season =
      seasons.find(
        (item) =>
          item.year === year,
      );

    if (
      !customer ||
      !season
    ) {
      return null;
    }

    const groupDates =
      getGroupSeasonDates(
        season,
        customer.groupNumber,
      );

    if (!groupDates) {
      return null;
    }

    const existing =
      programmes.find(
        (programme) =>
          programme.customerNumber ===
            customerNumber &&
          programme.year === year,
      );

    const updated =
      mergeProgrammeWithSeason({
        existing,
        customer,
        season,
        groupDates,
        forceGroupDates: true,
      });

    setProgrammes((current) => {
      const exists =
        current.some(
          (programme) =>
            programme.customerNumber ===
              customerNumber &&
            programme.year === year,
        );

      if (!exists) {
        return [
          updated,
          ...current,
        ].sort(sortProgrammes);
      }

      return current
        .map((programme) =>
          programme.customerNumber ===
              customerNumber &&
          programme.year === year
            ? updated
            : programme,
        )
        .sort(sortProgrammes);
    });

    return updated;
  }

  function ensureProgrammesForSeason(
    year: number,
  ) {
    const season =
      seasons.find(
        (item) =>
          item.year === year,
      );

    if (!season) {
      return 0;
    }

    const activeCustomers =
      customers.filter(
        (customer) =>
          customer.status ===
          "Active",
      );

    let createdCount = 0;

    setProgrammes((current) => {
      let next = [...current];

      for (
        const customer of
        activeCustomers
      ) {
        const groupDates =
          getGroupSeasonDates(
            season,
            customer.groupNumber,
          );

        if (!groupDates) {
          continue;
        }

        const existing =
          next.find(
            (programme) =>
              programme.customerNumber ===
                customer.customerNumber &&
              programme.year ===
                year,
          );

        if (!existing) {
          createdCount += 1;
        }

        const merged =
          mergeProgrammeWithSeason({
            existing,
            customer,
            season,
            groupDates,
          });

        if (!existing) {
          next = [
            merged,
            ...next,
          ];
        } else {
          next = next.map(
            (programme) =>
              programme.customerNumber ===
                  customer.customerNumber &&
              programme.year ===
                  year
                ? merged
                : programme,
          );
        }
      }

      return next.sort(
        sortProgrammes,
      );
    });

    return createdCount;
  }

  function canScheduleDate(
    customerNumber: string,
    date: string,
  ) {
    if (!isDateValue(date)) {
      return false;
    }

    const customer =
      customers.find(
        (item) =>
          item.customerNumber ===
          customerNumber,
      );

    if (!customer) {
      return false;
    }

    return isEligibleActiveDate(
      date,
      customer,
    );
  }

  const value =
    useMemo<ProgrammeStoreValue>(
      () => ({
        programmes,
        ready,

        saveProgramme,
        deleteProgramme,

        getProgrammeForCustomer,
        getProgrammesForCustomer,

        applySeasonDatesToCustomer,
        ensureProgrammesForSeason,

        canScheduleDate,
      }),
      [
        programmes,
        ready,
        customers,
        seasons,
      ],
    );

  return (
    <ProgrammeStoreContext.Provider
      value={value}
    >
      {children}
    </ProgrammeStoreContext.Provider>
  );
}

export function useProgrammeStore() {
  const context =
    useContext(
      ProgrammeStoreContext,
    );

  if (!context) {
    throw new Error(
      "useProgrammeStore must be used inside ProgrammeStoreProvider.",
    );
  }

  return context;
}

function synchroniseAllProgrammes(
  existingProgrammes:
    CustomerProgramme[],
  customers: StoredCustomer[],
  seasons: SeasonCalendar[],
) {
  let next =
    existingProgrammes.map(
      normaliseStoredProgramme,
    );

  const activeCustomers =
    customers.filter(
      (customer) =>
        customer.status ===
        "Active",
    );

  for (
    const season of seasons
  ) {
    for (
      const customer of
      activeCustomers
    ) {
      const groupDates =
        getGroupSeasonDates(
          season,
          customer.groupNumber,
        );

      if (!groupDates) {
        continue;
      }

      const existing =
        next.find(
          (programme) =>
            programme.customerNumber ===
              customer.customerNumber &&
            programme.year ===
              season.year,
        );

      const merged =
        mergeProgrammeWithSeason({
          existing,
          customer,
          season,
          groupDates,
        });

      if (!existing) {
        next = [
          merged,
          ...next,
        ];
      } else {
        next = next.map(
          (programme) =>
            programme.customerNumber ===
                customer.customerNumber &&
            programme.year ===
                season.year
              ? merged
              : programme,
        );
      }
    }
  }

  return next.sort(
    sortProgrammes,
  );
}

function mergeProgrammeWithSeason({
  existing,
  customer,
  season,
  groupDates,
  forceGroupDates = false,
}: {
  existing?:
    CustomerProgramme;

  customer: StoredCustomer;

  season: SeasonCalendar;

  groupDates: GroupSeasonDates;

  forceGroupDates?: boolean;
}): CustomerProgramme {
  const createdAt =
    existing?.createdAt ??
    new Date().toISOString();

  const visits:
    ProgrammeVisit[] = [];

  season.treatmentRounds.forEach(
    (round, index) => {
      const existingVisit =
        findExistingVisit(
          existing,
          round.visitNumber,
        );

      const groupScheduledDate =
        groupDates.treatmentDates[
          index
        ];

      const historicalVisit =
        existingVisit &&
        (existingVisit.status ===
          "Completed" ||
          existingVisit.status ===
            "Skipped");

      const preserveOverride =
        !forceGroupDates &&
        existingVisit &&
        isCustomerDateOverride(
          existingVisit,
          groupScheduledDate,
        );

      const scheduledDate =
        historicalVisit ||
        preserveOverride
          ? existingVisit.scheduledDate
          : groupScheduledDate;

      /*
       * Historical records remain even when their
       * dates are in the past.
       */
      if (historicalVisit) {
        visits.push({
          ...existingVisit,

          gapAfterPreviousDays:
            index === 0
              ? 0
              : round.gapAfterPreviousDays,
        });

        return;
      }

      /*
       * Established customers have a blank programme
       * start date and receive the full group schedule.
       *
       * New customers receive only rounds whose dates
       * have not passed.
       */
      if (
        !isEligibleActiveDate(
          scheduledDate,
          customer,
        )
      ) {
        return;
      }

      visits.push({
        id:
          existingVisit?.id ??
          createVisitId(
            customer.customerNumber,
            season.year,
            round.visitNumber,
          ),

        visitNumber:
          round.visitNumber,

        treatmentName:
          round.treatmentName,

        scheduledDate,

        gapAfterPreviousDays:
          index === 0
            ? 0
            : round.gapAfterPreviousDays,

        status:
          existingVisit?.status ===
          "Planned"
            ? "Planned"
            : "Scheduled",

        notes:
          existingVisit?.notes ??
          `Inherited from Group ${customer.groupNumber}, ${season.name}.`,
      });
    },
  );

  visits.sort(
    (first, second) =>
      first.visitNumber -
      second.visitNumber,
  );

  return {
    id:
      existing?.id ??
      createProgrammeId(
        customer.customerNumber,
        season.year,
      ),

    customerNumber:
      customer.customerNumber,

    year:
      season.year,

    createdAt,

    programmeName:
      existing?.programmeName ||
      STANDARD_PROGRAMME_NAME,

    startDate:
      visits[0]
        ?.scheduledDate ??
      "",

    avoidWednesdays:
      season.avoidWednesdays,

    avoidWeekends:
      season.avoidWeekends,

    visits,
  };
}

function removeInvalidPastActiveVisits(
  visits: ProgrammeVisit[],
  customer:
    | StoredCustomer
    | undefined,
) {
  if (!customer) {
    return visits;
  }

  return visits.filter(
    (visit) => {
      if (
        visit.status ===
          "Completed" ||
        visit.status ===
          "Skipped"
      ) {
        return true;
      }

      return isEligibleActiveDate(
        visit.scheduledDate,
        customer,
      );
    },
  );
}

function isEligibleActiveDate(
  scheduledDate: string,
  customer: StoredCustomer,
) {
  if (
    !isDateValue(
      scheduledDate,
    )
  ) {
    return false;
  }

  /*
   * Established customers retain their complete
   * programme, including dates that may already have
   * passed during the current season.
   */
  if (
    !customer.programmeStartDate
  ) {
    return true;
  }

  const today =
    toDateValue(
      new Date(),
    );

  const minimumDate =
    customer.programmeStartDate >
    today
      ? customer.programmeStartDate
      : today;

  return (
    scheduledDate >=
    minimumDate
  );
}

function findExistingVisit(
  programme:
    | CustomerProgramme
    | undefined,
  visitNumber: number,
) {
  if (!programme) {
    return undefined;
  }

  return programme.visits.find(
    (visit) =>
      visit.visitNumber ===
      visitNumber,
  );
}

function isCustomerDateOverride(
  visit: ProgrammeVisit,
  groupDate: string,
) {
  if (
    visit.scheduledDate ===
    groupDate
  ) {
    return false;
  }

  const notes =
    visit.notes.toLowerCase();

  return (
    notes.includes(
      "rescheduled from",
    ) ||
    notes.includes(
      "successfully rescheduled",
    ) ||
    notes.includes(
      "customer date override",
    ) ||
    notes.includes(
      "[date override]",
    )
  );
}

function getGroupSeasonDates(
  season: SeasonCalendar,
  groupNumber: number,
) {
  return season.groupDates.find(
    (group) =>
      group.groupNumber ===
      groupNumber,
  );
}

function normaliseStoredProgramme(
  programme:
    Partial<CustomerProgramme>,
): CustomerProgramme {
  const customerNumber =
    programme.customerNumber ??
    "";

  const year =
    safeYear(
      programme.year,
    );

  const rawVisits =
    Array.isArray(
      programme.visits,
    )
      ? programme.visits
      : [];

  const visits:
    ProgrammeVisit[] =
    rawVisits
      .map(
        (visit, index) => ({
          id:
            visit.id ??
            createVisitId(
              customerNumber,
              year,
              visit.visitNumber ??
                index + 1,
            ),

          visitNumber:
            visit.visitNumber ??
            index + 1,

          treatmentName:
            visit.treatmentName ??
            `Treatment ${
              visit.visitNumber ??
              index + 1
            }`,

          scheduledDate:
            visit.scheduledDate ??
            "",

          gapAfterPreviousDays:
            safeNonNegativeNumber(
              visit.gapAfterPreviousDays,
            ),

          status:
            normaliseVisitStatus(
              visit.status,
            ),

          notes:
            visit.notes ?? "",
        }),
      )
      .sort(
        (first, second) =>
          first.visitNumber -
          second.visitNumber,
      );

  return {
    id:
      programme.id ??
      createProgrammeId(
        customerNumber,
        year,
      ),

    customerNumber,

    year,

    createdAt:
      programme.createdAt ??
      new Date().toISOString(),

    programmeName:
      programme.programmeName ??
      STANDARD_PROGRAMME_NAME,

    startDate:
      programme.startDate ??
      visits[0]
        ?.scheduledDate ??
      "",

    avoidWednesdays:
      programme.avoidWednesdays ??
      false,

    avoidWeekends:
      programme.avoidWeekends ??
      true,

    visits,
  };
}

function normaliseVisitStatus(
  status:
    | ProgrammeVisitStatus
    | string
    | undefined,
): ProgrammeVisitStatus {
  if (
    status === "Planned" ||
    status === "Scheduled" ||
    status === "Completed" ||
    status === "Skipped"
  ) {
    return status;
  }

  return "Scheduled";
}

function programmesAreEqual(
  first: CustomerProgramme[],
  second: CustomerProgramme[],
) {
  return (
    JSON.stringify(first) ===
    JSON.stringify(second)
  );
}

function createProgrammeId(
  customerNumber: string,
  year: number,
) {
  return `programme-${customerNumber}-${year}`;
}

function createVisitId(
  customerNumber: string,
  year: number,
  visitNumber: number,
) {
  return `programme-visit-${customerNumber}-${year}-${visitNumber}`;
}

function safeYear(
  value: number | undefined,
) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.floor(value);
  }

  return new Date().getFullYear();
}

function safeNonNegativeNumber(
  value: number | undefined,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    value,
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
    parseDateValue(value);

  return (
    !Number.isNaN(
      date.getTime(),
    ) &&
    toDateValue(date) === value
  );
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

function sortProgrammes(
  first: CustomerProgramme,
  second: CustomerProgramme,
) {
  if (
    first.year !==
    second.year
  ) {
    return (
      second.year -
      first.year
    );
  }

  const firstNumber =
    Number(
      first.customerNumber,
    );

  const secondNumber =
    Number(
      second.customerNumber,
    );

  if (
    Number.isFinite(firstNumber) &&
    Number.isFinite(secondNumber)
  ) {
    return (
      firstNumber -
      secondNumber
    );
  }

  return first.customerNumber.localeCompare(
    second.customerNumber,
  );
}