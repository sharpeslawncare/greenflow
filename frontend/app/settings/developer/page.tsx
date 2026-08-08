"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";
import { useProgrammeStore } from "@/components/programme-store";
import { useSeasonStore } from "@/components/season-store";
import { useTreatmentStore } from "@/components/treatment-store";

const CONFIRMATION_TEXT = "RESET";
const DEMO_RESET_CONFIRMATION_TEXT = "RESET DEMO";

const STANDARD_MIX_STORAGE_KEY =
  "greenflow-visit-centre-standard-mixes-v1";

export default function DeveloperSettingsPage() {
  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    programmes,
    ready: programmesReady,
    saveProgramme,
  } = useProgrammeStore();

  const {
    seasons,
    ready: seasonsReady,
  } = useSeasonStore();

  const {
    treatments,
    ready: treatmentsReady,
    deleteTreatment,
  } = useTreatmentStore();

  const [
    confirmation,
    setConfirmation,
  ] = useState("");

  const [
    demoConfirmation,
    setDemoConfirmation,
  ] = useState("");

  const [message, setMessage] =
    useState("");

  const [resetting, setResetting] =
    useState(false);

  const [
    resettingDemo,
    setResettingDemo,
  ] = useState(false);

  /*
   * IMPORTANT:
   * Do not read localStorage during the first render.
   *
   * Reading it in useMemo caused the hydration error because
   * the server rendered an empty list while the browser rendered
   * the real localStorage keys.
   */
  const [
    storedGreenFlowKeys,
    setStoredGreenFlowKeys,
  ] = useState<string[]>([]);

  useEffect(() => {
    refreshStoredKeys();
  }, []);

  const ready =
    customersReady &&
    programmesReady &&
    seasonsReady &&
    treatmentsReady;

  const canReset =
    confirmation
      .trim()
      .toUpperCase() ===
      CONFIRMATION_TEXT &&
    !resetting;

  const canResetDemo =
    demoConfirmation
      .trim()
      .toUpperCase() ===
      DEMO_RESET_CONFIRMATION_TEXT &&
    !resettingDemo;

  const resetSummary =
    useMemo(() => {
      const visits =
        programmes.flatMap(
          (programme) =>
            programme.visits,
        );

      return {
        customers:
          customers.length,
        programmes:
          programmes.length,
        visits:
          visits.length,
        completedVisits:
          visits.filter(
            (visit) =>
              visit.status ===
              "Completed",
          ).length,
        skippedVisits:
          visits.filter(
            (visit) =>
              visit.status ===
              "Skipped",
          ).length,
        treatments:
          treatments.length,
      };
    }, [
      customers,
      programmes,
      treatments,
    ]);

  function refreshStoredKeys() {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    setStoredGreenFlowKeys(
      Object.keys(
        window.localStorage,
      )
        .filter((key) =>
          key.startsWith(
            "greenflow-",
          ),
        )
        .sort(),
    );
  }

  function handleConfirmationChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setConfirmation(
      event.target.value,
    );
    setMessage("");
  }

  function handleDemoConfirmationChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setDemoConfirmation(
      event.target.value,
    );
    setMessage("");
  }

  function resetDemoWorkingData() {
    if (!canResetDemo) {
      setMessage(
        `Type ${DEMO_RESET_CONFIRMATION_TEXT} before resetting demo working data.`,
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Reset demo working data? Treatment outcomes will be deleted and every programme visit will be returned to its original group treatment date. Customers, groups, routes, chemicals, stock, fleet and business settings will be preserved.",
      );

    if (!confirmed) {
      return;
    }

    setResettingDemo(true);
    setMessage("");

    try {
      let restoredDates = 0;
      let resetVisits = 0;

      for (
        const programme of
        programmes
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

        const groupDates =
          customer && season
            ? season.groupDates.find(
                (group) =>
                  group.groupNumber ===
                  customer.groupNumber,
              )
            : undefined;

        saveProgramme({
          ...programme,

          visits:
            programme.visits.map(
              (visit) => {
                const originalDate =
                  groupDates
                    ?.treatmentDates[
                    visit.visitNumber -
                      1
                  ];

                if (
                  originalDate &&
                  originalDate !==
                    visit.scheduledDate
                ) {
                  restoredDates += 1;
                }

                resetVisits += 1;

                return {
                  ...visit,

                  scheduledDate:
                    originalDate ||
                    visit.scheduledDate,

                  /*
                   * Keep deliberately planned visits as Planned.
                   * Everything else goes back to Scheduled.
                   */
                  status:
                    visit.status ===
                    "Planned"
                      ? "Planned"
                      : "Scheduled",

                  notes:
                    removeOutcomeNotes(
                      visit.notes ?? "",
                    ),
                };
              },
            ),
        });
      }

      for (
        const treatment of
        treatments
      ) {
        deleteTreatment(
          treatment.id,
        );
      }

      /*
       * A saved daily product mix is operational test data,
       * so clear it. Route ordering is intentionally preserved.
       */
      window.localStorage.removeItem(
        STANDARD_MIX_STORAGE_KEY,
      );

      setDemoConfirmation("");

      setMessage(
        `${resetVisits} programme visits reset, ${restoredDates} rescheduled date${
          restoredDates === 1
            ? ""
            : "s"
        } restored to the original group schedule, and ${treatments.length} treatment record${
          treatments.length === 1
            ? ""
            : "s"
        } removed.`,
      );

      window.setTimeout(() => {
        window.location.reload();
      }, 900);
    } catch (error) {
      console.error(
        "Demo working data reset failed:",
        error,
      );

      setMessage(
        "The demo working-data reset did not complete successfully. No further reset has been attempted.",
      );
      setResettingDemo(false);
    }
  }

  function resetGreenFlowData() {
    if (!canReset) {
      setMessage(
        `Type ${CONFIRMATION_TEXT} before resetting GreenFlow.`,
      );
      return;
    }

    const confirmed =
      window.confirm(
        "This will permanently delete all GreenFlow customer, season, programme, treatment, chemical, stock, enquiry, communication and settings data stored in this browser. Continue?",
      );

    if (!confirmed) {
      return;
    }

    setResetting(true);

    const keysToRemove =
      Object.keys(
        window.localStorage,
      ).filter((key) =>
        key.startsWith(
          "greenflow-",
        ),
      );

    for (
      const key of
      keysToRemove
    ) {
      window.localStorage.removeItem(
        key,
      );
    }

    /*
     * sessionStorage is also checked in case a
     * future GreenFlow module stores temporary
     * development data there.
     */
    const sessionKeysToRemove =
      Object.keys(
        window.sessionStorage,
      ).filter((key) =>
        key.startsWith(
          "greenflow-",
        ),
      );

    for (
      const key of
      sessionKeysToRemove
    ) {
      window.sessionStorage.removeItem(
        key,
      );
    }

    setStoredGreenFlowKeys([]);

    setMessage(
      `${keysToRemove.length} GreenFlow data record${
        keysToRemove.length === 1
          ? ""
          : "s"
      } cleared. Reloading the application...`,
    );

    window.setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  }

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading Developer Tools...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1150px]">
          <header className="mb-5">
            <Link
              href="/settings"
              className="text-sm font-semibold text-[#176b37] hover:underline"
            >
              ← Back to Settings
            </Link>

            <h1 className="mt-2 text-3xl font-bold">
              Developer Tools
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Reset operational test data safely or, when absolutely necessary,
              clear all browser-stored GreenFlow data.
            </p>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
              {message}
            </div>
          )}

          <section className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
                  Recommended testing tool
                </div>

                <h2 className="mt-2 text-2xl font-bold text-green-950">
                  Reset Demo Working Data
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Return Visit Centre and daily-job testing to a known starting
                  point without deleting the business setup you have already built.
                </p>
              </div>

              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                Safe for repeated testing
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <ResetDetail
                title="Reset"
                items={[
                  "Completed, cancelled and rescheduling treatment records",
                  "Programme visit completion / skipped status",
                  "Dates changed while testing rescheduling",
                  "Outcome notes written by Visit Centre",
                  "Saved Visit Centre daily product mix",
                ]}
              />

              <ResetDetail
                title="Preserved"
                items={[
                  "Customers and customer numbers",
                  "Customer group assignments",
                  "Original group treatment dates",
                  "Saved route ordering and fleet",
                  "Chemicals, current stock and business settings",
                ]}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniStat
                label="Customers"
                value={String(
                  resetSummary.customers,
                )}
              />

              <MiniStat
                label="Programme visits"
                value={String(
                  resetSummary.visits,
                )}
              />

              <MiniStat
                label="Treatment records"
                value={String(
                  resetSummary.treatments,
                )}
              />
            </div>

            <div className="mt-5 max-w-md">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Type RESET DEMO to confirm
                </span>

                <input
                  value={
                    demoConfirmation
                  }
                  onChange={
                    handleDemoConfirmationChange
                  }
                  placeholder="RESET DEMO"
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={
                resetDemoWorkingData
              }
              disabled={!canResetDemo}
              className="mt-5 rounded-xl bg-[#176b37] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#125b2f] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {resettingDemo
                ? "Resetting demo working data..."
                : "Reset Demo Working Data"}
            </button>
          </section>

          <section className="mt-5 rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-red-800">
                  Reset all GreenFlow data
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  This clears every browser-storage entry beginning with{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                    greenflow-
                  </code>
                  .
                </p>
              </div>

              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                Destructive action
              </span>
            </div>

            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              This deletes customers, annual programmes, season calendars,
              treatments, chemicals, enquiries, communications, stock records and
              saved settings held in this browser. It does not delete your source
              code or Git repository.
            </div>

            <div className="mt-5 max-w-md">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Type RESET to confirm
                </span>

                <input
                  value={confirmation}
                  onChange={
                    handleConfirmationChange
                  }
                  placeholder="RESET"
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={
                resetGreenFlowData
              }
              disabled={!canReset}
              className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {resetting
                ? "Resetting GreenFlow..."
                : "Reset all GreenFlow data"}
            </button>
          </section>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">
              Data currently stored
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              These GreenFlow browser-storage keys are currently present.
            </p>

            {storedGreenFlowKeys.length ===
            0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No GreenFlow data is currently stored in this browser.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {storedGreenFlowKeys.map(
                  (key) => (
                    <div
                      key={key}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
                    >
                      {key}
                    </div>
                  ),
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-xl font-bold">
        {value}
      </div>
    </div>
  );
}

function ResetDetail({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="font-bold text-slate-900">
        {title}
      </div>

      <ul className="mt-3 space-y-2 text-sm leading-5 text-slate-600">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2"
          >
            <span
              className="mt-0.5 font-bold text-[#176b37]"
              aria-hidden="true"
            >
              ✓
            </span>

            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function removeOutcomeNotes(
  notes: string,
) {
  if (!notes.trim()) {
    return "";
  }

  const outcomePatterns = [
    /^Visit completed\.$/i,
    /^Visit cancelled\.$/i,
    /^No access\./i,
    /^Conditions were too wet\./i,
    /^Customer requested a different date\./i,
  ];

  return notes
    .split("\n")
    .filter(
      (line) =>
        !outcomePatterns.some(
          (pattern) =>
            pattern.test(
              line.trim(),
            ),
        ),
    )
    .join("\n")
    .trim();
}