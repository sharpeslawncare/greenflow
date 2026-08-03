"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";

type Visit = {
  number: number;
  name: string;
  plannedDate: string;
  adjustedDate: string;
};

type PlannerSettings = {
  seasonStart: string;
  gap1: number;
  gap2: number;
  gap3: number;
  gap4: number;
  avoidWednesdays: boolean;
  avoidWeekends: boolean;
};

const STORAGE_KEY = "greenflow-season-planner-v1";

const defaultSettings: PlannerSettings = {
  seasonStart: "2028-03-30",
  gap1: 70,
  gap2: 70,
  gap3: 70,
  gap4: 70,
  avoidWednesdays: true,
  avoidWeekends: true,
};

const visitNames = [
  "Early winter moss control",
  "Spring weed and feed",
  "Summer weed and feed",
  "Autumn weed and feed",
  "Winter moss control",
];

export default function SeasonPlannerPage() {
  const [settings, setSettings] =
    useState<PlannerSettings>(defaultSettings);

  const [manualAdjustments, setManualAdjustments] =
    useState<Record<number, number>>({});

  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as {
        settings?: PlannerSettings;
        manualAdjustments?: Record<number, number>;
      };

      if (parsed.settings) {
        setSettings(parsed.settings);
      }

      if (parsed.manualAdjustments) {
        setManualAdjustments(parsed.manualAdjustments);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        settings,
        manualAdjustments,
      }),
    );
  }, [settings, manualAdjustments]);

  const visits = useMemo(
    () =>
      buildVisits(
        settings,
        manualAdjustments,
      ),
    [settings, manualAdjustments],
  );

  function updateGap(
    field: "gap1" | "gap2" | "gap3" | "gap4",
    value: number,
  ) {
    setSettings((current) => ({
      ...current,
      [field]: Math.max(1, value),
    }));
  }

  function moveVisit(
    visitNumber: number,
    numberOfDays: number,
  ) {
    setManualAdjustments((current) => ({
      ...current,
      [visitNumber]:
        (current[visitNumber] ?? 0) + numberOfDays,
    }));

    showMessage(
      `Visit ${visitNumber} moved ${
        numberOfDays > 0 ? "forward" : "back"
      } by ${Math.abs(numberOfDays)} day.`,
    );
  }

  function resetVisit(visitNumber: number) {
    setManualAdjustments((current) => {
      const updated = { ...current };
      delete updated[visitNumber];
      return updated;
    });

    showMessage(`Visit ${visitNumber} restored.`);
  }

  function resetPlanner() {
    const confirmed = window.confirm(
      "Restore the original GreenFlow demo season settings?",
    );

    if (!confirmed) return;

    setSettings(defaultSettings);
    setManualAdjustments({});
    window.localStorage.removeItem(STORAGE_KEY);
    showMessage("Season planner restored.");
  }

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 2500);
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1500px]">
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

              <p className="mt-1 text-sm text-slate-500">
                Generate and adjust the annual treatment programme.
              </p>
            </div>

            <button
              type="button"
              onClick={resetPlanner}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
            >
              Restore demo settings
            </button>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <section className="grid gap-4 xl:grid-cols-[380px_1fr]">
            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">
                Programme settings
              </h2>

              <div className="mt-5 space-y-4">
                <Field label="Season start date">
                  <input
                    type="date"
                    value={settings.seasonStart}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        seasonStart: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </Field>

                <div className="rounded-xl bg-green-50 p-4">
                  <p className="text-sm font-semibold text-green-900">
                    Standard programme
                  </p>

                  <p className="mt-1 text-sm text-green-800">
                    Five visits, normally around ten weeks apart.
                  </p>
                </div>

                <GapField
                  label="Visit 1 → Visit 2"
                  value={settings.gap1}
                  onChange={(value) =>
                    updateGap("gap1", value)
                  }
                />

                <GapField
                  label="Visit 2 → Visit 3"
                  value={settings.gap2}
                  onChange={(value) =>
                    updateGap("gap2", value)
                  }
                />

                <GapField
                  label="Visit 3 → Visit 4"
                  value={settings.gap3}
                  onChange={(value) =>
                    updateGap("gap3", value)
                  }
                />

                <GapField
                  label="Visit 4 → Visit 5"
                  value={settings.gap4}
                  onChange={(value) =>
                    updateGap("gap4", value)
                  }
                />

                <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                  <div>
                    <div className="font-semibold">
                      Reserve Wednesdays
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Move generated work to the next available day.
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={settings.avoidWednesdays}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        avoidWednesdays:
                          event.target.checked,
                      }))
                    }
                    className="h-5 w-5"
                  />
                </label>

                <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                  <div>
                    <div className="font-semibold">
                      Avoid weekends
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Saturday and Sunday are moved forward.
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={settings.avoidWeekends}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        avoidWeekends:
                          event.target.checked,
                      }))
                    }
                    className="h-5 w-5"
                  />
                </label>
              </div>
            </aside>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">
                    Generated programme
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Dates update automatically whenever a setting changes.
                  </p>
                </div>

                <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-800">
                  5 visits
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {visits.map((visit, index) => {
                  const adjustment =
                    manualAdjustments[visit.number] ?? 0;

                  return (
                    <article
                      key={visit.number}
                      className="grid gap-4 rounded-xl border border-slate-200 p-4 lg:grid-cols-[70px_1.4fr_1fr_1fr_auto] lg:items-center"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#176b37] font-bold text-white">
                        {visit.number}
                      </div>

                      <div>
                        <div className="font-bold">
                          {visit.name}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Treatment cycle {visit.number} of 5
                        </div>
                      </div>

                      <DateDetail
                        label="Calculated date"
                        value={formatDate(
                          visit.plannedDate,
                        )}
                      />

                      <DateDetail
                        label="Scheduled date"
                        value={formatDate(
                          visit.adjustedDate,
                        )}
                        highlight
                      />

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            moveVisit(visit.number, -1)
                          }
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                        >
                          −1 day
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            moveVisit(visit.number, 1)
                          }
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                        >
                          +1 day
                        </button>

                        {adjustment !== 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              resetVisit(visit.number)
                            }
                            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      {index < visits.length - 1 && (
                        <div className="hidden lg:col-span-5 lg:block">
                          <div className="ml-[21px] h-4 border-l-2 border-dashed border-green-200" />
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          </section>

          <section className="mt-4 grid gap-4 md:grid-cols-3">
            <SummaryCard
              label="Programme begins"
              value={formatDate(
                visits[0]?.adjustedDate,
              )}
            />

            <SummaryCard
              label="Programme finishes"
              value={formatDate(
                visits[4]?.adjustedDate,
              )}
            />

            <SummaryCard
              label="Total programme length"
              value={`${daysBetween(
                visits[0]?.adjustedDate,
                visits[4]?.adjustedDate,
              )} days`}
            />
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function buildVisits(
  settings: PlannerSettings,
  manualAdjustments: Record<number, number>,
): Visit[] {
  const gaps = [
    0,
    settings.gap1,
    settings.gap2,
    settings.gap3,
    settings.gap4,
  ];

  const visits: Visit[] = [];
  let currentDate = parseDate(settings.seasonStart);

  for (let index = 0; index < 5; index += 1) {
    if (index > 0) {
      currentDate = addDays(currentDate, gaps[index]);
    }

    const plannedDate = toDateInputValue(currentDate);

    let adjusted = moveToWorkingDay(
      currentDate,
      settings.avoidWednesdays,
      settings.avoidWeekends,
    );

    const manualAdjustment =
      manualAdjustments[index + 1] ?? 0;

    adjusted = addDays(
      adjusted,
      manualAdjustment,
    );

    adjusted = moveToWorkingDay(
      adjusted,
      settings.avoidWednesdays,
      settings.avoidWeekends,
    );

    visits.push({
      number: index + 1,
      name: visitNames[index],
      plannedDate,
      adjustedDate: toDateInputValue(adjusted),
    });
  }

  return visits;
}

function moveToWorkingDay(
  date: Date,
  avoidWednesdays: boolean,
  avoidWeekends: boolean,
) {
  let result = new Date(date);

  while (true) {
    const day = result.getDay();

    const isWednesday =
      avoidWednesdays && day === 3;

    const isWeekend =
      avoidWeekends && (day === 0 || day === 6);

    if (!isWednesday && !isWeekend) {
      return result;
    }

    result = addDays(result, 1);
  }
}

function parseDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(date.getDate()).padStart(
    2,
    "0",
  );

  return `${year}-${month}-${day}`;
}

function formatDate(value?: string) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseDate(value));
}

function daysBetween(
  start?: string,
  finish?: string,
) {
  if (!start || !finish) return 0;

  const milliseconds =
    parseDate(finish).getTime() -
    parseDate(start).getTime();

  return Math.round(
    milliseconds / (1000 * 60 * 60 * 24),
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">
        {label}
      </span>

      {children}
    </label>
  );
}

function GapField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          value={value}
          onChange={(event) =>
            onChange(
              Number(event.target.value) || 1,
            )
          }
          className={inputClass}
        />

        <span className="text-sm font-semibold text-slate-500">
          days
        </span>
      </div>
    </Field>
  );
}

function DateDetail({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div
        className={`mt-1 font-semibold ${
          highlight
            ? "text-[#176b37]"
            : "text-slate-700"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-xl font-bold">
        {value}
      </div>
    </article>
  );
}