"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useProgrammeStore } from "@/components/programme-store";
import { useTreatmentStore } from "@/components/treatment-store";

const CONFIRMATION_TEXT = "START NEW SEASON";
const ROUTE_ORDER_STORAGE_KEY = "greenflow-route-orders-v1";
const STANDARD_MIX_STORAGE_KEY =
  "greenflow-visit-centre-standard-mixes-v1";

export default function SeasonManagementPage() {
  const {
    programmes,
    ready: programmesReady,
    saveProgramme,
  } = useProgrammeStore();

  const {
    treatments,
    ready: treatmentsReady,
    deleteTreatment,
  } = useTreatmentStore();

  const [confirmation, setConfirmation] = useState("");
  const [resetting, setResetting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState("");

  const summary = useMemo(() => {
    const visits = programmes.flatMap((programme) => programme.visits);

    return {
      programmes: programmes.length,
      totalVisits: visits.length,
      completedVisits: visits.filter(
        (visit) => visit.status === "Completed",
      ).length,
      skippedVisits: visits.filter(
        (visit) => visit.status === "Skipped",
      ).length,
      plannedVisits: visits.filter(
        (visit) =>
          visit.status === "Planned" ||
          visit.status === "Scheduled",
      ).length,
      treatmentRecords: treatments.length,
      completedTreatments: treatments.filter(
        (treatment) => treatment.status === "Completed",
      ).length,
      cancelledTreatments: treatments.filter(
        (treatment) => treatment.status === "Cancelled",
      ).length,
      reschedulingTreatments: treatments.filter(
        (treatment) =>
          treatment.status === "Needs Rescheduling" ||
          treatment.status === "Rescheduled",
      ).length,
    };
  }, [programmes, treatments]);

  const ready = programmesReady && treatmentsReady;
  const canReset =
    confirmation.trim() === CONFIRMATION_TEXT && !resetting;

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading season management...
          </div>
        </main>
      </AppShell>
    );
  }

  function startNewSeason() {
    if (!canReset) return;

    const confirmed = window.confirm(
      "This will remove all treatment outcomes and return every programme visit to Scheduled. Customers, programme dates, chemicals, stock, groups, vans and business settings will be preserved. Continue?",
    );

    if (!confirmed) return;

    setResetting(true);
    setMessage("");
    setCompleted(false);

    try {
      for (const programme of programmes) {
        saveProgramme({
          ...programme,
          visits: programme.visits.map((visit) => ({
            ...visit,
            status: "Scheduled",
            notes: "",
          })),
        });
      }

      for (const treatment of treatments) {
        deleteTreatment(treatment.id);
      }

      window.localStorage.removeItem(ROUTE_ORDER_STORAGE_KEY);
      window.localStorage.removeItem(STANDARD_MIX_STORAGE_KEY);

      window.dispatchEvent(
        new CustomEvent("greenflow:route-orders-updated"),
      );

      setConfirmation("");
      setCompleted(true);
      setMessage(
        `${summary.totalVisits} programme visits reset and ${summary.treatmentRecords} treatment records removed. GreenFlow is ready for a clean operational test.`,
      );
    } catch (error) {
      console.error("Season reset failed:", error);
      setMessage(
        "The reset did not complete successfully. Do not repeat it until the error has been reviewed.",
      );
    } finally {
      setResetting(false);
    }
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1250px]">
          <header className="mb-5">
            <Link
              href="/settings"
              className="text-sm font-semibold text-[#176b37] hover:underline"
            >
              ← Business Settings
            </Link>

            <h1 className="mt-2 text-3xl font-bold">
              Season Management
            </h1>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Return GreenFlow to a clean operational state while preserving
              customers, programmes, scheduled dates, chemicals, stock, fleet
              and business settings.
            </p>
          </header>

          {message && (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                completed
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {message}
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Programmes"
              value={String(summary.programmes)}
              detail="Preserved"
            />

            <SummaryCard
              label="Programme visits"
              value={String(summary.totalVisits)}
              detail={`${summary.completedVisits} completed · ${summary.skippedVisits} skipped`}
            />

            <SummaryCard
              label="Treatment records"
              value={String(summary.treatmentRecords)}
              detail="Removed by reset"
              warning={summary.treatmentRecords > 0}
            />

            <SummaryCard
              label="Already outstanding"
              value={String(summary.plannedVisits)}
              detail="Planned or scheduled"
            />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-2">
            <article className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">
                This operation removes
              </div>

              <h2 className="mt-2 text-xl font-bold">
                Operational history
              </h2>

              <div className="mt-4 space-y-3">
                <ResetItem
                  label="Completed programme visits"
                  value={summary.completedVisits}
                />
                <ResetItem
                  label="Skipped, cancelled or failed programme visits"
                  value={summary.skippedVisits}
                />
                <ResetItem
                  label="Treatment records"
                  value={summary.treatmentRecords}
                />
                <ResetItem
                  label="Completed treatment outcomes"
                  value={summary.completedTreatments}
                />
                <ResetItem
                  label="Cancelled treatment outcomes"
                  value={summary.cancelledTreatments}
                />
                <ResetItem
                  label="Rescheduling records"
                  value={summary.reschedulingTreatments}
                />
                <ResetItem label="Saved route orders" value="Cleared" />
                <ResetItem label="Saved daily standard mixes" value="Cleared" />
              </div>

              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
                Chemical usage, visit documents and visit invoice references
                are derived from Treatment Records, so they will disappear when
                those records are removed.
              </div>
            </article>

            <article className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
                This operation preserves
              </div>

              <h2 className="mt-2 text-xl font-bold">
                Master business data
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  "Customers",
                  "Addresses",
                  "Lawn measurements",
                  "Prices",
                  "Groups",
                  "Fleet",
                  "Annual programmes",
                  "Scheduled visit dates",
                  "Season calendars",
                  "Treatment templates",
                  "Chemicals and fertilisers",
                  "Current stock quantities",
                  "Equipment",
                  "Business settings",
                  "Invoice settings",
                  "Branding and wording",
                ].map((label) => (
                  <PreservedItem key={label} label={label} />
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                <strong>Stock quantities are deliberately preserved.</strong>{" "}
                This reset does not reverse earlier stock deductions because
                GreenFlow cannot reliably separate test deductions from genuine
                manual stock changes.
              </div>
            </article>
          </section>

          <section className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
            <div className="max-w-3xl">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">
                Final confirmation
              </div>

              <h2 className="mt-2 text-xl font-bold text-amber-950">
                Type the confirmation phrase
              </h2>

              <p className="mt-2 text-sm leading-6 text-amber-900">
                Enter <strong>{CONFIRMATION_TEXT}</strong> exactly. This action
                cannot restore the deleted Treatment Records.
              </p>

              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={resetting}
                placeholder={CONFIRMATION_TEXT}
                autoComplete="off"
                className="mt-4 w-full rounded-xl border border-amber-300 bg-white px-4 py-3 font-semibold outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/settings"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Link>

                <button
                  type="button"
                  onClick={startNewSeason}
                  disabled={!canReset}
                  className="rounded-xl bg-red-700 px-6 py-3 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {resetting ? "Resetting GreenFlow..." : "Start New Season"}
                </button>
              </div>
            </div>
          </section>

          {completed && (
            <section className="mt-5 rounded-2xl border border-green-300 bg-green-50 p-5">
              <h2 className="text-xl font-bold text-green-950">
                Clean operational state created
              </h2>

              <p className="mt-2 text-sm leading-6 text-green-800">
                Reload GreenFlow and begin testing from the Dashboard. Every
                programme visit should now be outstanding and Treatment Records
                should be empty.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/"
                  className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
                >
                  Open Dashboard
                </Link>

                <Link
                  href="/jobs"
                  className="rounded-xl border border-green-300 bg-white px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100"
                >
                  Open Today’s Jobs
                </Link>

                <Link
                  href="/treatments"
                  className="rounded-xl border border-green-300 bg-white px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100"
                >
                  Check Treatment Records
                </Link>
              </div>
            </section>
          )}
        </div>
      </main>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`mb-3 h-1.5 w-10 rounded-full ${
          warning ? "bg-amber-500" : "bg-[#338b45]"
        }`}
      />
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </article>
  );
}

function ResetItem({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-red-700">
        {value}
      </span>
    </div>
  );
}

function PreservedItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-700 text-xs font-bold text-white">
        ✓
      </span>
      <span className="text-sm font-semibold text-green-950">{label}</span>
    </div>
  );
}