"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useActionStore } from "@/components/action-store";
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

  const {
    actions,
    ready: actionsReady,
  } = useActionStore();

  const [customerSearch, setCustomerSearch] = useState("");

  const customerSearchResults = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return customers
      .filter((customer) =>
        [
          customer.customerNumber,
          customer.fullName,
          customer.address,
          customer.postcode,
          customer.mobilePhone,
          customer.homePhone,
        ].some((value) =>
          value.toLowerCase().includes(query),
        ),
      )
      .slice(0, 8);
  }, [customers, customerSearch]);

  const today = getTodayDateValue();

  const todayTreatments = useMemo(
    () =>
      treatments.filter(
        (treatment) =>
          treatment.completedDate === today ||
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

  const scheduledProgrammeVisits = useMemo(
    () =>
      programmes
        .flatMap((programme) =>
          programme.visits
            .filter(
              (visit) =>
                visit.scheduledDate === today &&
                (
                  visit.status === "Scheduled" ||
                  visit.status === "Planned"
                ),
            )
            .map((visit) => ({
              programme,
              visit,
              customer: customers.find(
                (customer) =>
                  customer.customerNumber ===
                  programme.customerNumber,
              ),
            }))
            .filter(
              (item) =>
                !item.customer ||
                !hasFinalRecordedOutcome(
                  treatments,
                  item.programme,
                  item.visit,
                  item.customer.customerNumber,
                ),
            ),
        )
        .filter(
          (item) =>
            item.customer?.status === "Active",
        ),
    [programmes, customers, treatments, today],
  );

  const scheduledAdditionalJobs = useMemo(
    () =>
      customers
        .filter(
          (customer) =>
            customer.status === "Active",
        )
        .flatMap((customer) =>
          (customer.additionalJobs ?? [])
            .filter(
              (job) =>
                job.status === "Scheduled" &&
                job.scheduledDate === today,
            ),
        ),
    [customers, today],
  );

  const remainingToday =
    scheduledProgrammeVisits.length +
    scheduledAdditionalJobs.length;
  const plannedToday =
    remainingToday + completedToday;

  const exceptionsToday = useMemo(
    () =>
      todayTreatments.filter(
        (treatment) =>
          treatment.status !== "Completed" &&
          treatment.status !== "Cancelled" &&
          treatment.status !== "Rescheduled" &&
          treatmentStillNeedsRescheduling(
            treatment,
            programmes,
            customers,
          ),
      ).length,
    [
      todayTreatments,
      programmes,
      customers,
    ],
  );
  const openActions = actions.filter(
    (action) => action.status === "Open",
  );

  const overdueActionCount = openActions.filter(
    (action) =>
      Boolean(action.dueDate) &&
      action.dueDate < today,
  ).length;

  const dueTodayActionCount = openActions.filter(
    (action) => action.dueDate === today,
  ).length;

  const reschedulingCount = treatments.filter(
    (treatment) =>
      treatmentStillNeedsRescheduling(
        treatment,
        programmes,
        customers,
      ),
  ).length;

  const unscheduledAdditionalJobCount = customers
    .filter((customer) => customer.status === "Active")
    .reduce(
      (total, customer) =>
        total +
        (customer.additionalJobs ?? []).filter(
          (job) => job.status === "Unscheduled",
        ).length,
      0,
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

          <section className="mt-4 rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#475569]">
                  Customers
                </p>

                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  Find Customer
                </h2>
              </div>

              <Link
                href="/customers"
                className="text-sm font-bold text-[#475569]"
              >
                All customers →
              </Link>
            </div>

            <input
              type="search"
              value={customerSearch}
              onChange={(event) =>
                setCustomerSearch(event.target.value)
              }
              placeholder="Name, number, postcode, address or phone"
              autoComplete="off"
              className="mt-4 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[#475569] focus:ring-2 focus:ring-slate-200"
            />

            {customerSearch.trim() && (
              <div className="mt-3 space-y-2">
                {!customersReady ? (
                  <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                    Loading customers…
                  </p>
                ) : customerSearchResults.length > 0 ? (
                  customerSearchResults.map((customer) => (
                    <Link
                      key={customer.customerNumber}
                      href={`/customers/${customer.customerNumber}`}
                      className="block rounded-xl border border-slate-200 bg-slate-50 p-3 transition active:bg-slate-100"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900">
                            {customer.fullName ||
                              `Customer ${customer.customerNumber}`}
                          </p>

                          <p className="mt-0.5 text-sm font-semibold text-slate-500">
                            Customer {customer.customerNumber}
                          </p>

                          {(customer.address ||
                            customer.postcode) && (
                            <p className="mt-1 text-sm text-slate-600">
                              {[customer.address, customer.postcode]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}
                        </div>

                        <span
                          aria-hidden="true"
                          className="shrink-0 text-lg font-bold text-[#475569]"
                        >
                          →
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                    No customers found.
                  </p>
                )}
              </div>
            )}
          </section>
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
          <section className="mt-4 rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">
                  Needs Attention
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  Things to deal with
                </h2>
              </div>

              <Link
                href="/actions"
                className="text-sm font-bold text-violet-700"
              >
                Action Centre →
              </Link>
            </div>

            {!actionsReady || !ready ? (
              <p className="mt-4 text-sm text-slate-500">
                Loading attention items…
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {overdueActionCount > 0 && (
                  <MobileAttentionItem
                    href="/actions"
                    title="Overdue customer actions"
                    count={overdueActionCount}
                    tone="danger"
                  />
                )}

                {dueTodayActionCount > 0 && (
                  <MobileAttentionItem
                    href="/actions"
                    title="Customer actions due today"
                    count={dueTodayActionCount}
                    tone="warning"
                  />
                )}

                {reschedulingCount > 0 && (
                  <MobileAttentionItem
                    href="/jobs?view=reschedule"
                    title="Visits needing rescheduling"
                    count={reschedulingCount}
                    tone="warning"
                  />
                )}

                {unscheduledAdditionalJobCount > 0 && (
                  <MobileAttentionItem
                    href="/additional-jobs"
                    title="Unscheduled Additional Jobs"
                    count={unscheduledAdditionalJobCount}
                    tone="information"
                  />
                )}

                {overdueActionCount === 0 &&
                  dueTodayActionCount === 0 &&
                  reschedulingCount === 0 &&
                  unscheduledAdditionalJobCount === 0 && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">
                      Nothing currently needs operational attention.
                    </div>
                  )}
              </div>
            )}
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
function treatmentStillNeedsRescheduling(
  treatment: ReturnType<
    typeof useTreatmentStore
  >["treatments"][number],
  programmes: ReturnType<
    typeof useProgrammeStore
  >["programmes"],
  customers: ReturnType<
    typeof useCustomerStore
  >["customers"],
) {
  return (
    treatment.status === "Needs Rescheduling" &&
    !replacementIsAlreadyScheduled(
      treatment,
      programmes,
      customers,
    )
  );
}

function replacementIsAlreadyScheduled(
  treatment: ReturnType<
    typeof useTreatmentStore
  >["treatments"][number],
  programmes: ReturnType<
    typeof useProgrammeStore
  >["programmes"],
  customers: ReturnType<
    typeof useCustomerStore
  >["customers"],
) {
  if (!isDateValue(treatment.nextVisitDate)) {
    return false;
  }

  if (
    treatment.jobType === "additional" ||
    treatment.programmeId.startsWith(
      "additional-jobs-",
    )
  ) {
    const customer = customers.find(
      (item) =>
        item.customerNumber ===
        treatment.customerNumber,
    );

    const job = customer?.additionalJobs.find(
      (item) =>
        item.id === treatment.programmeVisitId,
    );

    return Boolean(
      job &&
        job.status === "Scheduled" &&
        job.scheduledDate ===
          treatment.nextVisitDate,
    );
  }

  const programme = programmes.find(
    (item) =>
      item.id === treatment.programmeId &&
      item.customerNumber ===
        treatment.customerNumber,
  );

  const visit = programme?.visits.find(
    (item) =>
      item.id === treatment.programmeVisitId,
  );

  return Boolean(
    visit &&
      (
        visit.status === "Scheduled" ||
        visit.status === "Planned"
      ) &&
      visit.scheduledDate ===
        treatment.nextVisitDate,
  );
}

function isDateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
function hasFinalRecordedOutcome(
  treatments: ReturnType<
    typeof useTreatmentStore
  >["treatments"],
  programme: ReturnType<
    typeof useProgrammeStore
  >["programmes"][number],
  visit: ReturnType<
    typeof useProgrammeStore
  >["programmes"][number]["visits"][number],
  customerNumber: string,
) {
  return treatments.some(
    (treatment) => {
      const finalForThisDate =
        treatment.status === "Completed" ||
        treatment.status === "Cancelled" ||
        (
          treatment.status === "Rescheduled" &&
          treatment.scheduledDate ===
            visit.scheduledDate
        );

      if (!finalForThisDate) {
        return false;
      }

      return (
        (
          treatment.programmeId ===
            programme.id &&
          treatment.programmeVisitId ===
            visit.id
        ) ||
        (
          !treatment.programmeVisitId &&
          treatment.customerNumber ===
            customerNumber &&
          treatment.scheduledDate ===
            visit.scheduledDate &&
          treatment.treatmentName ===
            visit.treatmentName
        )
      );
    },
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
function MobileAttentionItem({
  href,
  title,
  count,
  tone,
}: {
  href: string;
  title: string;
  count: number;
  tone: "danger" | "warning" | "information";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-violet-200 bg-violet-50 text-violet-700";

  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${toneClass}`}
    >
      <span className="text-sm font-bold">
        {title}
      </span>

      <span className="min-w-8 rounded-full bg-white px-2.5 py-1 text-center text-sm font-black shadow-sm">
        {count}
      </span>
    </Link>
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
