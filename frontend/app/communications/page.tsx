"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";
import { useProgrammeStore } from "@/components/programme-store";
import { useTreatmentStore } from "@/components/treatment-store";
import { useSettingsStore } from "@/components/settings-store";
import {
  formatDateWithDay,
  getTodayDateValue,
} from "@/lib/date-utils";

type CommunicationChannel =
  | "SMS"
  | "Email"
  | "Telephone";

type CommunicationStatus =
  | "Queued"
  | "Sent"
  | "Failed"
  | "Cancelled";

type CommunicationRecord = {
  id: string;
  customerNumber: string;
  customerName: string;
  channel: CommunicationChannel;
  status: CommunicationStatus;
  subject: string;
  message: string;
  scheduledDate: string;
  treatmentName: string;
  jobType: "programme" | "additional";
  createdAt: string;
  sentAt: string;
};

type CommunicationsData = {
  records: CommunicationRecord[];
};

type UpcomingWork = {
  key: string;
  customerNumber: string;
  customerName: string;
  treatmentName: string;
  scheduledDate: string;
  jobType: "programme" | "additional";
  preferredContact: CommunicationChannel;
  destination: string;
};

const STORAGE_KEY =
  "greenflow-communications-v1";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#338b45] focus:ring-2 focus:ring-green-100";

