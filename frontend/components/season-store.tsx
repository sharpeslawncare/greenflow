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

import type {
  GroupSeasonDates,
  SeasonCalendar,
} from "@/lib/season-types";

export type {
  GroupSeasonDates,
  SeasonCalendar,
  SeasonTreatmentRound,
} from "@/lib/season-types";


type SeasonStoreValue = {
  seasons: SeasonCalendar[];
  ready: boolean;

  saveSeason: (
    season: SeasonCalendar,
  ) => Promise<SeasonCalendar>;

  deleteSeason: (
    seasonId: string,
  ) => Promise<void>;

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
  ) => Promise<void>;
};

const DEFAULT_GROUP_COUNT = 30;

export function getSeasonCycleLabel(
  year: number,
) {
  return `${year}/${String(year + 1).slice(-2)}`;
}

export function isDateInSeasonCycle(
  date: string,
  year: number,
) {
  if (!isDateValue(date)) {
    return false;
  }

  const dateYear = Number(
    date.slice(0, 4),
  );

  return (
    dateYear === year ||
    dateYear === year + 1
  );
}

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
    let cancelled = false;

    async function hydrateSeasons() {
      try {
        const response =
          await fetch("/api/seasons");

        if (!response.ok) {
          if (!cancelled) {
            setSeasons([]);
          }
          return;
        }

        const payload =
          await response.json() as {
            seasons?: Array<
              Partial<SeasonCalendar>
            >;
          };

        if (
          !Array.isArray(
            payload.seasons,
          )
        ) {
          if (!cancelled) {
            setSeasons([]);
          }
          return;
        }

        /*
         * A successful PostgreSQL response is authoritative,
         * even when there are no saved seasons yet.
         *
         * This prevents an old browser-only season from being
         * treated as Live business data on one particular device.
         */
        const databaseSeasons =
          deduplicateSeasons(
            payload.seasons.map(
              normaliseSeason,
            ),
          ).sort(
            sortSeasons,
          );

        if (cancelled) {
          return;
        }

        setSeasons(databaseSeasons);
      } catch (error) {
        console.error(
          "Failed to hydrate GreenFlow seasons from PostgreSQL:",
          error,
        );

        if (!cancelled) {
          setSeasons([]);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void hydrateSeasons();

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveSeason(
    season: SeasonCalendar,
  ): Promise<SeasonCalendar> {
    const regenerated =
      generateSeasonDates(
        normaliseSeason(season),
      );

    const response =
      await fetch("/api/seasons", {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          season: regenerated,
        }),
      });

    if (!response.ok) {
      let message =
        "Unable to save season to PostgreSQL.";

      try {
        const payload =
          await response.json() as {
            error?: string;
          };

        if (payload.error) {
          message = payload.error;
        }
      } catch {
        // Keep the fallback message.
      }

      throw new Error(message);
    }

    setSeasons((current) =>
      [
        regenerated,
        ...current.filter(
          (item) =>
            item.year !==
              regenerated.year &&
            item.id !==
              regenerated.id,
        ),
      ].sort(
        sortSeasons,
      ),
    );

    return regenerated;
  }
  async function deleteSeason(
    seasonId: string,
  ) {
    const season =
      seasons.find(
        (item) =>
          item.id === seasonId,
      );

    if (!season) {
      return;
    }

    const response =
      await fetch("/api/seasons", {
        method: "DELETE",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          seasonId: season.id,
          year: season.year,
        }),
      });

    if (!response.ok) {
      let message =
        "Unable to delete season from PostgreSQL.";

      try {
        const payload =
          await response.json() as {
            error?: string;
          };

        if (payload.error) {
          message = payload.error;
        }
      } catch {
        // Keep the fallback message.
      }

      throw new Error(message);
    }

    setSeasons((current) =>
      current.filter(
        (item) =>
          item.id !== seasonId,
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
    if (
      !isDateInSeasonCycle(
        date,
        year,
      )
    ) {
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

  async function restoreDefaultSeason(
    year =
      new Date().getFullYear(),
  ) {
    const restored =
      createDefaultSeason(year);

    /*
     * Restoring defaults is an explicit business change.
     * Save it centrally first so another device sees the
     * same season and a failed database write cannot leave
     * this browser pretending the restore succeeded.
     */
    await saveSeason(restored);
  }

  const value =
    useMemo<SeasonStoreValue>(
      () => ({
        seasons,
        ready,

        saveSeason,
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
  firstGroupStartDate?: string,
  groupCount =
    DEFAULT_GROUP_COUNT,
): SeasonCalendar {
  const safeYear =
    safeSeasonYear(year);

  const safeStartDate =
    isDateValue(
      firstGroupStartDate ?? "",
    ) &&
    Number(
      firstGroupStartDate!.slice(
        0,
        4,
      ),
    ) === safeYear
      ? firstGroupStartDate!
      : getDefaultSeasonStartDate(
          safeYear,
        );

  const now =
    new Date().toISOString();

  return generateSeasonDates({
    id: `season-${safeYear}`,

    year: safeYear,

    name:
      `${getSeasonCycleLabel(
        safeYear,
      )} Standard Treatment Programme`,

    firstGroupStartDate:
      safeStartDate,

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
          (date) =>
            isDateInSeasonCycle(
              date,
              season.year,
            ),
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
    safeSeasonYear(
      season.year,
    );

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
      ) &&
      Number(
        season.firstGroupStartDate!.slice(
          0,
          4,
        ),
      ) === year
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
  return `${year}-01-12`;
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

function safeSeasonYear(
  value: number | undefined,
) {
  const currentYear =
    new Date().getFullYear();

  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return currentYear;
  }

  const year =
    Math.floor(value);

  if (
    year < 2000 ||
    year > 2100
  ) {
    return currentYear;
  }

  return year;
}

function seasonPriority(
  season: SeasonCalendar,
) {
  const updatedAt =
    Date.parse(
      season.updatedAt,
    );

  const createdAt =
    Date.parse(
      season.createdAt,
    );

  const timestamp =
    Number.isFinite(updatedAt)
      ? updatedAt
      : Number.isFinite(
            createdAt,
          )
        ? createdAt
        : 0;

  return (
    timestamp +
    season.excludedDates.length *
      10 +
    season.groupCount
  );
}

function mergeDuplicateSeasons(
  preferred: SeasonCalendar,
  secondary: SeasonCalendar,
) {
  return normaliseSeason({
    ...secondary,
    ...preferred,
    id:
      preferred.id ||
      secondary.id,
    name:
      preferred.name ||
      secondary.name,
    firstGroupStartDate:
      preferred.firstGroupStartDate ||
      secondary.firstGroupStartDate,
    excludedDates:
      Array.from(
        new Set([
          ...secondary.excludedDates,
          ...preferred.excludedDates,
        ]),
      ),
    treatmentRounds:
      preferred.treatmentRounds,
    createdAt:
      preferred.createdAt ||
      secondary.createdAt,
    updatedAt:
      preferred.updatedAt ||
      secondary.updatedAt,
  });
}

function deduplicateSeasons(
  seasons: SeasonCalendar[],
) {
  const byYear =
    new Map<
      number,
      SeasonCalendar
    >();

  for (
    const season of seasons
  ) {
    const existing =
      byYear.get(
        season.year,
      );

    if (!existing) {
      byYear.set(
        season.year,
        season,
      );
      continue;
    }

    const preferred =
      seasonPriority(
        season,
      ) >
      seasonPriority(
        existing,
      )
        ? season
        : existing;

    const secondary =
      preferred === season
        ? existing
        : season;

    byYear.set(
      season.year,
      mergeDuplicateSeasons(
        preferred,
        secondary,
      ),
    );
  }

  const seenIds =
    new Set<string>();

  return Array.from(
    byYear.values(),
  ).map((season) => {
    if (
      !seenIds.has(
        season.id,
      )
    ) {
      seenIds.add(
        season.id,
      );
      return season;
    }

    const repaired = {
      ...season,
      id:
        `season-${season.year}`,
    };

    let suffix = 2;

    while (
      seenIds.has(
        repaired.id,
      )
    ) {
      repaired.id =
        `season-${season.year}-${suffix}`;
      suffix += 1;
    }

    seenIds.add(
      repaired.id,
    );

    return repaired;
  });
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