"use client";

import Link from "next/link";
import {
  type ReactNode,
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
  useProgrammeStore,
} from "@/components/programme-store";
import {
  formatDateWithDay,
  getTodayDateValue,
} from "@/lib/date-utils";

type PlannerTab =
  | "Unscheduled"
  | "Scheduled"
  | "Completed";

type PlannerRow = {
  key: string;
  customer: StoredCustomer;
  job: AdditionalCustomerJob;
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

export default function AdditionalJobsPlannerPage() {
  const {
    customers,
    ready: customersReady,
    updateCustomer,
  } = useCustomerStore();

  const {
    programmes,
    ready: programmesReady,
  } = useProgrammeStore();

  const [activeTab, setActiveTab] =
    useState<PlannerTab>("Unscheduled");

  const [
    selectedKeys,
    setSelectedKeys,
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
    vanFilter,
    setVanFilter,
  ] = useState(0);

  const [search, setSearch] =
    useState("");

  const [
    workingDate,
    setWorkingDate,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    messageTone,
    setMessageTone,
  ] = useState<
    "success" | "error"
  >("success");

  const allRows =
    useMemo<PlannerRow[]>(
      () =>
        customers.flatMap(
          (customer) =>
            customer.additionalJobs.map(
              (job) => ({
                key: `${customer.customerNumber}::${job.id}`,
                customer,
                job,
              }),
            ),
        ),
      [customers],
    );

  const unscheduledRows =
    useMemo(
      () =>
        sortPlannerRows(
          allRows.filter(
            ({ job }) =>
              job.status ===
              "Unscheduled",
          ),
          "Unscheduled",
        ),
      [allRows],
    );

  const scheduledRows =
    useMemo(
      () =>
        sortPlannerRows(
          allRows.filter(
            ({ job }) =>
              job.status ===
              "Scheduled",
          ),
          "Scheduled",
        ),
      [allRows],
    );

  const completedRows =
    useMemo(
      () =>
        sortPlannerRows(
          allRows.filter(
            ({ job }) =>
              job.status ===
              "Completed",
          ),
          "Completed",
        ),
      [allRows],
    );

  const activeRows =
    activeTab === "Unscheduled"
      ? unscheduledRows
      : activeTab ===
          "Scheduled"
        ? scheduledRows
        : completedRows;

  const treatmentNames =
    useMemo(
      () =>
        Array.from(
          new Set(
            allRows.map(
              ({ job }) =>
                job.treatmentName,
            ),
          ),
        )
          .filter(Boolean)
          .sort((first, second) =>
            first.localeCompare(
              second,
            ),
          ),
      [allRows],
    );

  const groupNumbers =
    useMemo(
      () =>
        Array.from(
          new Set(
            customers.map(
              (customer) =>
                customer.groupNumber,
            ),
          ),
        )
          .filter(
            (group) =>
              Number.isFinite(group) &&
              group > 0,
          )
          .sort(
            (first, second) =>
              first - second,
          ),
      [customers],
    );

  const vanNumbers =
    useMemo(
      () =>
        Array.from(
          new Set(
            customers.map(
              (customer) =>
                customer.vanNumber,
            ),
          ),
        )
          .filter(
            (van) =>
              Number.isFinite(van) &&
              van > 0,
          )
          .sort(
            (first, second) =>
              first - second,
          ),
      [customers],
    );

  const filteredRows =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return activeRows.filter(
        ({ customer, job }) => {
          if (
            treatmentFilter !==
              "All" &&
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

          if (
            vanFilter > 0 &&
            customer.vanNumber !==
              vanFilter
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
            `group ${customer.groupNumber}`,
            `van ${customer.vanNumber}`,
            job.treatmentName,
            job.notes,
            job.scheduledDate,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        },
      );
    }, [
      activeRows,
      treatmentFilter,
      groupFilter,
      vanFilter,
      search,
    ]);

  const selectable =
    activeTab !== "Completed";

  const selectedRows =
    selectable
      ? filteredRows.filter(
          (row) =>
            selectedKeys.includes(
              row.key,
            ),
        )
      : [];

  const allFilteredSelected =
    selectable &&
    filteredRows.length > 0 &&
    filteredRows.every((row) =>
      selectedKeys.includes(
        row.key,
      ),
    );

  const selectedValue =
    selectedRows.reduce(
      (total, row) =>
        total + row.job.price,
      0,
    );

  const unscheduledValue =
    unscheduledRows.reduce(
      (total, row) =>
        total + row.job.price,
      0,
    );

  const scheduledValue =
    scheduledRows.reduce(
      (total, row) =>
        total + row.job.price,
      0,
    );

  const completedValue =
    completedRows.reduce(
      (total, row) =>
        total + row.job.price,
      0,
    );

  const selectedDateAdditionalRows =
    useMemo(
      () =>
        workingDate
          ? scheduledRows.filter(
              ({ job }) =>
                job.scheduledDate ===
                workingDate,
            )
          : [],
      [
        scheduledRows,
        workingDate,
      ],
    );

  const selectedDateAdditionalValue =
    selectedDateAdditionalRows.reduce(
      (total, row) =>
        total + row.job.price,
      0,
    );

  const selectedDateProgrammeVisits =
    useMemo(() => {
      if (!workingDate) {
        return [];
      }

      return programmes.flatMap(
        (programme) =>
          programme.visits
            .filter(
              (visit) =>
                visit.scheduledDate ===
                  workingDate &&
                (visit.status ===
                  "Scheduled" ||
                  visit.status ===
                    "Planned"),
            )
            .map((visit) => ({
              customerNumber:
                programme.customerNumber,
              treatmentName:
                visit.treatmentName,
            })),
      );
    }, [
      programmes,
      workingDate,
    ]);

  const projectedAdditionalCount =
    workingDate
      ? selectedDateAdditionalRows.filter(
          (existingRow) =>
            !selectedRows.some(
              (selectedRow) =>
                selectedRow.key ===
                existingRow.key,
            ),
        ).length +
        selectedRows.length
      : 0;

  const projectedAdditionalValue =
    workingDate
      ? selectedDateAdditionalRows
          .filter(
            (existingRow) =>
              !selectedRows.some(
                (selectedRow) =>
                  selectedRow.key ===
                  existingRow.key,
              ),
          )
          .reduce(
            (total, row) =>
              total + row.job.price,
            0,
          ) + selectedValue
      : 0;

  const currentAdditionalWorkloadUnits =
    selectedDateAdditionalRows.reduce(
      (total, row) =>
        total +
        getAdditionalJobWorkloadUnits(
          row.job.treatmentName,
        ),
      0,
    );

  const projectedAdditionalWorkloadUnits =
    workingDate
      ? selectedDateAdditionalRows
          .filter(
            (existingRow) =>
              !selectedRows.some(
                (selectedRow) =>
                  selectedRow.key ===
                  existingRow.key,
              ),
          )
          .reduce(
            (total, row) =>
              total +
              getAdditionalJobWorkloadUnits(
                row.job.treatmentName,
              ),
            0,
          ) +
        selectedRows.reduce(
          (total, row) =>
            total +
            getAdditionalJobWorkloadUnits(
              row.job.treatmentName,
            ),
          0,
        )
      : 0;

  const ready =
    customersReady &&
    programmesReady;

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading additional jobs...
          </div>
        </main>
      </AppShell>
    );
  }

  function changeTab(
    tab: PlannerTab,
  ) {
    setActiveTab(tab);
    setSelectedKeys([]);
    setWorkingDate("");
    setMessage("");
  }

  function toggleRow(
    key: string,
  ) {
    if (!selectable) {
      return;
    }

    setSelectedKeys(
      (current) =>
        current.includes(key)
          ? current.filter(
              (item) =>
                item !== key,
            )
          : [...current, key],
    );
  }

  function toggleAllFiltered() {
    if (!selectable) {
      return;
    }

    const filteredKeys =
      new Set(
        filteredRows.map(
          (row) => row.key,
        ),
      );

    if (allFilteredSelected) {
      setSelectedKeys(
        (current) =>
          current.filter(
            (key) =>
              !filteredKeys.has(key),
          ),
      );
      return;
    }

    setSelectedKeys(
      (current) =>
        Array.from(
          new Set([
            ...current,
            ...filteredRows.map(
              (row) => row.key,
            ),
          ]),
        ),
    );
  }

  function clearFilters() {
    setTreatmentFilter("All");
    setGroupFilter(0);
    setVanFilter(0);
    setSearch("");
    setSelectedKeys([]);
  }

  function applyWorkingDate() {
    if (
      selectedRows.length === 0
    ) {
      showMessage(
        activeTab === "Scheduled"
          ? "Select at least one scheduled additional job to move."
          : "Select at least one unscheduled additional job.",
        "error",
      );
      return;
    }

    if (
      !isDateValue(
        workingDate,
      )
    ) {
      showMessage(
        "Choose a valid working date.",
        "error",
      );
      return;
    }

    if (
      workingDate <
      getTodayDateValue()
    ) {
      showMessage(
        "The working date cannot be in the past.",
        "error",
      );
      return;
    }

    const grouped =
      new Map<
        string,
        {
          customer: StoredCustomer;
          jobIds: Set<string>;
        }
      >();

    selectedRows.forEach(
      ({ customer, job }) => {
        const existing =
          grouped.get(
            customer.customerNumber,
          );

        if (existing) {
          existing.jobIds.add(
            job.id,
          );
          return;
        }

        grouped.set(
          customer.customerNumber,
          {
            customer,
            jobIds: new Set([
              job.id,
            ]),
          },
        );
      },
    );

    const failures: string[] =
      [];

    grouped.forEach(
      ({
        customer,
        jobIds,
      }) => {
        const updatedCustomer = {
          ...customer,
          additionalJobs:
            customer.additionalJobs.map(
              (job) =>
                jobIds.has(job.id)
                  ? {
                      ...job,
                      scheduledDate:
                        workingDate,
                      status:
                        "Scheduled" as const,
                    }
                  : job,
            ),
        };

        const result =
          updateCustomer(
            updatedCustomer,
          );

        if (
          result &&
          "success" in result &&
          !result.success
        ) {
          failures.push(
            result.message,
          );
        }
      },
    );

    if (
      failures.length > 0
    ) {
      showMessage(
        failures.join(" • "),
        "error",
      );
      return;
    }

    showMessage(
      activeTab ===
        "Scheduled"
        ? `${selectedRows.length} additional job${
            selectedRows.length === 1
              ? ""
              : "s"
          } moved to ${formatDateWithDay(
            workingDate,
          )}.`
        : `${selectedRows.length} additional job${
            selectedRows.length === 1
              ? ""
              : "s"
          } scheduled for ${formatDateWithDay(
            workingDate,
          )}.`,
      "success",
    );

    setSelectedKeys([]);
    setWorkingDate("");
  }

  function showMessage(
    text: string,
    tone:
      | "success"
      | "error" = "success",
  ) {
    setMessage(text);
    setMessageTone(tone);

    window.setTimeout(() => {
      setMessage("");
    }, 4200);
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1750px]">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link
                href="/jobs"
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Back to Jobs
              </Link>

              <h1 className="mt-2 text-3xl font-bold">
                Additional Jobs Planner
              </h1>

              <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-500">
                Plan Scarification, Aeration, Overseeding and future additional services separately from the five-treatment seasonal programme. Only scheduled jobs enter the daily Jobs, Routes and Visit Centre workflow.
              </p>
            </div>

            <Link
              href="/customers"
              className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold hover:bg-slate-50"
            >
              Open Customers
            </Link>
          </header>

          {message && (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                messageTone ===
                "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-green-200 bg-green-50 text-green-800"
              }`}
            >
              {message}
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Unscheduled"
              value={String(
                unscheduledRows.length,
              )}
              detail={`£${unscheduledValue.toFixed(
                2,
              )} waiting to allocate`}
              warning={
                unscheduledRows.length >
                0
              }
            />

            <SummaryCard
              label="Scheduled"
              value={String(
                scheduledRows.length,
              )}
              detail={`£${scheduledValue.toFixed(
                2,
              )} booked into working days`}
            />

            <SummaryCard
              label="Completed"
              value={String(
                completedRows.length,
              )}
              detail={`£${completedValue.toFixed(
                2,
              )} completed additional work`}
            />

            <SummaryCard
              label="Pipeline value"
              value={`£${(
                unscheduledValue +
                scheduledValue
              ).toFixed(2)}`}
              detail="Unscheduled + scheduled"
            />
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "Unscheduled",
                    "Scheduled",
                    "Completed",
                  ] as PlannerTab[]
                ).map((tab) => {
                  const count =
                    tab ===
                    "Unscheduled"
                      ? unscheduledRows.length
                      : tab ===
                          "Scheduled"
                        ? scheduledRows.length
                        : completedRows.length;

                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() =>
                        changeTab(tab)
                      }
                      className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                        activeTab === tab
                          ? "bg-[#176b37] text-white"
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {tab} · {count}
                    </button>
                  );
                })}
              </div>

              <div className="text-sm text-slate-500">
                {filteredRows.length} job
                {filteredRows.length ===
                1
                  ? ""
                  : "s"}{" "}
                shown
              </div>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_220px_160px_160px_auto] xl:items-end">
              <Field label="Search">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Customer, number, address, treatment or notes"
                  className={inputClass}
                />
              </Field>

              <Field label="Service">
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
                    All services
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

              <Field label="Van">
                <select
                  value={vanFilter}
                  onChange={(event) =>
                    setVanFilter(
                      Number(
                        event.target
                          .value,
                      ),
                    )
                  }
                  className={inputClass}
                >
                  <option value={0}>
                    All vans
                  </option>

                  {vanNumbers.map(
                    (van) => (
                      <option
                        key={van}
                        value={van}
                      >
                        Van {van}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <button
                type="button"
                onClick={clearFilters}
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-50"
              >
                Clear filters
              </button>
            </div>
          </section>

          {selectable && (
            <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Selected jobs
                    </div>

                    <div className="mt-1 text-2xl font-bold">
                      {selectedRows.length}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      £
                      {selectedValue.toFixed(
                        2,
                      )}{" "}
                      selected value
                    </div>
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
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {allFilteredSelected
                      ? "Clear visible"
                      : "Select visible"}
                  </button>
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <Field
                    label={
                      activeTab ===
                      "Scheduled"
                        ? "Move selected jobs to"
                        : "Assign selected jobs to"
                    }
                  >
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="date"
                        min={
                          getTodayDateValue()
                        }
                        value={
                          workingDate
                        }
                        onChange={(
                          event,
                        ) =>
                          setWorkingDate(
                            event.target
                              .value,
                          )
                        }
                        className={
                          inputClass
                        }
                      />

                      <button
                        type="button"
                        onClick={
                          applyWorkingDate
                        }
                        disabled={
                          selectedRows.length ===
                            0 ||
                          !workingDate
                        }
                        className="whitespace-nowrap rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#125b2f] disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {activeTab ===
                        "Scheduled"
                          ? "Move jobs"
                          : "Schedule jobs"}
                      </button>
                    </div>
                  </Field>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {activeTab ===
                    "Scheduled"
                      ? "Selected scheduled jobs keep their agreed price, notes and wording; only the working date changes."
                      : "Once scheduled, these jobs will appear in Jobs, Groups & Routes and Visit Centre for that working date."}
                  </p>
                </div>
              </div>

              <WorkloadCard
                date={workingDate}
                currentAdditionalCount={
                  selectedDateAdditionalRows.length
                }
                currentAdditionalValue={
                  selectedDateAdditionalValue
                }
                seasonalCount={
                  selectedDateProgrammeVisits.length
                }
                projectedAdditionalCount={
                  projectedAdditionalCount
                }
                projectedAdditionalValue={
                  projectedAdditionalValue
                }
                currentAdditionalWorkloadUnits={
                  currentAdditionalWorkloadUnits
                }
                projectedAdditionalWorkloadUnits={
                  projectedAdditionalWorkloadUnits
                }
                selectedCount={
                  selectedRows.length
                }
              />
            </section>
          )}

          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <div className="min-w-[1210px]">
                <div
                  className={`grid gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 ${
                    selectable
                      ? "grid-cols-[45px_95px_1.15fr_1fr_100px_100px_1.15fr_120px_135px]"
                      : "grid-cols-[95px_1.15fr_1fr_100px_100px_1.15fr_120px_135px]"
                  }`}
                >
                  {selectable && (
                    <span>Select</span>
                  )}
                  <span>Customer</span>
                  <span>Name / address</span>
                  <span>Service</span>
                  <span>Group</span>
                  <span>Van</span>
                  <span>
                    {activeTab ===
                    "Unscheduled"
                      ? "Booked"
                      : activeTab ===
                          "Scheduled"
                        ? "Working date"
                        : "Completed"}
                  </span>
                  <span>Price</span>
                  <span>Customer</span>
                </div>

                {filteredRows.length ===
                0 ? (
                  <div className="p-12 text-center">
                    <div className="font-bold">
                      No {activeTab.toLowerCase()} additional jobs found
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      Adjust the filters or add an additional job from a customer profile.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredRows.map(
                      (row) => (
                        <PlannerRowView
                          key={row.key}
                          row={row}
                          selectable={
                            selectable
                          }
                          selected={selectedKeys.includes(
                            row.key,
                          )}
                          onToggle={() =>
                            toggleRow(
                              row.key,
                            )
                          }
                          tab={activeTab}
                        />
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function PlannerRowView({
  row,
  selectable,
  selected,
  onToggle,
  tab,
}: {
  row: PlannerRow;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
  tab: PlannerTab;
}) {
  const {
    customer,
    job,
  } = row;

  return (
    <div
      className={`grid items-center gap-3 px-4 py-3 text-sm ${
        selectable
          ? "grid-cols-[45px_95px_1.15fr_1fr_100px_100px_1.15fr_120px_135px]"
          : "grid-cols-[95px_1.15fr_1fr_100px_100px_1.15fr_120px_135px]"
      } ${
        selected
          ? "bg-green-50"
          : "hover:bg-slate-50"
      }`}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${customer.fullName} ${job.treatmentName}`}
          className="h-4 w-4"
        />
      )}

      <Link
        href={`/customers/${customer.customerNumber}`}
        className="font-bold text-[#176b37] hover:underline"
      >
        {customer.customerNumber}
      </Link>

      <div>
        <div className="font-bold">
          {customer.fullName}
        </div>

        <div className="mt-1 truncate text-xs text-slate-500">
          {[customer.address, customer.postcode]
            .filter(Boolean)
            .join(", ") || "No address"}
        </div>
      </div>

      <div>
        <div className="font-semibold">
          {job.treatmentName}
        </div>

        {job.notes.trim() && (
          <div className="mt-1 truncate text-xs text-slate-500">
            {job.notes}
          </div>
        )}
      </div>

      <span>
        Group {customer.groupNumber}
      </span>

      <span>
        Van {customer.vanNumber}
      </span>

      <div>
        {tab === "Unscheduled" ? (
          <>
            <StatusPill
              status="Unscheduled"
            />
            <div className="mt-1 text-xs text-slate-500">
              {formatCreatedDate(
                job.createdAt,
              )}
            </div>
          </>
        ) : (
          <>
            <div className="font-semibold">
              {job.scheduledDate
                ? formatDateWithDay(
                    job.scheduledDate,
                  )
                : "No date"}
            </div>

            <div className="mt-1">
              <StatusPill
                status={job.status}
              />
            </div>
          </>
        )}
      </div>

      <div className="font-bold">
        £{job.price.toFixed(2)}
      </div>

      <Link
        href={`/customers/${customer.customerNumber}?tab=additionalJobs`}
        className="w-fit rounded-lg border border-[#338b45] px-3 py-2 text-xs font-semibold text-[#176b37] hover:bg-green-50"
      >
        Open customer
      </Link>
    </div>
  );
}