export default function CommunicationsPage() {
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
    settings,
    ready: settingsReady,
  } = useSettingsStore();

  const [records, setRecords] =
    useState<CommunicationRecord[]>([]);

  const [recordsReady, setRecordsReady] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<
      "All" | CommunicationStatus
    >("All");

  const [customerFilter, setCustomerFilter] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [workingDate, setWorkingDate] =
    useState(() => getTomorrowDateValue());

  const [selectedKeys, setSelectedKeys] =
    useState<string[]>([]);

  useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem(
          STORAGE_KEY,
        );

      if (saved) {
        const parsed =
          JSON.parse(
            saved,
          ) as Partial<CommunicationsData>;

        if (
          Array.isArray(
            parsed.records,
          )
        ) {
          setRecords(
            parsed.records
              .map(normaliseRecord)
              .filter(
                (
                  record,
                ): record is CommunicationRecord =>
                  Boolean(record),
              ),
          );
        }
      }
    } catch {
      setRecords([]);
    }

    const params =
      new URLSearchParams(
        window.location.search,
      );

    const requestedCustomer =
      params.get("customer");

    const requestedDate =
      params.get("date");

    if (requestedCustomer) {
      setCustomerFilter(
        requestedCustomer,
      );
    }

    if (
      requestedDate &&
      isDateValue(requestedDate)
    ) {
      setWorkingDate(
        requestedDate,
      );
    }

    setRecordsReady(true);
  }, []);

  useEffect(() => {
    if (!recordsReady) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        records,
      } satisfies CommunicationsData),
    );
  }, [records, recordsReady]);

  const upcomingWork =
    useMemo(() => {
      const today =
        getTodayDateValue();

      const programmeWork =
        programmes.flatMap(
          (programme) => {
            const customer =
              customers.find(
                (record) =>
                  record.customerNumber ===
                  programme.customerNumber,
              );

            if (
              !customer ||
              customer.status !==
                "Active"
            ) {
              return [];
            }

            return programme.visits
              .filter(
                (visit) =>
                  visit.scheduledDate >=
                    today &&
                  (visit.status ===
                    "Scheduled" ||
                    visit.status ===
                      "Planned"),
              )
              .filter(
                (visit) =>
                  !hasFinalOutcome(
                    treatments,
                    programme.id,
                    visit.id,
                    customer.customerNumber,
                    visit.scheduledDate,
                    visit.treatmentName,
                  ),
              )
              .map(
                (
                  visit,
                ): UpcomingWork => ({
                  key: `programme-${programme.id}-${visit.id}`,
                  customerNumber:
                    customer.customerNumber,
                  customerName:
                    customer.fullName,
                  treatmentName:
                    visit.treatmentName,
                  scheduledDate:
                    visit.scheduledDate,
                  jobType:
                    "programme",
                  preferredContact:
                    normaliseChannel(
                      customer.preferredContact,
                    ),
                  destination:
                    getDestination(
                      customer,
                    ),
                }),
              );
          },
        );

      const additionalWork =
        customers.flatMap(
          (customer) => {
            if (
              customer.status !==
              "Active"
            ) {
              return [];
            }

            return (
              customer.additionalJobs ??
              []
            )
              .filter(
                (job) =>
                  job.status ===
                    "Scheduled" &&
                  job.scheduledDate >=
                    today,
              )
              .map(
                (
                  job,
                ): UpcomingWork => ({
                  key: `additional-${customer.customerNumber}-${job.id}`,
                  customerNumber:
                    customer.customerNumber,
                  customerName:
                    customer.fullName,
                  treatmentName:
                    job.treatmentName,
                  scheduledDate:
                    job.scheduledDate,
                  jobType:
                    "additional",
                  preferredContact:
                    normaliseChannel(
                      customer.preferredContact,
                    ),
                  destination:
                    getDestination(
                      customer,
                    ),
                }),
              );
          },
        );

      return [
        ...programmeWork,
        ...additionalWork,
      ].sort((first, second) =>
        first.scheduledDate.localeCompare(
          second.scheduledDate,
        ),
      );
    }, [
      customers,
      programmes,
      treatments,
    ]);

  const reminderCandidates =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return upcomingWork.filter(
        (item) => {
          const matchesCustomer =
            !customerFilter ||
            item.customerNumber ===
              customerFilter;

          const matchesSearch =
            !query ||
            [
              item.customerName,
              item.customerNumber,
              item.treatmentName,
              item.scheduledDate,
              item.jobType,
            ].some((value) =>
              value
                .toLowerCase()
                .includes(query),
            );

          return (
            matchesCustomer &&
            matchesSearch
          );
        },
      );
    }, [
      upcomingWork,
      search,
      customerFilter,
    ]);

  const dateCandidates =
    useMemo(
      () =>
        reminderCandidates.filter(
          (item) =>
            item.scheduledDate ===
            workingDate,
        ),
      [
        reminderCandidates,
        workingDate,
      ],
    );

  const selectableDateCandidates =
    useMemo(
      () =>
        dateCandidates.filter(
          (item) =>
            Boolean(
              item.destination,
            ) &&
            !hasExistingReminder(
              records,
              item,
            ),
        ),
      [
        dateCandidates,
        records,
      ],
    );

  const selectedDateCandidates =
    useMemo(
      () =>
        selectableDateCandidates.filter(
          (item) =>
            selectedKeys.includes(
              item.key,
            ),
        ),
      [
        selectableDateCandidates,
        selectedKeys,
      ],
    );

  useEffect(() => {
    setSelectedKeys((current) =>
      current.filter((key) =>
        selectableDateCandidates.some(
          (item) =>
            item.key === key,
        ),
      ),
    );
  }, [selectableDateCandidates]);

  const filteredRecords =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return [...records]
        .filter(
          (record) =>
            !customerFilter ||
            record.customerNumber ===
              customerFilter,
        )
        .filter(
          (record) =>
            statusFilter === "All" ||
            record.status ===
              statusFilter,
        )
        .filter(
          (record) =>
            !query ||
            [
              record.customerName,
              record.customerNumber,
              record.treatmentName,
              record.message,
              record.channel,
              record.status,
            ].some((value) =>
              value
                .toLowerCase()
                .includes(query),
            ),
        )
        .sort(
          (first, second) =>
            second.createdAt.localeCompare(
              first.createdAt,
            ),
        );
    }, [
      records,
      search,
      customerFilter,
      statusFilter,
    ]);

  const queuedCount =
    records.filter(
      (record) =>
        record.status ===
        "Queued",
    ).length;

  const sentCount =
    records.filter(
      (record) =>
        record.status ===
        "Sent",
    ).length;

  const ready =
    customersReady &&
    programmesReady &&
    treatmentsReady &&
    recordsReady;

  function toggleSelected(
    key: string,
  ) {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter(
            (item) => item !== key,
          )
        : [...current, key],
    );
  }

  function selectAllForDate() {
    setSelectedKeys(
      selectableDateCandidates.map(
        (item) => item.key,
      ),
    );
  }

  function clearSelection() {
    setSelectedKeys([]);
  }

  function queueSelectedReminders() {
    if (
      selectedDateCandidates.length ===
      0
    ) {
      showMessage(
        "Select at least one customer with a usable contact detail.",
      );
      return;
    }

    const createdAt =
      new Date().toISOString();

    const newRecords =
      selectedDateCandidates.map(
        (item): CommunicationRecord => ({
          id: createId(),
          customerNumber:
            item.customerNumber,
          customerName:
            item.customerName,
          channel:
            item.preferredContact,
          status: "Queued",
          subject:
            "Upcoming lawn treatment",
          message:
            createReminderMessage(
              item,
              settings.communications
                .visitReminderTemplate,
            ),
          scheduledDate:
            item.scheduledDate,
          treatmentName:
            item.treatmentName,
          jobType: item.jobType,
          createdAt,
          sentAt: "",
        }),
      );

    setRecords((current) => [
      ...newRecords,
      ...current,
    ]);

    setSelectedKeys([]);

    showMessage(
      `${newRecords.length} reminder${
        newRecords.length === 1
          ? ""
          : "s"
      } queued for ${formatDateWithDay(
        workingDate,
      )}.`,
    );
  }

  function queueReminder(
    item: UpcomingWork,
  ) {
    const alreadyQueued =
      hasExistingReminder(
        records,
        item,
      );

    if (alreadyQueued) {
      showMessage(
        "A reminder for this visit is already queued or sent.",
      );
      return;
    }

    const channel =
      item.preferredContact;

    const record: CommunicationRecord =
      {
        id: createId(),
        customerNumber:
          item.customerNumber,
        customerName:
          item.customerName,
        channel,
        status: "Queued",
        subject:
          "Upcoming lawn treatment",
        message:
          createReminderMessage(
                                  item,
                                  settings.communications
                                    .visitReminderTemplate,
                                ),
        scheduledDate:
          item.scheduledDate,
        treatmentName:
          item.treatmentName,
        jobType: item.jobType,
        createdAt:
          new Date().toISOString(),
        sentAt: "",
      };

    setRecords((current) => [
      record,
      ...current,
    ]);

    showMessage(
      `Reminder queued for ${item.customerName}.`,
    );
  }

  function updateStatus(
    id: string,
    status: CommunicationStatus,
  ) {
    setRecords((current) =>
      current.map((record) =>
        record.id === id
          ? {
              ...record,
              status,
              sentAt:
                status === "Sent"
                  ? new Date().toISOString()
                  : record.sentAt,
            }
          : record,
      ),
    );
  }

  async function copyMessage(
    record: CommunicationRecord,
  ) {
    try {
      await navigator.clipboard.writeText(
        record.message,
      );

      showMessage(
        "Message copied to clipboard.",
      );
    } catch {
      showMessage(
        "Could not copy automatically. Select the wording manually.",
      );
    }
  }

  function showMessage(
    value: string,
  ) {
    setMessage(value);

    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading communications...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1600px]">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#176b37]">
                Customer communications
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                Visit Notifications
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Prepare and track customer reminders from the work already scheduled in GreenFlow.
              </p>
            </div>

            <Link
              href="/jobs"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Open scheduled jobs
            </Link>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Upcoming work"
              value={String(
                reminderCandidates.length,
              )}
              detail="Matching scheduled visits"
            />

            <SummaryCard
              label="Queued"
              value={String(
                queuedCount,
              )}
              detail="Waiting to be contacted"
            />

            <SummaryCard
              label="Sent"
              value={String(
                sentCount,
              )}
              detail="Marked as sent"
            />

            <SummaryCard
              label="Customer filter"
              value={
                customerFilter ||
                "All"
              }
              detail={
                customerFilter
                  ? "Customer-specific view"
                  : "All active customers"
              }
            />
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto] md:items-end">
              <Field label="Search">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Customer, number or treatment"
                  className={inputClass}
                />
              </Field>

              <Field label="Customer">
                <select
                  value={
                    customerFilter
                  }
                  onChange={(event) =>
                    setCustomerFilter(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    All customers
                  </option>

                  {customers
                    .filter(
                      (customer) =>
                        customer.status ===
                        "Active",
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
                            customer.customerNumber
                          }{" "}
                          ·{" "}
                          {
                            customer.fullName
                          }
                        </option>
                      ),
                    )}
                </select>
              </Field>

              <Field label="History status">
                <select
                  value={
                    statusFilter
                  }
                  onChange={(event) =>
                    setStatusFilter(
                      event.target
                        .value as
                        | "All"
                        | CommunicationStatus,
                    )
                  }
                  className={inputClass}
                >
                  <option value="All">
                    All statuses
                  </option>
                  <option value="Queued">
                    Queued
                  </option>
                  <option value="Sent">
                    Sent
                  </option>
                  <option value="Failed">
                    Failed
                  </option>
                  <option value="Cancelled">
                    Cancelled
                  </option>
                </select>
              </Field>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCustomerFilter("");
                  setStatusFilter(
                    "All",
                  );
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
              >
                Clear filters
              </button>
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-green-200 bg-green-50/60 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-green-950">
                  Daily reminder batch
                </h2>
                <p className="mt-1 text-sm text-green-800">
                  Choose a working date, review the customers due that day, then queue the selected reminders together.
                </p>
              </div>

              <div className="min-w-[240px]">
                <Field label="Working date">
                  <input
                    type="date"
                    value={workingDate}
                    min={getTodayDateValue()}
                    onChange={(event) => {
                      setWorkingDate(
                        event.target.value,
                      );
                      setSelectedKeys([]);
                    }}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-white p-4">
              <div className="text-sm text-slate-700">
                <strong>{dateCandidates.length}</strong>{" "}
                scheduled ·{" "}
                <strong>{selectableDateCandidates.length}</strong>{" "}
                available to queue ·{" "}
                <strong>{selectedDateCandidates.length}</strong>{" "}
                selected
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectAllForDate}
                  disabled={
                    selectableDateCandidates.length ===
                    0
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Select all available
                </button>

                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={
                    selectedKeys.length ===
                    0
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear selection
                </button>

                <button
                  type="button"
                  onClick={
                    queueSelectedReminders
                  }
                  disabled={
                    selectedDateCandidates.length ===
                    0
                  }
                  className="rounded-lg bg-[#176b37] px-4 py-2 text-xs font-bold text-white hover:bg-[#125b2f] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Queue selected reminders
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {dateCandidates.length === 0 ? (
                <EmptyState>
                  No scheduled visits are due on {formatDateWithDay(workingDate)}.
                </EmptyState>
              ) : (
                dateCandidates.map((item) => {
                  const existing =
                    hasExistingReminder(
                      records,
                      item,
                    );

                  const missingContact =
                    !item.destination;

                  const selectable =
                    !existing &&
                    !missingContact;

                  return (
                    <label
                      key={item.key}
                      className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${
                        selectable
                          ? "cursor-pointer border-green-200 bg-white"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedKeys.includes(
                          item.key,
                        )}
                        disabled={!selectable}
                        onChange={() =>
                          toggleSelected(
                            item.key,
                          )
                        }
                        className="h-4 w-4 accent-[#176b37]"
                      />

                      <div className="min-w-[180px] flex-1">
                        <div className="font-bold text-slate-900">
                          {item.customerName}
                        </div>
                        <div className="text-xs text-slate-500">
                          Customer {item.customerNumber} · {item.treatmentName}
                        </div>
                      </div>

                      <WorkTypeBadge
                        type={item.jobType}
                      />

                      <div className="min-w-[180px] text-sm">
                        <span className="font-semibold">
                          {item.preferredContact}
                        </span>
                        <span className="text-slate-500">
                          {" · "}
                          {item.destination ||
                            "No contact detail"}
                        </span>
                      </div>

                      {existing ? (
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                          Already queued/sent
                        </span>
                      ) : missingContact ? (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                          Missing contact detail
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800">
                          Ready
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-lg font-bold">
                  Upcoming visits
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Programme visits and scheduled Additional Jobs that can be turned into reminders.
                </p>
              </div>

              <div className="max-h-[68vh] overflow-y-auto p-4">
                {reminderCandidates.length ===
                0 ? (
                  <EmptyState>
                    No upcoming scheduled work matches the current filters.
                  </EmptyState>
                ) : (
                  <div className="space-y-3">
                    {reminderCandidates.map(
                      (item) => {
                        const alreadyExists =
                          hasExistingReminder(
                            records,
                            item,
                          );

                        return (
                          <div
                            key={
                              item.key
                            }
                            className="rounded-xl border border-slate-200 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    href={`/customers/${item.customerNumber}`}
                                    className="font-bold text-slate-900 hover:text-[#176b37] hover:underline"
                                  >
                                    {
                                      item.customerName
                                    }
                                  </Link>

                                  <WorkTypeBadge
                                    type={
                                      item.jobType
                                    }
                                  />
                                </div>

                                <div className="mt-1 text-xs text-slate-500">
                                  Customer{" "}
                                  {
                                    item.customerNumber
                                  }{" "}
                                  ·{" "}
                                  {
                                    item.preferredContact
                                  }
                                  {item.destination
                                    ? ` · ${item.destination}`
                                    : " · No contact detail"}
                                </div>
                              </div>

                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                {formatDateWithDay(
                                  item.scheduledDate,
                                )}
                              </span>
                            </div>

                            <div className="mt-3 font-semibold">
                              {
                                item.treatmentName
                              }
                            </div>

                            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                              {createReminderMessage(
                                  item,
                                  settings.communications
                                    .visitReminderTemplate,
                                )}
                            </div>

                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                disabled={
                                  alreadyExists
                                }
                                onClick={() =>
                                  queueReminder(
                                    item,
                                  )
                                }
                                className={`rounded-lg px-3 py-2 text-xs font-bold ${
                                  alreadyExists
                                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                                    : "bg-[#176b37] text-white hover:bg-[#125b2f]"
                                }`}
                              >
                                {alreadyExists
                                  ? "Already queued/sent"
                                  : "Queue reminder"}
                              </button>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-lg font-bold">
                  Communication history
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Open the customer&apos;s SMS, email or telephone app directly, then mark the reminder sent once you have actually contacted them.
                </p>
              </div>

              <div className="max-h-[68vh] overflow-y-auto p-4">
                {filteredRecords.length ===
                0 ? (
                  <EmptyState>
                    No communication records match the current filters.
                  </EmptyState>
                ) : (
                  <div className="space-y-3">
                    {filteredRecords.map(
                      (record) => {
                        const customer =
                          customers.find(
                            (item) =>
                              item.customerNumber ===
                              record.customerNumber,
                          );

                        const contactDestination =
                          customer
                            ? getDestinationForChannel(
                                customer,
                                record.channel,
                              )
                            : "";

                        return (
                        <div
                          key={
                            record.id
                          }
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <Link
                                href={`/customers/${record.customerNumber}?tab=communications`}
                                className="font-bold hover:text-[#176b37] hover:underline"
                              >
                                {
                                  record.customerName
                                }
                              </Link>

                              <div className="mt-1 text-xs text-slate-500">
                                {
                                  record.channel
                                }{" "}
                                · Customer{" "}
                                {
                                  record.customerNumber
                                }{" "}
                                ·{" "}
                                {
                                  record.treatmentName
                                }
                              </div>
                            </div>

                            <StatusBadge
                              status={
                                record.status
                              }
                            />
                          </div>

                          <div className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                            {formatDateWithDay(
                              record.scheduledDate,
                            )}
                          </div>

                          <div className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                            {
                              record.message
                            }
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {record.status ===
                              "Queued" &&
                              contactDestination && (
                                <ContactAction
                                  record={record}
                                  destination={
                                    contactDestination
                                  }
                                />
                              )}

                            {record.status ===
                              "Queued" &&
                              !contactDestination && (
                                <span className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                                  Contact detail missing
                                </span>
                              )}

                            <button
                              type="button"
                              onClick={() =>
                                copyMessage(
                                  record,
                                )
                              }
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50"
                            >
                              Copy message
                            </button>

                            {record.status ===
                              "Queued" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateStatus(
                                      record.id,
                                      "Sent",
                                    )
                                  }
                                  className="rounded-lg bg-[#176b37] px-3 py-2 text-xs font-bold text-white hover:bg-[#125b2f]"
                                >
                                  Mark sent
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateStatus(
                                      record.id,
                                      "Cancelled",
                                    )
                                  }
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            </article>
          </section>

          <section className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            <strong>Stage 1:</strong>{" "}
            GreenFlow prepares and records the reminders, but it does not yet send SMS or email externally. That keeps the customer record accurate while we decide later whether you actually need an SMS/email provider integration.
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function hasExistingReminder(
  records: CommunicationRecord[],
  item: UpcomingWork,
) {
  return records.some(
    (record) =>
      record.customerNumber ===
        item.customerNumber &&
      record.scheduledDate ===
        item.scheduledDate &&
      record.treatmentName ===
        item.treatmentName &&
      record.jobType ===
        item.jobType &&
      (record.status ===
        "Queued" ||
        record.status === "Sent"),
  );
}

function isDateValue(
  value: string | null,
) {
  return Boolean(
    value &&
      /^\d{4}-\d{2}-\d{2}$/.test(
        value,
      ),
  );
}

function getTomorrowDateValue() {
  const today =
    getTodayDateValue();

  const [year, month, day] =
    today
      .split("-")
      .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day,
    );

  date.setDate(
    date.getDate() + 1,
  );

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(2, "0"),
    String(
      date.getDate(),
    ).padStart(2, "0"),
  ].join("-");
}

function createReminderMessage(
  item: UpcomingWork,
  template: string,
) {
  const firstName =
    item.customerName
      .trim()
      .split(/\s+/)[0] ||
    "there";

  const workDescription =
    item.jobType === "additional"
      ? item.treatmentName
      : "your scheduled lawn treatment";

  const fallbackTemplate =
    "Hi {firstName}, just a reminder that Sharpes Lawn Care is due to visit on {date} for {treatment}. Please make sure we can access the lawn. Many thanks, Rob - Sharpes Lawn Care";

  return (template.trim() || fallbackTemplate)
    .replaceAll(
      "{firstName}",
      firstName,
    )
    .replaceAll(
      "{date}",
      formatDateWithDay(
        item.scheduledDate,
      ),
    )
    .replaceAll(
      "{treatment}",
      workDescription,
    );
}

function getDestination(
  customer: {
    preferredContact?: string;
    mobilePhone?: string;
    homePhone?: string;
    email?: string;
  },
) {
  const channel =
    normaliseChannel(
      customer.preferredContact,
    );

  if (channel === "Email") {
    return customer.email ?? "";
  }

  if (channel === "Telephone") {
    return (
      customer.mobilePhone ||
      customer.homePhone ||
      ""
    );
  }

  return (
    customer.mobilePhone ?? ""
  );
}

function normaliseChannel(
  value: string | undefined,
): CommunicationChannel {
  if (value === "Email") {
    return "Email";
  }

  if (value === "Telephone") {
    return "Telephone";
  }

  return "SMS";
}

function normaliseRecord(
  value: unknown,
): CommunicationRecord | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const record =
    value as Partial<CommunicationRecord>;

  if (
    typeof record.id !==
      "string" ||
    typeof record.customerNumber !==
      "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    customerNumber:
      record.customerNumber,
    customerName:
      typeof record.customerName ===
      "string"
        ? record.customerName
        : "",
    channel:
      normaliseChannel(
        record.channel,
      ),
    status:
      isCommunicationStatus(
        record.status,
      )
        ? record.status
        : "Queued",
    subject:
      typeof record.subject ===
      "string"
        ? record.subject
        : "",
    message:
      typeof record.message ===
      "string"
        ? record.message
        : "",
    scheduledDate:
      typeof record.scheduledDate ===
      "string"
        ? record.scheduledDate
        : "",
    treatmentName:
      typeof record.treatmentName ===
      "string"
        ? record.treatmentName
        : "",
    jobType:
      record.jobType ===
      "additional"
        ? "additional"
        : "programme",
    createdAt:
      typeof record.createdAt ===
      "string"
        ? record.createdAt
        : new Date().toISOString(),
    sentAt:
      typeof record.sentAt ===
      "string"
        ? record.sentAt
        : "",
  };
}

function isCommunicationStatus(
  value: unknown,
): value is CommunicationStatus {
  return (
    value === "Queued" ||
    value === "Sent" ||
    value === "Failed" ||
    value === "Cancelled"
  );
}

function hasFinalOutcome(
  treatments: Array<{
    status: string;
    programmeId?: string;
    programmeVisitId?: string;
    customerNumber: string;
    scheduledDate: string;
    treatmentName: string;
  }>,
  programmeId: string,
  visitId: string,
  customerNumber: string,
  scheduledDate: string,
  treatmentName: string,
) {
  return treatments.some(
    (treatment) =>
      (treatment.status ===
        "Completed" ||
        treatment.status ===
          "Cancelled") &&
      ((treatment.programmeId ===
          programmeId &&
        treatment.programmeVisitId ===
          visitId) ||
        (!treatment.programmeVisitId &&
          treatment.customerNumber ===
            customerNumber &&
          treatment.scheduledDate ===
            scheduledDate &&
          treatment.treatmentName ===
            treatmentName)),
  );
}

function createId() {
  return `communication-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function getDestinationForChannel(
  customer: {
    mobilePhone?: string;
    homePhone?: string;
    email?: string;
  },
  channel: CommunicationChannel,
) {
  if (channel === "Email") {
    return customer.email ?? "";
  }

  if (channel === "Telephone") {
    return (
      customer.mobilePhone ||
      customer.homePhone ||
      ""
    );
  }

  return (
    customer.mobilePhone ?? ""
  );
}

function ContactAction({
  record,
  destination,
}: {
  record: CommunicationRecord;
  destination: string;
}) {
  if (record.channel === "Email") {
    const href = `mailto:${destination}?subject=${encodeURIComponent(
      record.subject ||
        "Upcoming lawn treatment",
    )}&body=${encodeURIComponent(
      record.message,
    )}`;

    return (
      <a
        href={href}
        className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100"
      >
        Open email
      </a>
    );
  }

  if (record.channel === "Telephone") {
    return (
      <a
        href={`tel:${normaliseTelephoneLink(
          destination,
        )}`}
        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
      >
        Call customer
      </a>
    );
  }

  const href = `sms:${normaliseTelephoneLink(
    destination,
  )}?body=${encodeURIComponent(
    record.message,
  )}`;

  return (
    <a
      href={href}
      className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-xs font-bold text-green-800 hover:bg-green-100"
    >
      Open SMS
    </a>
  );
}

function normaliseTelephoneLink(
  value: string,
) {
  return value.replace(
    /[^+\d]/g,
    "",
  );
}

function WorkTypeBadge({
  type,
}: {
  type: "programme" | "additional";
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
        type === "additional"
          ? "bg-amber-100 text-amber-800"
          : "bg-green-100 text-green-800"
      }`}
    >
      {type === "additional"
        ? "Additional"
        : "Programme"}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: CommunicationStatus;
}) {
  const styles =
    status === "Sent"
      ? "bg-green-100 text-green-800"
      : status === "Queued"
        ? "bg-blue-100 text-blue-800"
        : status === "Failed"
          ? "bg-red-100 text-red-800"
          : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}
    >
      {status}
    </span>
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
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 h-1.5 w-10 rounded-full bg-[#338b45]" />
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function EmptyState({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}