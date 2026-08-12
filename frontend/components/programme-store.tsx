"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

export type ProgrammeSaveResult = {
  success: boolean;
  message: string;
};

type ProgrammeStoreValue = {
  programmes: CustomerProgramme[];
  ready: boolean;

  saveProgramme: (
    programme: CustomerProgramme,
  ) => ProgrammeSaveResult;

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

  const programmesRef =
    useRef<
      CustomerProgramme[]
    >([]);

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
          const loadedProgrammes =
            deduplicateProgrammes(
              parsed.map(
                normaliseStoredProgramme,
              ),
            ).sort(
              sortProgrammes,
            );

          programmesRef.current =
            loadedProgrammes;

          setProgrammes(
            loadedProgrammes,
          );
        }
      } catch {
        window.localStorage.removeItem(
          STORAGE_KEY,
        );

        programmesRef.current =
          [];

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

    const current =
      programmesRef.current;

    const next =
      synchroniseAllProgrammes(
        current,
        customers,
        seasons,
      );

    if (
      programmesAreEqual(
        current,
        next,
      )
    ) {
      return;
    }

    programmesRef.current =
      next;

    setProgrammes(next);
  }, [
    ready,
    customersReady,
    seasonsReady,
    customers,
    seasons,
  ]);

  useEffect(() => {
    programmesRef.current =
      programmes;
  }, [programmes]);

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
  ): ProgrammeSaveResult {
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

    if (
      !normalised.customerNumber.trim()
    ) {
      return {
        success: false,
        message:
          "Programme could not be saved because the customer number is missing.",
      };
    }

    if (
      !Number.isFinite(
        normalised.year,
      )
    ) {
      return {
        success: false,
        message:
          "Programme could not be saved because the programme year is invalid.",
      };
    }

    const current =
      programmesRef.current;

    const existingIndex =
      current.findIndex(
        (item) =>
          item.customerNumber ===
            normalised.customerNumber &&
          item.year ===
            normalised.year,
      );

    const next =
      existingIndex === -1
        ? [
            normalised,
            ...current,
          ].sort(
            sortProgrammes,
          )
        : current
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

    programmesRef.current =
      next;

    setProgrammes(next);

    return {
      success: true,
      message:
        existingIndex === -1
          ? "Programme saved successfully."
          : "Programme updated successfully.",
    };
  }

  function deleteProgramme(
    programmeId: string,
  ) {
    const next =
      programmesRef.current.filter(
        (programme) =>
          programme.id !==
          programmeId,
      );

    programmesRef.current =
      next;

    setProgrammes(next);
  }

  function getProgrammeForCustomer(
    customerNumber: string,
    year: number,
  ) {
    return programmesRef.current.find(
      (programme) =>
        programme.customerNumber ===
          customerNumber &&
        programme.year === year,
    );
  }

  function getProgrammesForCustomer(
    customerNumber: string,
  ) {
    return programmesRef.current
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
      programmesRef.current.find(
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

    const current =
      programmesRef.current;

    const exists =
      current.some(
        (programme) =>
          programme.customerNumber ===
            customerNumber &&
          programme.year === year,
      );

    const next =
      !exists
        ? [
            updated,
            ...current,
          ].sort(
            sortProgrammes,
          )
        : current
            .map((programme) =>
              programme.customerNumber ===
                  customerNumber &&
              programme.year ===
                year
                ? updated
                : programme,
            )
            .sort(
              sortProgrammes,
            );

    programmesRef.current =
      next;

    setProgrammes(next);

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

    let next = [
      ...programmesRef.current,
    ];

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

    next.sort(
      sortProgrammes,
    );

    programmesRef.current =
      next;

    setProgrammes(next);

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
    deduplicateProgrammes(
      existingProgrammes.map(
        normaliseStoredProgramme,
      ),
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

  return isLikelyOverrideVisit(
    visit,
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

  const normalisedVisits:
    ProgrammeVisit[] =
    rawVisits.map(
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
    );

  const visits =
    deduplicateVisits(
      normalisedVisits,
    ).sort(
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

function programmeKey(
  programme: CustomerProgramme,
) {
  return `${programme.customerNumber}::${programme.year}`;
}

function programmePriority(
  programme: CustomerProgramme,
) {
  const historicalVisitCount =
    programme.visits.filter(
      (visit) =>
        visit.status ===
          "Completed" ||
        visit.status ===
          "Skipped",
    ).length;

  const overrideVisitCount =
    programme.visits.filter(
      (visit) =>
        isLikelyOverrideVisit(
          visit,
        ),
    ).length;

  return (
    historicalVisitCount * 1000 +
    overrideVisitCount * 100 +
    programme.visits.length
  );
}

function deduplicateProgrammes(
  programmes: CustomerProgramme[],
) {
  const byKey =
    new Map<
      string,
      CustomerProgramme
    >();

  for (
    const programme of programmes
  ) {
    const key =
      programmeKey(
        programme,
      );

    const existing =
      byKey.get(key);

    if (!existing) {
      byKey.set(
        key,
        programme,
      );
      continue;
    }

    const preferred =
      programmePriority(
        programme,
      ) >
      programmePriority(
        existing,
      )
        ? programme
        : existing;

    const secondary =
      preferred === programme
        ? existing
        : programme;

    byKey.set(
      key,
      mergeDuplicateProgrammes(
        preferred,
        secondary,
      ),
    );
  }

  return Array.from(
    byKey.values(),
  );
}

function mergeDuplicateProgrammes(
  preferred: CustomerProgramme,
  secondary: CustomerProgramme,
): CustomerProgramme {
  return {
    ...secondary,
    ...preferred,
    id:
      preferred.id ||
      secondary.id,
    createdAt:
      preferred.createdAt ||
      secondary.createdAt,
    programmeName:
      preferred.programmeName ||
      secondary.programmeName,
    startDate:
      preferred.startDate ||
      secondary.startDate,
    visits:
      deduplicateVisits([
        ...preferred.visits,
        ...secondary.visits,
      ]).sort(
        (first, second) =>
          first.visitNumber -
          second.visitNumber,
      ),
  };
}

function deduplicateVisits(
  visits: ProgrammeVisit[],
) {
  const byVisitNumber =
    new Map<
      number,
      ProgrammeVisit
    >();

  const usedIds =
    new Set<string>();

  for (const visit of visits) {
    const existing =
      byVisitNumber.get(
        visit.visitNumber,
      );

    if (!existing) {
      const uniqueVisit =
        ensureUniqueVisitId(
          visit,
          usedIds,
        );

      byVisitNumber.set(
        uniqueVisit.visitNumber,
        uniqueVisit,
      );
      usedIds.add(
        uniqueVisit.id,
      );
      continue;
    }

    const preferred =
      visitPriority(visit) >
      visitPriority(existing)
        ? visit
        : existing;

    const secondary =
      preferred === visit
        ? existing
        : visit;

    const merged =
      mergeDuplicateVisits(
        preferred,
        secondary,
      );

    const withoutOldId =
      new Set(usedIds);

    withoutOldId.delete(
      existing.id,
    );

    const uniqueMerged =
      ensureUniqueVisitId(
        merged,
        withoutOldId,
      );

    byVisitNumber.set(
      uniqueMerged.visitNumber,
      uniqueMerged,
    );

    usedIds.clear();

    for (
      const storedVisit of
      byVisitNumber.values()
    ) {
      usedIds.add(
        storedVisit.id,
      );
    }
  }

  return Array.from(
    byVisitNumber.values(),
  );
}

function visitPriority(
  visit: ProgrammeVisit,
) {
  const historicalScore =
    visit.status === "Completed" ||
    visit.status === "Skipped"
      ? 1000
      : 0;

  const overrideScore =
    isLikelyOverrideVisit(
      visit,
    )
      ? 100
      : 0;

  const dataScore =
    Number(
      Boolean(
        visit.scheduledDate,
      ),
    ) *
      10 +
    Number(
      Boolean(
        visit.treatmentName,
      ),
    ) *
      5 +
    Number(
      Boolean(
        visit.notes,
      ),
    );

  return (
    historicalScore +
    overrideScore +
    dataScore
  );
}

function mergeDuplicateVisits(
  preferred: ProgrammeVisit,
  secondary: ProgrammeVisit,
): ProgrammeVisit {
  return {
    ...secondary,
    ...preferred,
    id:
      preferred.id ||
      secondary.id,
    treatmentName:
      preferred.treatmentName ||
      secondary.treatmentName,
    scheduledDate:
      preferred.scheduledDate ||
      secondary.scheduledDate,
    notes:
      preferred.notes ||
      secondary.notes,
  };
}

function ensureUniqueVisitId(
  visit: ProgrammeVisit,
  usedIds: Set<string>,
) {
  if (
    visit.id &&
    !usedIds.has(
      visit.id,
    )
  ) {
    return visit;
  }

  let suffix = 2;
  let candidate =
    `${visit.id || "programme-visit"}-${suffix}`;

  while (
    usedIds.has(candidate)
  ) {
    suffix += 1;
    candidate =
      `${visit.id || "programme-visit"}-${suffix}`;
  }

  return {
    ...visit,
    id: candidate,
  };
}

function isLikelyOverrideVisit(
  visit: ProgrammeVisit,
) {
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