function WorkloadCard({
  date,
  currentAdditionalCount,
  currentAdditionalValue,
  seasonalCount,
  projectedAdditionalCount,
  projectedAdditionalValue,
  currentAdditionalWorkloadUnits,
  projectedAdditionalWorkloadUnits,
  selectedCount,
}: {
  date: string;
  currentAdditionalCount: number;
  currentAdditionalValue: number;
  seasonalCount: number;
  projectedAdditionalCount: number;
  projectedAdditionalValue: number;
  currentAdditionalWorkloadUnits: number;
  projectedAdditionalWorkloadUnits: number;
  selectedCount: number;
}) {
  if (!date) {
    return (
      <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Date workload
        </div>

        <h2 className="mt-2 text-xl font-bold">
          Choose a working date
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          GreenFlow will show the seasonal and additional-job workload already booked on that date before you commit the selected jobs.
        </p>
      </aside>
    );
  }

  const projectedTotalVisits =
    seasonalCount +
    projectedAdditionalCount;

  const projectedWorkloadUnits =
    seasonalCount +
    projectedAdditionalWorkloadUnits;

  const busy =
    projectedWorkloadUnits >= 40;

  const veryBusy =
    projectedWorkloadUnits >= 50;

  return (
    <aside
      className={`rounded-2xl border p-5 shadow-sm ${
        veryBusy
          ? "border-red-200 bg-red-50"
          : busy
            ? "border-amber-200 bg-amber-50"
            : "border-green-200 bg-green-50"
      }`}
    >
      <div
        className={`text-xs font-bold uppercase tracking-[0.14em] ${
          veryBusy
            ? "text-red-700"
            : busy
              ? "text-amber-700"
              : "text-green-700"
        }`}
      >
        Date workload
      </div>

      <h2 className="mt-2 text-xl font-bold">
        {formatDateWithDay(date)}
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <WorkloadMetric
          label="Seasonal visits"
          value={String(
            seasonalCount,
          )}
        />

        <WorkloadMetric
          label="Extras already booked"
          value={String(
            currentAdditionalCount,
          )}
          detail={`£${currentAdditionalValue.toFixed(
            2,
          )}`}
        />

        <WorkloadMetric
          label="Selected to add/move"
          value={String(
            selectedCount,
          )}
        />

        <WorkloadMetric
          label="Projected extras"
          value={String(
            projectedAdditionalCount,
          )}
          detail={`£${projectedAdditionalValue.toFixed(
            2,
          )}`}
        />

        <WorkloadMetric
          label="Projected workload"
          value={`${projectedWorkloadUnits} units`}
          detail={`Existing extras: ${currentAdditionalWorkloadUnits} units`}
        />
      </div>

      <div
        className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
          veryBusy
            ? "border-red-200 bg-white text-red-800"
            : busy
              ? "border-amber-200 bg-white text-amber-800"
              : "border-green-200 bg-white text-green-800"
        }`}
      >
        Projected: {projectedTotalVisits} visits ·{" "}
        {projectedWorkloadUnits} workload units
        {veryBusy
          ? " · Very busy day"
          : busy
            ? " · Busy day"
            : " · Workload looks manageable"}
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-600">
        Capacity is weighted rather than based on visit count alone. A normal programme visit is 1 unit, Aeration is 2, Scarification is 3, Overseeding is 2, and other additional jobs are 1. Busy starts at 40 workload units and Very busy at 50.
      </p>
    </aside>
  );
}

function WorkloadMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-white/80 bg-white p-3">
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-xl font-bold">
        {value}
      </div>

      {detail && (
        <div className="mt-1 text-xs text-slate-500">
          {detail}
        </div>
      )}
    </div>
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
    <article
      className={`rounded-2xl border p-4 shadow-sm ${
        warning
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`text-xs font-bold uppercase tracking-wide ${
          warning
            ? "text-amber-700"
            : "text-slate-500"
        }`}
      >
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

function StatusPill({
  status,
}: {
  status:
    | "Unscheduled"
    | "Scheduled"
    | "Completed"
    | "Cancelled";
}) {
  const styles =
    status === "Completed"
      ? "bg-green-100 text-green-800"
      : status ===
          "Scheduled"
        ? "bg-blue-100 text-blue-800"
        : status ===
            "Unscheduled"
          ? "bg-amber-100 text-amber-800"
          : "bg-slate-200 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${styles}`}
    >
      {status}
    </span>
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

function sortPlannerRows(
  rows: PlannerRow[],
  tab: PlannerTab,
) {
  return [...rows].sort(
    (first, second) => {
      if (
        tab !==
        "Unscheduled"
      ) {
        const dateComparison =
          (first.job.scheduledDate ||
            "").localeCompare(
            second.job
              .scheduledDate || "",
          );

        if (
          tab === "Scheduled" &&
          dateComparison !== 0
        ) {
          return dateComparison;
        }

        if (
          tab === "Completed" &&
          dateComparison !== 0
        ) {
          return -dateComparison;
        }
      }

      const treatment =
        first.job.treatmentName.localeCompare(
          second.job
            .treatmentName,
        );

      if (treatment !== 0) {
        return treatment;
      }

      if (
        first.customer.groupNumber !==
        second.customer.groupNumber
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
  );
}

function formatCreatedDate(
  value: string,
) {
  if (!value) {
    return "Booked date unavailable";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Booked date unavailable";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function isDateValue(
  value: string,
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}


function getAdditionalJobWorkloadUnits(
  treatmentName: string,
) {
  const normalised = treatmentName
    .trim()
    .toLowerCase();

  if (normalised.includes("scarif")) {
    return 3;
  }

  if (
    normalised.includes("aerat") ||
    normalised.includes("overseed")
  ) {
    return 2;
  }

  return 1;
}