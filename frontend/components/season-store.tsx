"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { STANDARD_TREATMENTS } from "@/lib/standard-treatments";

export type SeasonTreatmentRound = {
  visitNumber: number;
  treatmentName: string;
  gapAfterPreviousDays: number;
};

export type GroupSeasonDates = {
  groupNumber: number;

  treatmentDates: [
    string,
    string,
    string,
    string,
    string,
  ];
};

export type SeasonCalendar = {
  id: string;
  year: number;
  name: string;

  firstGroupStartDate: string;

  groupCount: number;
  groupsPerWorkingDay: number;

  avoidWeekends: boolean;
  avoidWednesdays: boolean;

  excludedDates: string[];

  treatmentRounds: [
    SeasonTreatmentRound,
    SeasonTreatmentRound,
    SeasonTreatmentRound,
    SeasonTreatmentRound,
    SeasonTreatmentRound,
  ];

  groupDates: GroupSeasonDates[];

  createdAt: string;
  updatedAt: string;
};

type CreateSeasonInput = {
  year: number;
  firstGroupStartDate?: string;
  groupCount?: number;
};

type SeasonStoreValue = {
  seasons: SeasonCalendar[];
  ready: boolean;

  saveSeason: (
    season: SeasonCalendar,
  ) => void;

  createSeason: (
    input: CreateSeasonInput,
  ) => SeasonCalendar;

  deleteSeason: (
    seasonId: string,
  ) => void;

  getSeason: (
    year: number,
  ) => SeasonCalendar | undefined;

  regenerateSeason: (
    year: number,
  ) => SeasonCalendar | null;

  getGroupDates: (
    year: number,
    groupNumber: number,
  ) => GroupSeasonDates | undefined;

  addExcludedDate: (
    year: number,
    date: string,
  ) => void;

  removeExcludedDate: (
    year: number,
    date: string,
  ) => void;

  restoreDefaultSeason: (
    year?: number,
  ) => void;
};

const STORAGE_KEY =
  "greenflow-season-calendars-v1";

const DEFAULT_GROUP_COUNT = 30;

const SeasonStoreContext =
  createContext<SeasonStoreValue | null>(
    null,
  );

export function SeasonStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [seasons, setSeasons] =
    useState<SeasonCalendar[]>([]);

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
          Partial<SeasonCalendar>
        >;

        if (Array.isArray(parsed)) {
          setSeasons(
            parsed
              .map(normaliseSeason)
              .sort(sortSeasons),
          );
        }
      } catch {
        window.localStorage.removeItem(
          STORAGE_KEY,
        );

        setSeasons([]);
      }
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const currentYear =
      new Date().getFullYear();

    setSeasons((current) => {
      const alreadyExists =
        current.some(
          (season) =>
            season.year ===
            currentYear,
        );

      if (alreadyExists) {
        return current;
      }

      return [
        createDefaultSeason(
          currentYear,
        ),
        ...current,
      ].sort(sortSeasons);
    });
  }, [ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(seasons),
    );
  }, [seasons, ready]);

  function saveSeason(
    season: SeasonCalendar,
  ) {
    const regenerated =
      generateSeasonDates(
        normaliseSeason(season),
      );

    setSeasons((current) => {
      const exists =
        current.some(
          (item) =>
            item.id ===
              regenerated.id ||
            item.year ===
              regenerated.year,
        );

      if (!exists) {
        return [
          regenerated,
          ...current,
        ].sort(sortSeasons);
      }

      return current
        .map((item) =>
          item.id ===
            regenerated.id ||
          item.year ===
            regenerated.year
            ? regenerated
            : item,
        )
        .sort(sortSeasons);
    });
  }

  function createSeason({
    year,
    firstGroupStartDate,
    groupCount,
  }: CreateSeasonInput) {
    const existing =
      seasons.find(
        (season) =>
          season.year === year,
      );

    if (existing) {
      return existing;
    }

    const season =
      createDefaultSeason(
        year,
        firstGroupStartDate,
        groupCount,
      );

    setSeasons((current) => [
      season,
      ...current,
    ].sort(sortSeasons));

    return season;
  }

  function deleteSeason(
    seasonId: string,
  ) {
    setSeasons((current) =>
      current.filter(
        (season) =>
          season.id !== seasonId,
      ),
    );
  }

  function getSeason(
    year: number,
  ) {
    return seasons.find(
      (season) =>
        season.year === year,
    );
  }

  function regenerateSeason(
    year: number,
  ) {
    const season =
      seasons.find(
        (item) =>
          item.year === year,
      );

    if (!season) {
      return null;
    }

    const regenerated =
      generateSeasonDates({
        ...season,

        updatedAt:
          new Date().toISOString(),
      });

    setSeasons((current) =>
      current
        .map((item) =>
          item.year === year
            ? regenerated
            : item,
        )
        .sort(sortSeasons),
    );

    return regenerated;
  }

  function getGroupDates(
    year: number,
    groupNumber: number,
  ) {
    return seasons
      .find(
        (season) =>
          season.year === year,
      )
      ?.groupDates.find(
        (group) =>
          group.groupNumber ===
          groupNumber,
      );
  }

  function addExcludedDate(
    year: number,
    date: string,
  ) {
    if (!isDateValue(date)) {
      return;
    }

    setSeasons((current) =>
      current
        .map((season) => {
          if (
            season.year !== year
          ) {
            return season;
          }

          if (
            season.excludedDates.includes(
              date,
            )
          ) {
            return season;
          }

          return generateSeasonDates({
            ...season,

            excludedDates: [
              ...season.excludedDates,
              date,
            ].sort(),

            updatedAt:
              new Date().toISOString(),
          });
        })
        .sort(sortSeasons),
    );
  }

  function removeExcludedDate(
    year: number,
    date: string,
  ) {
    setSeasons((current) =>
      current
        .map((season) => {
          if (
            season.year !== year
          ) {
            return season;
          }

          return generateSeasonDates({
            ...season,

            excludedDates:
              season.excludedDates.filter(
                (excludedDate) =>
                  excludedDate !== date,
              ),

            updatedAt:
              new Date().toISOString(),
          });
        })
        .sort(sortSeasons),
    );
  }

  function restoreDefaultSeason(
    year =
      new Date().getFullYear(),
  ) {
    const restored =
      createDefaultSeason(year);

    setSeasons((current) => {
      const exists =
        current.some(
          (season) =>
            season.year === year,
        );

      if (!exists) {
        return [
          restored,
          ...current,
        ].sort(sortSeasons);
      }

      return current
        .map((season) =>
          season.year === year
            ? restored
            : season,
        )
        .sort(sortSeasons);
    });
  }

  const value =
    useMemo<SeasonStoreValue>(
      () => ({
        seasons,
        ready,

        saveSeason,
        createSeason,
        deleteSeason,

        getSeason,
        regenerateSeason,
        getGroupDates,

        addExcludedDate,
        removeExcludedDate,

        restoreDefaultSeason,
      }),
      [seasons, ready],
    );

  return (
    <SeasonStoreContext.Provider
      value={value}
    >
      {children}
    </SeasonStoreContext.Provider>
  );
}

