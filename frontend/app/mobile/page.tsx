"use client";

import Link from "next/link";
import { useMemo } from "react";

import {
  useCustomerStore,
} from "@/components/customer-store";
import {
  useProgrammeStore,
} from "@/components/programme-store";
import {
  useTreatmentStore,
} from "@/components/treatment-store";
import {
  formatDateWithDay,
  getTodayDateValue,
} from "@/lib/date-utils";

import { AppShell } from "@/components/app-shell";

export default function MobilePage() {
  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    programmes,
    ready: programmesReady,
  } = useProgrammeStore();

  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const today = getTodayDateValue();

  const todayTreatments = useMemo(
    () =>
      treatments.filter(
        (treatment) =>
          treatment.scheduledDate === today,
      ),
    [treatments, today],
  );

  const completedToday = useMemo(
    () =>
      todayTreatments.filter(
        (treatment) =>
          treatment.status === "Completed",
      ).length,
    [todayTreatments],
  );

  const remainingToday = useMemo(
    () =>
      programmes.reduce(
        (total, programme) => {
          const customer =
            customers.find(
              (item) =>
                item.customerNumber ===
                programme.customerNumber,
            );

          if (
            !customer ||
            customer.status !== "Active"
          ) {
            return total;
          }

          return (
            total +
            programme.visits.filter(
              (visit) =>
                visit.scheduledDate === today &&
                (
                  visit.status === "Scheduled" ||
                  visit.status === "Planned"
                ),
            ).length
          );
        },
        0,
      ),
    [programmes, customers, today],
  );

  const plannedToday =
    remainingToday + completedToday;

  const exceptionsToday = useMemo(
    () =>
      todayTreatments.filter(
        (treatment) =>
          treatment.status !== "Completed" &&
          treatment.status !== "Cancelled" &&
          treatment.status !== "Rescheduled",
      ).length,
    [todayTreatments],
  );

  const ready =
    customersReady &&
    programmesReady &&
    treatmentsReady;

  return (
    <AppShell>
      <main className="gf-page">
        <div className="gf-page-inner">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Sharpes Lawn Care
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              GreenFlow Mobile
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Quick access to GreenFlow while away from the desk.
            </p>

          <section className="mt-4 rounded-2xl border border-green-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#176b37]">
              Working day
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {formatDateWithDay(today)}
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <MobileMetric
                label="Planned"
                value={ready ? plannedToday : "—"}
                detail="Jobs for today"
              />

              <MobileMetric
                label="Completed"
                value={ready ? completedToday : "—"}
                detail="Completed"
              />

              <MobileMetric
                label="Remaining"
                value={ready ? remainingToday : "—"}
                detail="Still outstanding"
              />

              <MobileMetric
                label="Exceptions"
                value={ready ? exceptionsToday : "—"}
                detail="Need review"
              />
            </div>
          </section>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MobileCard
              href="/customers"
              tone="customers"
              title="Customers"
              detail="Customer details, addresses and contact information"
            />

            <MobileCard
              href="/jobs"
              tone="schedule"
              title="Schedule"
              detail="See planned work and today's jobs"
            />

            <MobileCard
              href="/visit-centre"
              tone="visit"
              title="Visit Centre"
              detail="Run the day and record completed visits"
            />

            <MobileCard
              href="/additional-jobs"
              tone="additional"
              title="Additional Jobs"
              detail="Add and review extra customer work"
            />

            <MobileCard
              href="/actions"
              tone="actions"
              title="Action Centre"
              detail="Reminders, follow-ups and actions"
            />

            <MobileCard
              href="/chemicals"
              tone="chemicals"
              title="Chemicals & Calibration"
              detail="Products, stock, equipment and calibration"
            />

            <MobileCard
              href="/routes"
              tone="routes"
              title="Routes"
              detail="Check customer order and van routes"
            />

            <MobileCard
              href="/treatments"
              tone="treatments"
              title="Treatments"
              detail="Review recorded treatment information"
            />

            <MobileCard
              href="/documents"
              tone="documents"
              title="Documents"
              detail="Open GreenFlow treatment documents"
            />
          </div>          </div>
        </div>
      </main>
    </AppShell>
  );
}
function MobileMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold text-slate-900">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </div>
  );
}
function MobileCard({
  href,
  title,
  detail,
  tone,
}: {
  href: string;
  title: string;
  detail: string;
  tone:
    | "customers"
    | "schedule"
    | "visit"
    | "additional"
    | "actions"
    | "chemicals"
    | "routes"
    | "treatments"
    | "documents";
}) {
  const tones = {
    customers: "border-slate-300 text-[#475569]",
    schedule: "border-green-300 text-[#176b37]",
    visit: "border-blue-300 text-blue-700",
    additional: "border-amber-300 text-amber-700",
    actions: "border-violet-300 text-violet-700",
    chemicals: "border-[#dc6b62] text-[#b42318]",
    routes: "border-slate-300 text-[#475569]",
    treatments: "border-slate-300 text-[#475569]",
    documents: "border-slate-300 text-[#475569]",
  };

  const toneClass = tones[tone];
  return (
    <Link
      href={href}
      className={`block rounded-2xl border-2 bg-white p-5 shadow-sm transition hover:shadow-md ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">{detail}</p>
        </div>

        <span
          aria-hidden="true"
          className="text-xl font-bold"
        >
          →
        </span>
      </div>
    </Link>
  );
}
