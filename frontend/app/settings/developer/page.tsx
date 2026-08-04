"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";

const CONFIRMATION_TEXT = "RESET";

export default function DeveloperSettingsPage() {
  const [confirmation, setConfirmation] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [resetting, setResetting] =
    useState(false);

  const canReset =
    confirmation.trim().toUpperCase() ===
    CONFIRMATION_TEXT;

  const storedGreenFlowKeys =
    useMemo(() => {
      if (
        typeof window ===
        "undefined"
      ) {
        return [];
      }

      return Object.keys(
        window.localStorage,
      )
        .filter((key) =>
          key.startsWith(
            "greenflow-",
          ),
        )
        .sort();
    }, [message]);

  function handleConfirmationChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setConfirmation(
      event.target.value,
    );

    setMessage("");
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

    for (const key of keysToRemove) {
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

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-4xl">
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

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Reset browser-stored GreenFlow data
              and return the application to a clean
              testing state.
            </p>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
              {message}
            </div>
          )}

          <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-red-800">
                  Reset all GreenFlow data
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  This clears every browser-storage
                  entry beginning with{" "}
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
              This deletes customers, annual
              programmes, season calendars,
              treatments, chemicals, enquiries,
              communications, stock records and
              saved settings held in this browser.
              It does not delete your source code or
              GitHub repository.
            </div>

            <div className="mt-5">
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
              disabled={
                !canReset ||
                resetting
              }
              className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {resetting
                ? "Resetting GreenFlow..."
                : "Reset all GreenFlow data"}
            </button>
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">
              Data currently stored
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              These GreenFlow browser-storage keys
              will be removed by the reset.
            </p>

            {storedGreenFlowKeys.length ===
            0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No GreenFlow data is currently
                stored in this browser.
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