export function useSeasonStore() {
  const context = useContext(
    SeasonStoreContext,
  );

  if (!context) {
    throw new Error(
      "useSeasonStore must be used inside SeasonStoreProvider.",
    );
  }

  return context;
}

export function createDefaultSeason(
  year: number,
  firstGroupStartDate =
    getDefaultSeasonStartDate(year),
  groupCount =
    DEFAULT_GROUP_COUNT,
): SeasonCalendar {
  const now =
    new Date().toISOString();

  return generateSeasonDates({
    id: `season-${year}`,

    year,

    name:
      `${year} Standard Treatment Season`,

    firstGroupStartDate,

    groupCount:
      Math.max(
        1,
        Math.floor(groupCount),
      ),

    groupsPerWorkingDay: 1,

    avoidWeekends: true,
    avoidWednesdays: false,

    excludedDates: [],

    treatmentRounds:
      STANDARD_TREATMENTS.map(
        (round) => ({
          ...round,
        }),
      ) as SeasonCalendar["treatmentRounds"],

    groupDates: [],

    createdAt: now,
    updatedAt: now,
  });
}

export function generateSeasonDates(
  season: SeasonCalendar,
): SeasonCalendar {
  const normalisedRounds =
    normaliseRounds(
      season.treatmentRounds,
    );

  const normalisedExcludedDates =
    Array.from(
      new Set(
        season.excludedDates.filter(
          isDateValue,
        ),
      ),
    ).sort();

  const baseSeason: SeasonCalendar = {
    ...season,

    groupCount:
      Math.max(
        1,
        Math.floor(
          season.groupCount,
        ),
      ),

    groupsPerWorkingDay:
      Math.max(
        1,
        Math.floor(
          season.groupsPerWorkingDay,
        ),
      ),

    treatmentRounds:
      normalisedRounds,

    excludedDates:
      normalisedExcludedDates,

    groupDates: [],
  };

  const roundDates: string[][] = [];

  let roundGroupOneDate =
    moveToAllowedDate(
      baseSeason.firstGroupStartDate,
      baseSeason,
    );

  for (
    let roundIndex = 0;
    roundIndex <
    baseSeason.treatmentRounds.length;
    roundIndex += 1
  ) {
    if (roundIndex > 0) {
      const gap =
        baseSeason.treatmentRounds[
          roundIndex
        ].gapAfterPreviousDays;

      const previousRoundGroupOneDate =
        roundDates[
          roundIndex - 1
        ][0];

      roundGroupOneDate =
        moveToAllowedDate(
          addCalendarDays(
            previousRoundGroupOneDate,
            gap,
          ),
          baseSeason,
        );
    }

    roundDates.push(
      generateGroupDatesForRound(
        roundGroupOneDate,
        baseSeason,
      ),
    );
  }

  const groupDates: GroupSeasonDates[] =
    Array.from(
      {
        length:
          baseSeason.groupCount,
      },
      (_, groupIndex) => ({
        groupNumber:
          groupIndex + 1,

        treatmentDates: [
          roundDates[0][groupIndex],
          roundDates[1][groupIndex],
          roundDates[2][groupIndex],
          roundDates[3][groupIndex],
          roundDates[4][groupIndex],
        ],
      }),
    );

  return {
    ...baseSeason,

    firstGroupStartDate:
      roundDates[0][0],

    groupDates,

    updatedAt:
      new Date().toISOString(),
  };
}

