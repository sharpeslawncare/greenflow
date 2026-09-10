"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import {
  type ActionPriority,
  type ActionStatus,
  type ActionType,
  useActionStore,
} from "@/components/action-store";
import { useCustomerStore } from "@/components/customer-store";
import {
  formatDateWithDay,
  getTodayDateValue,
} from "@/lib/date-utils";

const actionTypes: ActionType[] = [
  "Call back",
  "Quote follow-up",
  "Payment",
  "Access issue",
  "Programme change",
  "Customer request",
  "Other",
];

export default function ActionsPage() {
  const {
    actions,
    ready,
    addAction,
    completeAction,
    cancelAction,
    deleteAction,
  } = useActionStore();

  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const today = getTodayDateValue();

  const [statusFilter, setStatusFilter] =
    useState<
      "Open" | "Completed" | "All"
    >("Open");
  const [search, setSearch] =
    useState("");
  const [typeFilter, setTypeFilter] =
    useState<"All" | ActionType>(
      "All",
    );
  const [showNew, setShowNew] =
    useState(false);
  const [customerNumber, setCustomerNumber] =
    useState("");
  const [type, setType] =
    useState<ActionType>("Call back");
  const [priority, setPriority] =
    useState<ActionPriority>("Normal");
  const [dueDate, setDueDate] =
    useState(today);
  const [note, setNote] =
    useState("");

  const openActions = actions.filter(
    (action) =>
      action.status === "Open",
  );

  const overdue = openActions.filter(
    (action) =>
      Boolean(action.dueDate) &&
      action.dueDate < today,
  );

  const dueToday = openActions.filter(
    (action) =>
      action.dueDate === today,
  );

  const upcoming = openActions.filter(
    (action) =>
      Boolean(action.dueDate) &&
      action.dueDate > today,
  );

  const noDueDate = openActions.filter(
    (action) => !action.dueDate,
  );

  const filtered = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return [...actions]
      .filter((action) => {
        if (
          statusFilter !== "All" &&
          action.status !== statusFilter
        ) {
          return false;
        }

        if (
          typeFilter !== "All" &&
          action.type !== typeFilter
        ) {
          return false;
        }

        if (!query) return true;

        return [
          action.customerName,
          action.customerNumber,
          action.note,
          action.type,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        if (
          a.status === "Open" &&
          b.status !== "Open"
        ) {
          return -1;
        }

        if (
          a.status !== "Open" &&
          b.status === "Open"
        ) {
          return 1;
        }

        const aDate =
          a.dueDate || "9999-12-31";
        const bDate =
          b.dueDate || "9999-12-31";

        return aDate.localeCompare(
          bDate,
        );
      });
  }, [
    actions,
    search,
    statusFilter,
    typeFilter,
  ]);

  function saveAction() {
    const customer =
      customers.find(
        (item) =>
          item.customerNumber ===
          customerNumber,
      );

    if (!customer) return;
    if (!note.trim()) return;

    addAction({
      customerNumber:
        customer.customerNumber,
      customerName:
        customer.fullName,
      type,
      priority,
      status: "Open",
      dueDate,
      note: note.trim(),
    });

    setCustomerNumber("");
    setType("Call back");
    setPriority("Normal");
    setDueDate(today);
    setNote("");
    setShowNew(false);
  }

  if (!ready || !customersReady) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading Action Centre...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#176b37]">
                Customer follow-up
              </div>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                Action Centre
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Keep office follow-ups, access issues, payments and customer requests visible without mixing them into scheduled lawn-care jobs.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                ← Dashboard
              </Link>

              <button
                type="button"
                onClick={() => setShowNew(true)}
                className="inline-flex h-11 items-center rounded-xl bg-[#176b37] px-5 text-sm font-bold text-white hover:bg-[#125b2f]"
              >
                + New action
              </button>
            </div>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Overdue"
              value={overdue.length}
              detail="Need attention now"
              warning={overdue.length > 0}
            />
            <SummaryCard
              label="Due today"
              value={dueToday.length}
              detail="Due before the day is closed"
              warning={dueToday.length > 0}
            />
            <SummaryCard
              label="Upcoming"
              value={upcoming.length}
              detail="Future dated actions"
            />
            <SummaryCard
              label="Open actions"
              value={openActions.length}
              detail={
                noDueDate.length > 0
                  ? `${noDueDate.length} without a due date`
                  : "All open actions are dated"
              }
            />
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#176b37]">
                Action list
              </div>
              <h2 className="mt-1 text-lg font-bold text-slate-950">
                What needs attention?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Open actions are shown first and ordered by due date. Use the filters when you need completed history or a particular action type.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search customer or note..."
                className={inputClass}
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | "Open"
                      | "Completed"
                      | "All",
                  )
                }
                className={inputClass}
              >
                <option value="Open">
                  Open
                </option>
                <option value="Completed">
                  Completed
                </option>
                <option value="All">
                  All statuses
                </option>
              </select>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(
                    event.target.value as
                      | "All"
                      | ActionType,
                  )
                }
                className={inputClass}
              >
                <option value="All">
                  All action types
                </option>
                {actionTypes.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ),
                )}
              </select>
            </div>
          </section>

          <section className="mt-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                No actions match these filters.
              </div>
            ) : (
              filtered.map((action) => {
                const isOverdue =
                  action.status ===
                    "Open" &&
                  Boolean(
                    action.dueDate,
                  ) &&
                  action.dueDate <
                    today;

                return (
                  <article
                    key={action.id}
                    className={`rounded-2xl border bg-white p-5 shadow-sm ${
                      isOverdue
                        ? "border-red-300"
                        : action.priority ===
                            "Urgent"
                          ? "border-amber-300"
                          : "border-slate-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            status={
                              action.status
                            }
                          />
                          <PriorityBadge
                            priority={
                              action.priority
                            }
                          />
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            {action.type}
                          </span>
                          {isOverdue && (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                              Overdue
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <Link
                            href={`/customers/${action.customerNumber}`}
                            className="text-lg font-black text-slate-950 hover:text-[#176b37]"
                          >
                            {action.customerName ||
                              `Customer ${action.customerNumber}`}
                          </Link>
                          <span className="text-xs font-semibold text-slate-500">
                            #{action.customerNumber}
                          </span>
                        </div>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {action.note}
                        </p>

                        <div className="mt-3 text-xs font-semibold text-slate-500">
                          Due:{" "}
                          {action.dueDate
                            ? formatDateWithDay(
                                action.dueDate,
                              )
                            : "No date"}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {action.status ===
                          "Open" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                completeAction(
                                  action.id,
                                )
                              }
                              className="rounded-xl bg-[#176b37] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#125b2f]"
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                cancelAction(
                                  action.id,
                                )
                              }
                              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {action.status !==
                          "Open" && (
                          <button
                            type="button"
                            onClick={() =>
                              deleteAction(
                                action.id,
                              )
                            }
                            className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </div>

        {showNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    New customer action
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Add something that needs following up without creating a lawn-care job.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setShowNew(false)
                  }
                  className="text-2xl leading-none text-slate-400"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <Field label="Customer">
                  <select
                    value={
                      customerNumber
                    }
                    onChange={(event) =>
                      setCustomerNumber(
                        event.target
                          .value,
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="">
                      Select customer...
                    </option>
                    {[...customers]
                      .filter(
                        (customer) =>
                          customer.status ===
                          "Active",
                      )
                      .sort((a, b) =>
                        a.fullName.localeCompare(
                          b.fullName,
                        ),
                      )
                      .map(
                        (customer) => (
                          <option
                            key={
                              customer.customerNumber
                            }
                            value={
                              customer.customerNumber
                            }
                          >
                            {
                              customer.fullName
                            }{" "}
                            (#
                            {
                              customer.customerNumber
                            }
                            )
                          </option>
                        ),
                      )}
                  </select>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Action type">
                    <select
                      value={type}
                      onChange={(event) =>
                        setType(
                          event.target
                            .value as ActionType,
                        )
                      }
                      className={
                        inputClass
                      }
                    >
                      {actionTypes.map(
                        (item) => (
                          <option
                            key={item}
                            value={item}
                          >
                            {item}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field label="Priority">
                    <select
                      value={priority}
                      onChange={(event) =>
                        setPriority(
                          event.target
                            .value as ActionPriority,
                        )
                      }
                      className={
                        inputClass
                      }
                    >
                      <option value="Normal">
                        Normal
                      </option>
                      <option value="High">
                        High
                      </option>
                      <option value="Urgent">
                        Urgent
                      </option>
                    </select>
                  </Field>
                </div>

                <Field label="Due date">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) =>
                      setDueDate(
                        event.target.value,
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Action / note">
                  <textarea
                    value={note}
                    onChange={(event) =>
                      setNote(
                        event.target.value,
                      )
                    }
                    rows={5}
                    placeholder="What needs to be done?"
                    className={
                      inputClass
                    }
                  />
                </Field>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowNew(false)
                  }
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveAction}
                  disabled={
                    !customerNumber ||
                    !note.trim()
                  }
                  className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Save action
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#338b45] focus:ring-2 focus:ring-green-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: number;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        warning
          ? "border-amber-300 bg-amber-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`text-xs font-bold uppercase tracking-[0.12em] ${
          warning ? "text-amber-700" : "text-slate-500"
        }`}
      >
        {label}
      </div>
      <div
        className={`mt-2 text-2xl font-bold tracking-tight ${
          warning ? "text-amber-950" : "text-slate-950"
        }`}
      >
        {value}
      </div>
      <div
        className={`mt-1 text-xs ${
          warning ? "text-amber-800" : "text-slate-500"
        }`}
      >
        {detail}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: ActionStatus;
}) {
  const className =
    status === "Completed"
      ? "bg-green-100 text-green-800"
      : status === "Cancelled"
        ? "bg-slate-100 text-slate-600"
        : "bg-blue-100 text-blue-800";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${className}`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: ActionPriority;
}) {
  const className =
    priority === "Urgent"
      ? "bg-red-100 text-red-700"
      : priority === "High"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${className}`}
    >
      {priority}
    </span>
  );
}