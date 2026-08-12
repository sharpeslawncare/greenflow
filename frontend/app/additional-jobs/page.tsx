"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import {
  type AdditionalCustomerJob,
  type StoredCustomer,
  useCustomerStore,
} from "@/components/customer-store";
import {
  formatDateWithDay,
  getTodayDateValue,
} from "@/lib/date-utils";

type PlannerRow = {
  customer: StoredCustomer;
  job: AdditionalCustomerJob;
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

export default function AdditionalJobsPlannerPage() {
  const {
    customers,
    ready,
    updateCustomer,
  } = useCustomerStore();

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<string[]>([]);

  const [
    treatmentFilter,
    setTreatmentFilter,
  ] = useState("All");

  const [
    groupFilter,
    setGroupFilter,
  ] = useState(0);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    assignDate,
    setAssignDate,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const unscheduledRows =
    useMemo<PlannerRow[]>(
      () =>
        customers
          .flatMap((customer) =>
            customer.additionalJobs
              .filter(
                (job) =>
                  job.status ===
                    "Unscheduled",
              )
              .map((job) => ({
                customer,
                job,
              })),
          )
          .sort(
            (first, second) => {
              const treatment =
                first.job.treatmentName.localeCompare(
                  second.job.treatmentName,
                );

              if (treatment !== 0) {
                return treatment;
              }

              if (
                first.customer
                  .groupNumber !==
                second.customer
                  .groupNumber
              ) {
                return (
                  first.customer
                    .groupNumber -
                  second.customer
                    .groupNumber
                );
              }

              return first.customer.fullName.localeCompare(
                second.customer.fullName,
              );
            },
          ),
      [customers],
    );

  const treatmentNames =
    useMemo(
      () =>
        Array.from(
          new Set(
            unscheduledRows.map(
              (row) =>
                row.job.treatmentName,
            ),
          ),
        ).sort((first, second) =>
          first.localeCompare(second),
        ),
      [unscheduledRows],
    );

  const groupNumbers =
    useMemo(
      () =>
        Array.from(
          new Set(
            unscheduledRows.map(
              (row) =>
                row.customer.groupNumber,
            ),
          ),
        ).sort(
          (first, second) =>
            first - second,
        ),
      [unscheduledRows],
    );

  const filteredRows =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return unscheduledRows.filter(
        ({ customer, job }) => {
          if (
            treatmentFilter !== "All" &&
            job.treatmentName !==
              treatmentFilter
          ) {
            return false;
          }

          if (
            groupFilter > 0 &&
            customer.groupNumber !==
              groupFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            customer.fullName,
            customer.customerNumber,
            customer.address,
            customer.postcode,
            job.treatmentName,
            job.notes,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        },
      );
    }, [
      unscheduledRows,
      treatmentFilter,
      groupFilter,
      search,
    ]);

  const selectedRows =
    filteredRows.filter(
      (row) =>
        selectedIds.includes(
          row.job.id,
        ),
    );

  const allFilteredSelected =
    filteredRows.length > 0 &&
    filteredRows.every((row) =>
      selectedIds.includes(
        row.job.id,
      ),
    );

  const totalSelectedValue =
    selectedRows.reduce(
      (total, row) =>
        total + row.job.price,
      0,
    );

  function toggleRow(
    jobId: string,
  ) {
    setSelectedIds(
      (current) =>
        current.includes(jobId)
          ? current.filter(
              (id) => id !== jobId,
            )
          : [...current, jobId],
    );
  }

  function toggleAllFiltered() {
    if (allFilteredSelected) {
      const filteredIds =
        new Set(
          filteredRows.map(
            (row) => row.job.id,
          ),
        );

      setSelectedIds(
        (current) =>
          current.filter(
            (id) =>
              !filteredIds.has(id),
          ),
      );

      return;
    }

    setSelectedIds(
      (current) =>
        Array.from(
          new Set([
            ...current,
            ...filteredRows.map(
              (row) =>
                row.job.id,
            ),
          ]),
        ),
    );
  }

  function assignSelectedDate() {
    if (
      selectedRows.length === 0
    ) {
      setMessage(
        "Select at least one additional job.",
      );
      return;
    }

    if (
      !isDateValue(assignDate)
    ) {
      setMessage(
        "Choose a valid working date.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Assign ${selectedRows.length} additional job${
          selectedRows.length === 1
            ? ""
            : "s"
        } to ${formatDateWithDay(
          assignDate,
        )}?`,
      );

    if (!confirmed) {
      return;
    }

    const rowsByCustomer =
      new Map<
        string,
        PlannerRow[]
      >();

    for (
      const row of selectedRows
    ) {
      const existing =
        rowsByCustomer.get(
          row.customer
            .customerNumber,
        ) ?? [];

      existing.push(row);

      rowsByCustomer.set(
        row.customer
          .customerNumber,
        existing,
      );
    }

    let updatedJobs = 0;
    let failedCustomers = 0;

    for (
      const [
        customerNumber,
        rows,
      ] of rowsByCustomer
    ) {
      const currentCustomer =
        customers.find(
          (customer) =>
            customer.customerNumber ===
            customerNumber,
        );

      if (!currentCustomer) {
        failedCustomers += 1;
        continue;
      }

      const selectedJobIds =
        new Set(
          rows.map(
            (row) =>
              row.job.id,
          ),
        );

      const nextJobs =
        currentCustomer.additionalJobs.map(
          (job) =>
            selectedJobIds.has(
              job.id,
            )
              ? {
                  ...job,
                  scheduledDate:
                    assignDate,
                  status:
                    "Scheduled" as const,
                }
              : job,
        );

      const result =
        updateCustomer({
          ...currentCustomer,
          additionalJobs:
            nextJobs,
        });

      if (result.success) {
        updatedJobs +=
          rows.length;
      } else {
        failedCustomers += 1;
      }
    }

    setSelectedIds([]);
    setMessage(
      `${updatedJobs} additional job${
        updatedJobs === 1
          ? ""
          : "s"
      } scheduled for ${formatDateWithDay(
        assignDate,
      )}.${
        failedCustomers > 0
          ? ` ${failedCustomers} customer record${
              failedCustomers === 1
                ? ""
                : "s"
            } could not be updated.`
          : ""
      }`,
    );

    window.setTimeout(() => {
      setMessage("");
    }, 5000);
  }

  function clearFilters() {
    setTreatmentFilter("All");
    setGroupFilter(0);
    setSearch("");
  }

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading Additional Jobs Planner...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1650px]">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Additional Jobs Planner
              </h1>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Collect unscheduled extra services here, choose the customers you want to work together and assign them to a working day when you are ready.
              </p>
            </div>

            <Link
              href="/jobs"
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Open Jobs
            </Link>
          </header>

          {message && (
            <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Unscheduled jobs"
              value={String(
                unscheduledRows.length,
              )}
              detail="Waiting to be allocated"
            />

            <SummaryCard
              label="Selected"
              value={String(
                selectedRows.length,
              )}
              detail="Ready to schedule"
            />

            <SummaryCard
              label="Selected value"
              value={`£${totalSelectedValue.toFixed(
                2,
              )}`}
              detail="Agreed job prices"
            />

            <SummaryCard
              label="Treatment types"
              value={String(
                treatmentNames.length,
              )}
              detail="Outstanding services"
            />
          </section>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1.3fr_240px_180px_auto] lg:items-end">
              <Field label="Search">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Customer, number, address, postcode, treatment or notes"
                  className={inputClass}
                />
              </Field>

              <Field label="Treatment">
                <select
                  value={
                    treatmentFilter
                  }
                  onChange={(event) =>
                    setTreatmentFilter(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                >
                  <option value="All">
                    All treatments
                  </option>

                  {treatmentNames.map(
                    (name) => (
                      <option
                        key={name}
                        value={name}
                      >
                        {name}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Group">
                <select
                  value={groupFilter}
                  onChange={(event) =>
                    setGroupFilter(
                      Number(
                        event.target
                          .value,
                      ),
                    )
                  }
                  className={inputClass}
                >
                  <option value={0}>
                    All groups
                  </option>

                  {groupNumbers.map(
                    (group) => (
                      <option
                        key={group}
                        value={group}
                      >
                        Group {group}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear filters
              </button>
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="font-bold">
                    Unscheduled additional jobs
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {filteredRows.length} job
                    {filteredRows.length ===
                    1
                      ? ""
                      : "s"}{" "}
                    match the current filters.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    toggleAllFiltered
                  }
                  disabled={
                    filteredRows.length ===
                    0
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  {allFilteredSelected
                    ? "Clear visible selection"
                    : "Select all visible"}
                </button>
              </div>

              {filteredRows.length ===
              0 ? (
                <div className="p-12 text-center">
                  <div className="font-bold text-slate-800">
                    No unscheduled jobs match
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    Additional jobs booked without a date will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredRows.map(
                    ({
                      customer,
                      job,
                    }) => {
                      const selected =
                        selectedIds.includes(
                          job.id,
                        );

                      return (
                        <label
                          key={job.id}
                          className={`grid cursor-pointer gap-4 p-5 transition md:grid-cols-[34px_minmax(210px,1fr)_minmax(190px,0.8fr)_130px_110px] md:items-center ${
                            selected
                              ? "bg-green-50"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={
                              selected
                            }
                            onChange={() =>
                              toggleRow(
                                job.id,
                              )
                            }
                            className="h-5 w-5"
                          />

                          <div>
                            <Link
                              href={`/customers/${customer.customerNumber}?tab=additionalJobs`}
                              onClick={(
                                event,
                              ) =>
                                event.stopPropagation()
                              }
                              className="font-bold text-slate-900 hover:text-[#176b37] hover:underline"
                            >
                              {
                                customer.fullName
                              }
                            </Link>

                            <div className="mt-1 text-xs text-slate-500">
                              Customer{" "}
                              {
                                customer.customerNumber
                              }{" "}
                              · Group{" "}
                              {
                                customer.groupNumber
                              }{" "}
                              · Van{" "}
                              {
                                customer.vanNumber
                              }
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {
                                customer.address
                              }
                              ,{" "}
                              {
                                customer.postcode
                              }
                            </div>
                          </div>

                          <div>
                            <div className="font-semibold text-[#176b37]">
                              {
                                job.treatmentName
                              }
                            </div>

                            {job.notes && (
                              <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                {job.notes}
                              </div>
                            )}
                          </div>

                          <div className="text-sm">
                            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              Lawn
                            </div>

                            <div className="mt-1 font-semibold">
                              {customer.lawnSize.toLocaleString(
                                "en-GB",
                              )}{" "}
                              m²
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              Price
                            </div>

                            <div className="mt-1 font-bold">
                              £
                              {job.price.toFixed(
                                2,
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    },
                  )}
                </div>
              )}
            </div>

            <aside className="h-fit rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm xl:sticky xl:top-5">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
                Allocate selected jobs
              </div>

              <h2 className="mt-1 text-xl font-bold text-green-950">
                Assign working date
              </h2>

              <p className="mt-2 text-sm leading-6 text-green-800">
                Select the customers you want to group together, then choose the day you intend to carry out those additional jobs.
              </p>

              <div className="mt-5 rounded-xl border border-green-200 bg-white p-4">
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat
                    label="Jobs"
                    value={String(
                      selectedRows.length,
                    )}
                  />

                  <MiniStat
                    label="Value"
                    value={`£${totalSelectedValue.toFixed(
                      2,
                    )}`}
                  />
                </div>
              </div>

              <div className="mt-5">
                <Field label="Working date">
                  <input
                    type="date"
                    value={assignDate}
                    min={
                      getTodayDateValue()
                    }
                    onChange={(event) =>
                      setAssignDate(
                        event.target
                          .value,
                      )
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <button
                type="button"
                onClick={
                  assignSelectedDate
                }
                disabled={
                  selectedRows.length ===
                    0 ||
                  !isDateValue(
                    assignDate,
                  )
                }
                className="mt-5 w-full rounded-xl bg-[#176b37] px-5 py-3 text-sm font-bold text-white hover:bg-[#125b2f] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Schedule selected jobs
              </button>

              <p className="mt-3 text-xs leading-5 text-green-800">
                Scheduling here does not alter the customer&apos;s normal seasonal programme. These remain separate additional jobs.
              </p>
            </aside>
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
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold text-slate-950">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </div>
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
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-lg font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: import("react").ReactNode;
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

function isDateValue(
  value: string,
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}