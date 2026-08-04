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
  type SeasonCalendar,
  useSeasonStore,
} from "@/components/season-store";
import { STANDARD_TREATMENTS } from "@/lib/standard-treatments";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

export default function SeasonPlannerPage() {
  const {
    seasons,
    ready,
    saveSeason,
    createSeason,
    restoreDefaultSeason,
  } = useSeasonStore();

  const currentYear =
    new Date().getFullYear();

  const [selectedYear, setSelectedYear] =
    useState(currentYear);

  const [draft, setDraft] =
    useState<SeasonCalendar | null>(
      null,
    );

  const [excludedDate, setExcludedDate] =
    useState("");

  const [message, setMessage] =
    useState("");

  const selectedSeason =
    seasons.find(
      (season) =>
        season.year === selectedYear,
    ) ?? null;

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (selectedSeason) {
      setDraft(
        cloneSeason(selectedSeason),
      );
      return;
    }

    const created = createSeason({
      year: selectedYear,
    });

    setDraft(
      cloneSeason(created),
    );
  }, [
    ready,
    selectedYear,
    selectedSeason,
    createSeason,
  ]);

  const sortedGroupDates =
    useMemo(
      () =>
        [...(draft?.groupDates ?? [])].sort(
          (first, second) =>
            first.groupNumber -
            second.groupNumber,
        ),
      [draft],
    );

  function updateDraft(
    updater: (
      current: SeasonCalendar,
    ) => SeasonCalendar,
  ) {
    setDraft((current) =>
      current
        ? updater(current)
        : current,
    );
  }

  function updateRoundName(
    roundIndex: number,
    value: string,
  ) {
    updateDraft((current) => ({
      ...current,

      treatmentRounds:
        current.treatmentRounds.map(
          (round, index) =>
            index === roundIndex
              ? {
                  ...round,
                  treatmentName: value,
                }
              : round,
        ) as SeasonCalendar["treatmentRounds"],
    }));
  }

  function updateRoundGap(
    roundIndex: number,
    value: number,
  ) {
    updateDraft((current) => ({
      ...current,

      treatmentRounds:
        current.treatmentRounds.map(
          (round, index) =>
            index === roundIndex
              ? {
                  ...round,

                  gapAfterPreviousDays:
                    index === 0
                      ? 0
                      : Math.max(
                          1,
                          Math.floor(
                            value,
                          ),
                        ),
                }
              : round,
        ) as SeasonCalendar["treatmentRounds"],
    }));
  }

  function addExcludedDate() {
    if (
      !draft ||
      !isDateValue(excludedDate)
    ) {
      showMessage(
        "Choose a valid excluded date.",
      );
      return;
    }

    if (
      draft.excludedDates.includes(
        excludedDate,
      )
    ) {
      showMessage(
        "That date is already excluded.",
      );
      return;
    }

    updateDraft((current) => ({
      ...current,

      excludedDates: [
        ...current.excludedDates,
        excludedDate,
      ].sort(),
    }));

    setExcludedDate("");
  }

  function removeExcludedDate(
    date: string,
  ) {
    updateDraft((current) => ({
      ...current,

      excludedDates:
        current.excludedDates.filter(
          (item) =>
            item !== date,
        ),
    }));
  }

  function savePlanner() {
    if (!draft) {
      return;
    }

    if (
      !isDateValue(
        draft.firstGroupStartDate,
      )
    ) {
      showMessage(
        "Choose a valid Group 1 start date.",
      );
      return;
    }

    saveSeason(draft);

    showMessage(
      `${draft.year} group calendar saved and regenerated.`,
    );
  }

  function restoreDefaults() {
    const confirmed =
      window.confirm(
        `Restore the default five-treatment calendar for ${selectedYear}?`,
      );

    if (!confirmed) {
      return;
    }

    restoreDefaultSeason(
      selectedYear,
    );

    showMessage(
      `${selectedYear} defaults restored.`,
    );
  }

  function showMessage(
    text: string,
  ) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3200);
  }

  if (!ready || !draft) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading season planner...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1700px]">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-3xl font-bold">
                Season Planner
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Set Group 1&apos;s first date once.
                GreenFlow then assigns each later
                group to the next permitted working
                day and generates all five treatment
                rounds from the editable gaps.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Field label="Season year">
                <input
                  type="number"
                  min="2020"
                  max="2100"
                  value={selectedYear}
                  onChange={(event) =>
                    setSelectedYear(
                      Number(
                        event.target.value,
                      ) || currentYear,
                    )
                  }
                  className="w-32 rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-[#338b45] focus:ring-4 focus:ring-green-100"
                />
              </Field>

              <button
                type="button"
                onClick={restoreDefaults}
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-50"
              >
                Restore defaults
              </button>

              <button
                type="button"
                onClick={savePlanner}
                className="h-11 rounded-xl bg-[#176b37] px-5 text-sm font-semibold text-white hover:bg-[#125b2f]"
              >
                Save and regenerate
              </button>
            </div>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <section className="grid gap-4 xl:grid-cols-[400px_1fr]">
            <aside className="space-y-4">
              <Panel
                title="Calendar settings"
                description="These settings control the schedule inherited by every customer in each group."
              >
                <div className="space-y-4">
                  <Field label="Calendar name">
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        updateDraft(
                          (current) => ({
                            ...current,
                            name:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Group 1 — Treatment 1 start date">
                    <input
                      type="date"
                      value={
                        draft.firstGroupStartDate
                      }
                      onChange={(event) =>
                        updateDraft(
                          (current) => ({
                            ...current,

                            firstGroupStartDate:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      label="Number of groups"
                      value={
                        draft.groupCount
                      }
                      min={1}
                      onChange={(value) =>
                        updateDraft(
                          (current) => ({
                            ...current,
                            groupCount:
                              value,
                          }),
                        )
                      }
                    />

                    <NumberField
                      label="Groups per day"
                      value={
                        draft.groupsPerWorkingDay
                      }
                      min={1}
                      onChange={(value) =>
                        updateDraft(
                          (current) => ({
                            ...current,

                            groupsPerWorkingDay:
                              value,
                          }),
                        )
                      }
                    />
                  </div>

                  <OptionToggle
                    label="Avoid weekends"
                    description="Saturday and Sunday are skipped."
                    checked={
                      draft.avoidWeekends
                    }
                    onChange={(checked) =>
                      updateDraft(
                        (current) => ({
                          ...current,
                          avoidWeekends:
                            checked,
                        }),
                      )
                    }
                  />

                  <OptionToggle
                    label="Reserve Wednesdays"
                    description="Wednesday is skipped when enabled."
                    checked={
                      draft.avoidWednesdays
                    }
                    onChange={(checked) =>
                      updateDraft(
                        (current) => ({
                          ...current,

                          avoidWednesdays:
                            checked,
                        }),
                      )
                    }
                  />
                </div>
              </Panel>

              <Panel
                title="Standard treatments"
                description="This is the shared five-treatment template. Gaps default to 70 days and remain editable."
              >
                <div className="space-y-3">
                  {draft.treatmentRounds.map(
                    (round, index) => (
                      <div
                        key={
                          round.visitNumber
                        }
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#176b37] text-sm font-bold text-white">
                            {
                              round.visitNumber
                            }
                          </span>

                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Treatment{" "}
                            {
                              round.visitNumber
                            }
                          </div>
                        </div>

                        <Field label="Treatment name">
                          <input
                            value={
                              round.treatmentName
                            }
                            onChange={(
                              event,
                            ) =>
                              updateRoundName(
                                index,
                                event.target
                                  .value,
                              )
                            }
                            className={
                              inputClass
                            }
                          />
                        </Field>

                        {index > 0 && (
                          <div className="mt-3">
                            <NumberField
                              label="Gap after previous round"
                              value={
                                round.gapAfterPreviousDays
                              }
                              min={1}
                              suffix="days"
                              onChange={(
                                value,
                              ) =>
                                updateRoundGap(
                                  index,
                                  value,
                                )
                              }
                            />
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>

                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                  The five initial names come from{" "}
                  <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                    lib/standard-treatments.ts
                  </code>
                  . Saved season edits are then used
                  throughout scheduling.
                </div>
              </Panel>

              <Panel
                title="Excluded dates"
                description="Add bank holidays, closures or any date on which work must not be scheduled."
              >
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={excludedDate}
                    onChange={(event) =>
                      setExcludedDate(
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={addExcludedDate}
                    className="rounded-xl border border-[#338b45] px-4 text-sm font-semibold text-[#176b37] hover:bg-green-50"
                  >
                    Add
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {draft.excludedDates.length ===
                  0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                      No excluded dates.
                    </div>
                  ) : (
                    draft.excludedDates.map(
                      (date) => (
                        <div
                          key={date}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <span className="text-sm font-semibold">
                            {formatDate(
                              date,
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              removeExcludedDate(
                                date,
                              )
                            }
                            className="text-xs font-bold text-red-700 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ),
                    )
                  )}
                </div>
              </Panel>
            </aside>

            <section className="min-w-0 space-y-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      Group calendar preview
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Group 1 starts on{" "}
                      {formatDate(
                        draft.firstGroupStartDate,
                      )}
                      . Each following group uses the
                      next permitted working date.
                    </p>
                  </div>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                    {draft.groupCount} groups ·{" "}
                    {
                      STANDARD_TREATMENTS.length
                    }{" "}
                    treatments
                  </span>
                </div>

                <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                  <div className="min-w-[1050px]">
                    <div className="grid grid-cols-[90px_repeat(5,minmax(175px,1fr))] gap-0 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <div className="border-r border-slate-200 px-4 py-3">
                        Group
                      </div>

                      {draft.treatmentRounds.map(
                        (round) => (
                          <div
                            key={
                              round.visitNumber
                            }
                            className="border-r border-slate-200 px-4 py-3 last:border-r-0"
                          >
                            T
                            {
                              round.visitNumber
                            }
                            <div className="mt-1 normal-case tracking-normal text-slate-700">
                              {
                                round.treatmentName
                              }
                            </div>
                          </div>
                        ),
                      )}
                    </div>

                    {sortedGroupDates.map(
                      (group) => (
                        <div
                          key={
                            group.groupNumber
                          }
                          className="grid grid-cols-[90px_repeat(5,minmax(175px,1fr))] border-t border-slate-100 text-sm hover:bg-green-50/40"
                        >
                          <div className="border-r border-slate-200 px-4 py-3 font-bold text-[#176b37]">
                            {
                              group.groupNumber
                            }
                          </div>

                          {group.treatmentDates.map(
                            (
                              date,
                              index,
                            ) => (
                              <div
                                key={`${group.groupNumber}-${index}`}
                                className="border-r border-slate-100 px-4 py-3 last:border-r-0"
                              >
                                <div className="font-semibold">
                                  {formatShortDate(
                                    date,
                                  )}
                                </div>

                                <div className="mt-0.5 text-xs text-slate-500">
                                  {formatWeekday(
                                    date,
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 shadow-sm">
                <h2 className="font-bold">
                  Phase 1 scheduling rule
                </h2>

                <p className="mt-1">
                  This page is now the only calendar
                  generator. The former independent
                  planner storage key is no longer
                  used. Customers inherit these dates
                  from their assigned group; only
                  customer-specific reschedules should
                  create overrides.
                </p>
              </article>
            </section>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function cloneSeason(
  season: SeasonCalendar,
): SeasonCalendar {
  return {
    ...season,

    excludedDates: [
      ...season.excludedDates,
    ],

    treatmentRounds:
      season.treatmentRounds.map(
        (round) => ({
          ...round,
        }),
      ) as SeasonCalendar["treatmentRounds"],

    groupDates:
      season.groupDates.map(
        (group) => ({
          ...group,

          treatmentDates: [
            ...group.treatmentDates,
          ] as typeof group.treatmentDates,
        }),
      ),
  };
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

  const date = parseDate(value);

  return !Number.isNaN(
    date.getTime(),
  );
}

function formatDate(
  value: string,
) {
  if (!isDateValue(value)) {
    return "No date selected";
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

function formatShortDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(parseDate(value));
}

function formatWeekday(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      weekday: "long",
    },
  ).format(parseDate(value));
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-5">
        {children}
      </div>
    </article>
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

function NumberField({
  label,
  value,
  min,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          value={value}
          onChange={(event) =>
            onChange(
              Math.max(
                min,
                Number(
                  event.target.value,
                ) || min,
              ),
            )
          }
          className={inputClass}
        />

        {suffix && (
          <span className="text-sm font-semibold text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

function OptionToggle({
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
    <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
      <div>
        <div className="font-semibold">
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