function generateGroupDatesForRound(
  groupOneStartDate: string,
  season: SeasonCalendar,
) {
  const dates: string[] = [];

  let workingDate =
    moveToAllowedDate(
      groupOneStartDate,
      season,
    );

  for (
    let groupIndex = 0;
    groupIndex <
    season.groupCount;
    groupIndex += 1
  ) {
    if (
      groupIndex > 0 &&
      groupIndex %
        season.groupsPerWorkingDay ===
        0
    ) {
      workingDate =
        getNextAllowedDate(
          workingDate,
          season,
        );
    }

    dates.push(
      workingDate,
    );
  }

  return dates;
}

function getNextAllowedDate(
  currentDate: string,
  season: SeasonCalendar,
) {
  return moveToAllowedDate(
    addCalendarDays(
      currentDate,
      1,
    ),
    season,
  );
}

function moveToAllowedDate(
  requestedDate: string,
  season: SeasonCalendar,
) {
  let candidate =
    parseDateValue(
      requestedDate,
    );

  let safetyCounter = 0;

  while (
    !isAllowedWorkingDate(
      candidate,
      season,
    )
  ) {
    candidate.setDate(
      candidate.getDate() + 1,
    );

    safetyCounter += 1;

    if (safetyCounter > 370) {
      throw new Error(
        "Unable to find an allowed working date. Check the season settings and excluded dates.",
      );
    }
  }

  return toDateValue(candidate);
}

function isAllowedWorkingDate(
  date: Date,
  season: SeasonCalendar,
) {
  const dayOfWeek =
    date.getDay();

  if (
    season.avoidWeekends &&
    (dayOfWeek === 0 ||
      dayOfWeek === 6)
  ) {
    return false;
  }

  if (
    season.avoidWednesdays &&
    dayOfWeek === 3
  ) {
    return false;
  }

  return !season.excludedDates.includes(
    toDateValue(date),
  );
}

function normaliseSeason(
  season:
    Partial<SeasonCalendar>,
): SeasonCalendar {
  const year =
    typeof season.year ===
      "number" &&
    Number.isFinite(season.year)
      ? Math.floor(season.year)
      : new Date().getFullYear();

  const fallback =
    createDefaultSeason(year);

  return generateSeasonDates({
    id:
      season.id ??
      fallback.id,

    year,

    name:
      season.name ??
      fallback.name,

    firstGroupStartDate:
      isDateValue(
        season.firstGroupStartDate ??
          "",
      )
        ? season.firstGroupStartDate!
        : fallback.firstGroupStartDate,

    groupCount:
      safePositiveInteger(
        season.groupCount,
        fallback.groupCount,
      ),

    groupsPerWorkingDay:
      safePositiveInteger(
        season.groupsPerWorkingDay,
        fallback.groupsPerWorkingDay,
      ),

    avoidWeekends:
      season.avoidWeekends ??
      fallback.avoidWeekends,

    avoidWednesdays:
      season.avoidWednesdays ??
      fallback.avoidWednesdays,

    excludedDates:
      Array.isArray(
        season.excludedDates,
      )
        ? season.excludedDates
        : [],

    treatmentRounds:
      normaliseRounds(
        season.treatmentRounds,
      ),

    groupDates: [],

    createdAt:
      season.createdAt ??
      fallback.createdAt,

    updatedAt:
      season.updatedAt ??
      fallback.updatedAt,
  });
}

function normaliseRounds(
  rounds:
    | SeasonCalendar["treatmentRounds"]
    | undefined,
): SeasonCalendar["treatmentRounds"] {
  return STANDARD_TREATMENTS.map(
    (fallbackRound, index) => {
      const round =
        rounds?.[index];

      return {
        visitNumber:
          index + 1,

        treatmentName:
          round?.treatmentName
            ?.trim() ||
          fallbackRound.treatmentName,

        gapAfterPreviousDays:
          index === 0
            ? 0
            : safeNonNegativeInteger(
                round?.gapAfterPreviousDays,
                fallbackRound
                  .gapAfterPreviousDays,
              ),
      };
    },
  ) as SeasonCalendar["treatmentRounds"];
}

function getDefaultSeasonStartDate(
  year: number,
) {
  return `${year}-03-30`;
}

function addCalendarDays(
  value: string,
  days: number,
) {
  const date =
    parseDateValue(value);

  date.setDate(
    date.getDate() + days,
  );

  return toDateValue(date);
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

function safePositiveInteger(
  value: number | undefined,
  fallback: number,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    1,
    Math.floor(value),
  );
}

function safeNonNegativeInteger(
  value: number | undefined,
  fallback: number,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    0,
    Math.floor(value),
  );
}

function sortSeasons(
  first: SeasonCalendar,
  second: SeasonCalendar,
) {
  return (
    second.year -
    first.year
  );
}