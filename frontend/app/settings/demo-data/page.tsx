"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";
import { useProgrammeStore } from "@/components/programme-store";
import { useTreatmentStore } from "@/components/treatment-store";
import { useEnquiryStore } from "@/components/enquiry-store";

const CONFIRMATION_TEXT =
  "RESET DEMO DATABASE";

const STORAGE_KEYS_TO_CLEAR = [
  "greenflow-customers-v1",
  "greenflow-customer-programmes-v1",
  "greenflow-treatments-v1",
  "greenflow-treatments-v2",
  "greenflow-treatments-v3",
  "greenflow-enquiries-v1",
  "greenflow-route-orders-v1",
  "greenflow-visit-centre-standard-mixes-v1",
];

export default function DemoDataPage() {
  const {
    customers,
    ready: customersReady,
    restoreDemoCustomers,
  } = useCustomerStore();

  const {
    programmes,
    ready: programmesReady,
  } = useProgrammeStore();

  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const {
    enquiries,
    ready: enquiriesReady,
    clearEnquiries,
  } = useEnquiryStore();

  const [confirmation, setConfirmation] =
    useState("");
  const [resetting, setResetting] =
    useState(false);

  const ready =
    customersReady &&
    programmesReady &&
    treatmentsReady &&
    enquiriesReady;

  const groupSummary = useMemo(
    () =>
      Array.from(
        { length: 20 },
        (_, index) => {
          const groupNumber =
            index + 1;

          return {
            groupNumber,
            count:
              customers.filter(
                (customer) =>
                  customer.groupNumber ===
                  groupNumber,
              ).length,
          };
        },
      ),
    [customers],
  );

  const canReset =
    confirmation.trim() ===
      CONFIRMATION_TEXT &&
    !resetting;

  function resetDemoDatabase() {
    if (!canReset) return;

    const confirmed =
      window.confirm(
        "Replace the current demo database with 100 active customers, five customers in each group from 1 to 20? Treatment history, enquiries, arranged site visits, quotations, route ordering and saved daily mixes will be removed.",
      );

    if (!confirmed) return;

    setResetting(true);

    try {
      clearEnquiries();

      STORAGE_KEYS_TO_CLEAR.forEach(
        (key) =>
          window.localStorage.removeItem(
            key,
          ),
      );

      restoreDemoCustomers();

      window.localStorage.setItem(
        "greenflow-enquiries-v1",
        JSON.stringify([]),
      );

      window.alert(
        "The 100-customer demo database has been prepared. GreenFlow will now reload and rebuild annual programmes from the Season Planner.",
      );

      window.location.reload();
    } catch (error) {
      console.error(
        "Demo database reset failed:",
        error,
      );

      window.alert(
        "The demo database reset did not complete. Restore your latest backup before trying again.",
      );

      setResetting(false);
    }
  }

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading demo data tools...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-6xl">
          <header className="mb-5">
            <Link
              href="/settings"
              className="text-sm font-semibold text-[#176b37] hover:underline"
            >
              ← Maintenance
            </Link>

            <h1 className="mt-2 text-3xl font-bold">
              Demo Data
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Create a predictable test database with 100 active customers and a clean operational history.
            </p>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Current customers"
              value={String(
                customers.length,
              )}
              detail="Replaced by reset"
            />

            <SummaryCard
              label="Programmes"
              value={String(
                programmes.length,
              )}
              detail="Rebuilt after reload"
            />

            <SummaryCard
              label="Treatment records"
              value={String(
                treatments.length,
              )}
              detail="Removed"
              warning={
                treatments.length > 0
              }
            />

            <SummaryCard
              label="Enquiries and quotes"
              value={String(
                enquiries.length,
              )}
              detail="Removed"
              warning={
                enquiries.length > 0
              }
            />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
            <article className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
                New demo structure
              </div>

              <h2 className="mt-2 text-2xl font-bold">
                100 customers across 20 groups
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Customer numbers 1001–1100, with exactly five active customers in every group and all customers assigned to Van 1.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {groupSummary.map(
                  (group) => (
                    <div
                      key={
                        group.groupNumber
                      }
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"
                    >
                      <div className="text-xs font-semibold text-slate-500">
                        Group{" "}
                        {
                          group.groupNumber
                        }
                      </div>

                      <div className="mt-1 text-xl font-bold">
                        5
                      </div>
                    </div>
                  ),
                )}
              </div>
            </article>

            <aside className="h-fit rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">
                Removed
              </div>

              <div className="mt-4 space-y-2 text-sm text-red-950">
                {[
                  "Existing demo customers",
                  "Treatment outcomes and history",
                  "Chemical usage derived from treatments",
                  "Visit documents and invoice references",
                  "Arranged site visits",
                  "Enquiries and quotations",
                  "Accepted and declined quotes",
                  "Saved route ordering",
                  "Saved Today’s Mix selections",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2"
                  >
                    <span className="font-bold">
                      ×
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </aside>
          </section>

          <section className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
            <h2 className="text-xl font-bold text-amber-950">
              Confirm demo database reset
            </h2>

            <p className="mt-2 text-sm leading-6 text-amber-900">
              Type{" "}
              <strong>
                {CONFIRMATION_TEXT}
              </strong>{" "}
              exactly. Create a backup first when the current data matters.
            </p>

            <input
              value={confirmation}
              onChange={(event) =>
                setConfirmation(
                  event.target.value,
                )
              }
              disabled={resetting}
              placeholder={
                CONFIRMATION_TEXT
              }
              className="mt-4 w-full rounded-xl border border-amber-300 bg-white px-4 py-3 font-semibold outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100 disabled:bg-slate-100"
            />

            <button
              type="button"
              onClick={
                resetDemoDatabase
              }
              disabled={!canReset}
              className="mt-4 rounded-xl bg-red-700 px-6 py-3 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {resetting
                ? "Resetting Demo Database..."
                : "Reset GreenFlow Demo Database"}
            </button>
          </section>
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
          warning
            ? "bg-amber-500"
            : "bg-[#338b45]"
        }`}
      />

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