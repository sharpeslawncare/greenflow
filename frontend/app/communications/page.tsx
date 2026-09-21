"use client";

import Link from "next/link";
import {
  type CSSProperties,
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
import { formatProgrammeTreatmentLabel } from "@/lib/programme-treatment-labels";

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
  mobilePhone: string;
  lockedGate: boolean;
  dogOnProperty: boolean;
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

  const [preparationWorkflow, setPreparationWorkflow] =
    useState(false);

  const [showAllCustomers, setShowAllCustomers] =
    useState(false);

  const [showAllAccessCustomers, setShowAllAccessCustomers] =
    useState(false);

  const [dayMessageTemplate, setDayMessageTemplate] =
    useState(
      "Hi {firstName}, unfortunately due to conditions we need to rearrange your lawn treatment scheduled for {date}. I’ll be in touch with a new date. Many thanks, Rob - Sharpes Lawn Care",
    );

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

    const requestedWorkflow =
      params.get("workflow");

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

    setPreparationWorkflow(
      requestedWorkflow === "prepare",
    );

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
                  mobilePhone:
                    customer.mobilePhone ?? "",
                  lockedGate:
                    Boolean(customer.lockedGate),
                  dogOnProperty:
                    Boolean(customer.dogOnProperty),
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
                  mobilePhone:
                    customer.mobilePhone ?? "",
                  lockedGate:
                    Boolean(customer.lockedGate),
                  dogOnProperty:
                    Boolean(customer.dogOnProperty),
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

  const accessAttentionCount =
    dateCandidates.filter(
      (item) =>
        item.lockedGate ||
        item.dogOnProperty,
    ).length;

  const accessCandidates =
    useMemo(
      () =>
        dateCandidates
          .filter(
            (item) =>
              item.lockedGate ||
              item.dogOnProperty,
          )
          .sort((first, second) =>
            first.customerName.localeCompare(
              second.customerName,
            ),
          ),
      [dateCandidates],
    );

  const accessContactedCount =
    accessCandidates.filter((item) =>
      hasSentReminder(records, item),
    ).length;

  const accessRemainingCount =
    accessCandidates.length -
    accessContactedCount;

  const dayRecords =
    useMemo(
      () =>
        records
          .filter(
            (record) =>
              record.scheduledDate ===
              workingDate,
          )
          .sort(
            (first, second) =>
              (second.sentAt ||
                second.createdAt).localeCompare(
                first.sentAt ||
                  first.createdAt,
              ),
          ),
      [records, workingDate],
    );

  const sentDayRecords =
    dayRecords.filter(
      (record) =>
        record.status === "Sent",
    );

  const scheduledCustomerCount =
    new Set(
      dateCandidates.map(
        (item) => item.customerNumber,
      ),
    ).size;

  const contactedCustomerCount =
    new Set(
      sentDayRecords.map(
        (record) =>
          record.customerNumber,
      ),
    ).size;

  const dealtWithForDateCount =
    dateCandidates.filter((item) =>
      hasExistingReminder(records, item),
    ).length;

  const missingContactForDateCount =
    dateCandidates.filter(
      (item) => !item.destination,
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

  function markManualContactSent(
    item: UpcomingWork,
    channel: "SMS" | "Telephone",
  ) {
    if (hasSentReminder(records, item)) {
      showMessage(
        `${item.customerName} is already marked contacted for this visit.`,
      );
      return;
    }

    const record: CommunicationRecord = {
      id: createId(),
      customerNumber:
        item.customerNumber,
      customerName:
        item.customerName,
      channel,
      status: "Sent",
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
      sentAt:
        new Date().toISOString(),
    };

    setRecords((current) => [
      record,
      ...current,
    ]);

    showMessage(
      `${item.customerName} marked contacted.`,
    );
  }

  function markDayMessageSent(
    item: UpcomingWork,
    sentMessage: string,
  ) {
    const record: CommunicationRecord = {
      id: createId(),
      customerNumber:
        item.customerNumber,
      customerName:
        item.customerName,
      channel: "SMS",
      status: "Sent",
      subject:
        "Working day update",
      message: sentMessage,
      scheduledDate:
        item.scheduledDate,
      treatmentName:
        item.treatmentName,
      jobType: item.jobType,
      createdAt:
        new Date().toISOString(),
      sentAt:
        new Date().toISOString(),
    };

    setRecords((current) => [
      record,
      ...current,
    ]);

    showMessage(
      `${item.customerName} marked contacted for this working day.`,
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
        <main
          className="gf-page"
          style={
            {
              "--gf-page-accent": "#475569",
            } as CSSProperties
          }
        >
          <div className="gf-page-inner">
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
              Loading communications...
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  const visibleAccessCandidates =
    showAllAccessCustomers
      ? accessCandidates
      : accessCandidates.slice(0, 5);

  const stillToContactCount =
    Math.max(
      0,
      scheduledCustomerCount -
        contactedCustomerCount,
    );

  return (
    <AppShell>
      <main
        className="gf-page"
        style={
          {
            "--gf-page-accent": "#475569",
          } as CSSProperties
        }
      >
        <div className="gf-page-inner">
          <header className="gf-page-header">
            <div className="gf-page-header-copy">
              <div className="gf-eyebrow">
                Customer communications
              </div>
              <h1 className="gf-h1">
                Contact customers
              </h1>
              <p className="gf-page-description">
                Get in touch with customers scheduled for this working day, confirm access and keep everyone informed.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <label className="block min-w-[245px] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Working date
                </span>
                <input
                  type="date"
                  value={workingDate}
                  min={getTodayDateValue()}
                  onChange={(event) => {
                    setWorkingDate(
                      event.target.value,
                    );
                    setSelectedKeys([]);
                    setShowAllAccessCustomers(false);
                  }}
                  className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-bold text-slate-950 outline-none"
                />
              </label>

              <Link
                href={`/?date=${workingDate}`}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                ← Dashboard
              </Link>
            </div>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          {preparationWorkflow && (
            <section className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-green-200 bg-green-50/70 px-5 py-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-green-700">
                  Prepare the working day · Step 1 of 3
                </div>
                <div className="mt-1 font-bold text-green-950">
                  Contact customers who need access arranged, then continue to the saved route.
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="rounded-full bg-[#176b37] px-3 py-1.5 text-white">
                  1 Contact
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-slate-500">
                  2 Route
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-slate-500">
                  3 Print
                </span>
              </div>
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PolishedSummaryCard
              symbol="▣"
              label="Scheduled"
              value={String(
                scheduledCustomerCount,
              )}
              detail="Customers on this working day"
              tone="green"
            />

            <PolishedSummaryCard
              symbol="!"
              label="Need access contact"
              value={String(
                accessRemainingCount,
              )}
              detail={`${accessAttentionCount} access alert${
                accessAttentionCount === 1
                  ? ""
                  : "s"
              } in total`}
              tone={
                accessRemainingCount > 0
                  ? "red"
                  : "green"
              }
            />

            <PolishedSummaryCard
              symbol="✓"
              label="Messages sent"
              value={String(
                contactedCustomerCount,
              )}
              detail="Customers marked contacted"
              tone="green"
            />

            <PolishedSummaryCard
              symbol="→"
              label="Still to contact"
              value={String(
                stillToContactCount,
              )}
              detail={`Out of ${scheduledCustomerCount} scheduled`}
              tone="slate"
            />
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-100 bg-rose-50/70 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-lg font-black text-rose-700">
                  !
                </div>

                <div>
                  <h2 className="gf-h2">
                    Access contact required
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-600">
                    These customers have a gate or property access alert. Contact them before the visit.
                  </p>
                </div>
              </div>

              <div className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700">
                {accessCandidates.length} customer{accessCandidates.length === 1 ? "" : "s"}
              </div>
            </div>

            {accessCandidates.length === 0 ? (
              <div className="p-4">
                <EmptyState>
                  No customers with gate or access alerts are due on {formatDateWithDay(workingDate)}.
                </EmptyState>
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[minmax(180px,1.2fr)_minmax(180px,1fr)_minmax(170px,1fr)_minmax(150px,0.9fr)_minmax(390px,1.8fr)] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 lg:grid">
                  <div>Customer</div>
                  <div>Contact</div>
                  <div>Today&apos;s treatment</div>
                  <div>Access issue</div>
                  <div>Actions</div>
                </div>

                <div className="divide-y divide-slate-100">
                  {visibleAccessCandidates.map(
                    (item) => {
                      const contacted =
                        hasSentReminder(
                          records,
                          item,
                        );
                      const mobile =
                        item.mobilePhone.trim();
                      const reminderMessage =
                        createReminderMessage(
                          item,
                          settings.communications
                            .visitReminderTemplate,
                        );

                      return (
                        <article
                          key={item.key}
                          className={`grid gap-3 px-4 py-4 lg:grid-cols-[minmax(180px,1.2fr)_minmax(180px,1fr)_minmax(170px,1fr)_minmax(150px,0.9fr)_minmax(390px,1.8fr)] lg:items-center ${
                            contacted
                              ? "bg-green-50/40"
                              : "bg-white"
                          }`}
                        >
                          <div className="min-w-0">
                            <Link
                              href={`/customers/${item.customerNumber}`}
                              className="font-bold text-slate-950 hover:text-[#176b37] hover:underline"
                            >
                              {item.customerName}
                            </Link>
                            <div className="mt-1 text-xs text-slate-500">
                              Customer {item.customerNumber}
                            </div>
                          </div>

                          <div className="text-sm text-slate-600">
                            {mobile || "No mobile number"}
                          </div>

                          <div className="text-sm font-semibold text-slate-800">
                            {formatProgrammeTreatmentLabel(
                              item.treatmentName,
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {item.lockedGate && (
                              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
                                Locked gate
                              </span>
                            )}

                            {item.dogOnProperty && (
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                                Dog on property
                              </span>
                            )}
                          </div>

                          <div className="grid gap-2 sm:grid-cols-3">
                            {mobile ? (
                              <>
                                <a
                                  href={createWhatsAppLink(
                                    mobile,
                                    reminderMessage,
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex min-h-10 items-center justify-center rounded-xl bg-[#176b37] px-3 py-2 text-center text-xs font-bold text-white transition hover:bg-[#125b2f]"
                                >
                                  Open WhatsApp
                                </a>

                                <a
                                  href={createSmsLink(
                                    mobile,
                                    reminderMessage,
                                  )}
                                  className="flex min-h-10 items-center justify-center rounded-xl border border-green-300 bg-white px-3 py-2 text-center text-xs font-bold text-green-800 transition hover:bg-green-50"
                                >
                                  Open SMS
                                </a>
                              </>
                            ) : (
                              <Link
                                href={`/customers/${item.customerNumber}`}
                                className="flex min-h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-xs font-bold text-rose-700"
                              >
                                Add mobile
                              </Link>
                            )}

                            <button
                              type="button"
                              disabled={contacted}
                              onClick={() =>
                                markManualContactSent(
                                  item,
                                  "SMS",
                                )
                              }
                              className={`min-h-10 rounded-xl px-3 py-2 text-xs font-bold transition ${
                                contacted
                                  ? "cursor-not-allowed border border-green-200 bg-green-50 text-green-700"
                                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {contacted
                                ? "✓ Contacted"
                                : "Mark contacted"}
                            </button>
                          </div>
                        </article>
                      );
                    },
                  )}
                </div>

                {accessCandidates.length > 5 && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowAllAccessCustomers(
                        (current) =>
                          !current,
                      )
                    }
                    className="flex w-full items-center justify-between border-t border-slate-100 bg-white px-5 py-3 text-sm font-bold text-[#176b37] hover:bg-green-50"
                  >
                    <span>
                      {showAllAccessCustomers
                        ? "Show fewer customers"
                        : `Show ${accessCandidates.length - 5} more customer${
                            accessCandidates.length - 5 === 1
                              ? ""
                              : "s"
                          }`}
                    </span>
                    <span aria-hidden="true">
                      {showAllAccessCustomers
                        ? "↑"
                        : "↓"}
                    </span>
                  </button>
                )}
              </>
            )}
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-green-200 bg-green-50/40 shadow-sm">
            <button
              type="button"
              onClick={() =>
                setShowAllCustomers(
                  (current) => !current,
                )
              }
              className="flex w-full flex-wrap items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-green-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg font-black text-green-800">
                  +
                </div>

                <div>
                  <h2 className="gf-h2">
                    Contact everyone on this working day
                  </h2>
                  <p className="mt-0.5 text-sm leading-6 text-slate-600">
                    Need to rearrange because of frozen ground, high winds or another issue? Expand this section to contact all {scheduledCustomerCount} scheduled customer{scheduledCustomerCount === 1 ? "" : "s"}.
                  </p>
                </div>
              </div>

              <span className="text-lg font-black text-green-800">
                {showAllCustomers
                  ? "↑"
                  : "↓"}
              </span>
            </button>

            {showAllCustomers && (
              <div className="border-t border-green-200 bg-white p-5">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wide text-blue-800">
                      Message to use
                    </span>
                    <textarea
                      rows={4}
                      value={dayMessageTemplate}
                      onChange={(event) =>
                        setDayMessageTemplate(
                          event.target.value,
                        )
                      }
                      className={`${inputClass} mt-2 bg-white`}
                    />
                  </label>

                  <p className="mt-2 text-xs leading-5 text-blue-800">
                    You can use {"{firstName}"}, {"{date}"} and {"{treatment}"}. GreenFlow prepares each message, but you still send it yourself.
                  </p>
                </div>

                {dateCandidates.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState>
                      No customers are scheduled for {formatDateWithDay(workingDate)}.
                    </EmptyState>
                  </div>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {[...dateCandidates]
                      .sort((first, second) =>
                        first.customerName.localeCompare(
                          second.customerName,
                        ),
                      )
                      .map((item) => {
                        const mobile =
                          item.mobilePhone.trim();
                        const preparedMessage =
                          createReminderMessage(
                            item,
                            dayMessageTemplate,
                          );

                        return (
                          <article
                            key={`all-${item.key}`}
                            className="grid gap-3 bg-white p-4 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1.3fr)_minmax(420px,1.6fr)] lg:items-center"
                          >
                            <div>
                              <Link
                                href={`/customers/${item.customerNumber}`}
                                className="font-bold text-slate-950 hover:text-[#176b37] hover:underline"
                              >
                                {item.customerName}
                              </Link>

                              <div className="mt-1 text-xs text-slate-500">
                                Customer {item.customerNumber} · {formatProgrammeTreatmentLabel(item.treatmentName)}
                              </div>
                            </div>

                            <div className="text-sm text-slate-600">
                              {mobile || "No mobile number"}
                            </div>

                            <div className="grid gap-2 sm:grid-cols-3">
                              {mobile ? (
                                <>
                                  <a
                                    href={createWhatsAppLink(
                                      mobile,
                                      preparedMessage,
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex min-h-10 items-center justify-center rounded-xl bg-[#176b37] px-3 py-2 text-xs font-bold text-white hover:bg-[#125b2f]"
                                  >
                                    WhatsApp
                                  </a>

                                  <a
                                    href={createSmsLink(
                                      mobile,
                                      preparedMessage,
                                    )}
                                    className="flex min-h-10 items-center justify-center rounded-xl border border-green-300 bg-white px-3 py-2 text-xs font-bold text-green-800 hover:bg-green-50"
                                  >
                                    SMS
                                  </a>
                                </>
                              ) : (
                                <Link
                                  href={`/customers/${item.customerNumber}`}
                                  className="flex min-h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                                >
                                  Add mobile
                                </Link>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  markDayMessageSent(
                                    item,
                                    preparedMessage,
                                  )
                                }
                                className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                              >
                                Mark sent
                              </button>
                            </div>
                          </article>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg font-black text-green-800">
                  ✓
                </div>

                <div>
                  <h2 className="gf-h2">
                    Messages for this day
                  </h2>
                  <p className="mt-0.5 text-sm leading-6 text-slate-500">
                    A clear record of messages linked to {formatDateWithDay(workingDate)}.
                  </p>
                </div>
              </div>

              <div className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-800">
                {sentDayRecords.length} sent
              </div>
            </div>

            {dayRecords.length === 0 ? (
              <div className="p-4">
                <EmptyState>
                  No messages have been recorded for this working day yet.
                </EmptyState>
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[90px_minmax(180px,1fr)_120px_minmax(360px,2fr)_120px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 lg:grid">
                  <div>Time</div>
                  <div>Customer</div>
                  <div>Method</div>
                  <div>Message</div>
                  <div>Status</div>
                </div>

                <div className="divide-y divide-slate-100">
                  {dayRecords.map(
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
                        <article
                          key={record.id}
                          className="grid gap-3 px-4 py-3 lg:grid-cols-[90px_minmax(180px,1fr)_120px_minmax(360px,2fr)_120px] lg:items-center"
                        >
                          <div className="text-xs font-semibold text-slate-500">
                            {record.sentAt
                              ? formatTime(
                                  record.sentAt,
                                )
                              : "—"}
                          </div>

                          <div>
                            <Link
                              href={`/customers/${record.customerNumber}?tab=communications`}
                              className="font-bold text-slate-950 hover:text-[#176b37] hover:underline"
                            >
                              {record.customerName}
                            </Link>
                            <div className="mt-0.5 text-xs text-slate-500">
                              #{record.customerNumber}
                            </div>
                          </div>

                          <div>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                                record.channel === "SMS"
                                  ? "bg-blue-100 text-blue-800"
                                  : record.channel === "Email"
                                    ? "bg-violet-100 text-violet-800"
                                    : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {record.channel}
                            </span>
                          </div>

                          <div className="min-w-0 text-sm leading-6 text-slate-700">
                            <div className="line-clamp-2">
                              {record.message}
                            </div>

                            {record.status ===
                              "Queued" && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {contactDestination && (
                                    <ContactAction
                                      record={record}
                                      destination={
                                        contactDestination
                                      }
                                    />
                                  )}

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
                                      copyMessage(
                                        record,
                                      )
                                    }
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50"
                                  >
                                    Copy
                                  </button>
                                </div>
                              )}
                          </div>

                          <div>
                            <StatusBadge
                              status={record.status}
                            />
                          </div>
                        </article>
                      );
                    },
                  )}
                </div>
              </>
            )}
          </section>

          <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-green-200 bg-green-50/60 px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg font-black text-green-800">
                →
              </div>

              <div>
                <h2 className="font-bold text-green-950">
                  Next steps
                </h2>
                <p className="mt-0.5 text-sm text-green-800">
                  Once the customers who need contact are dealt with, continue with the working day.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/routes?date=${workingDate}${preparationWorkflow ? "&workflow=prepare" : ""}`}
                className="rounded-xl border border-green-400 bg-white px-4 py-2.5 text-sm font-bold text-green-800 hover:bg-green-50"
              >
                View route
              </Link>

              <Link
                href={`/jobs?date=${workingDate}`}
                className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#125b2f]"
              >
                Open day&apos;s jobs
              </Link>
            </div>
          </section>

          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <span className="font-bold">Tip:</span>{" "}
            You can still contact an individual customer directly from their customer account when needed.
          </div>
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

function hasSentReminder(
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
      record.status === "Sent",
  );
}

function createWhatsAppLink(
  mobilePhone: string,
  message: string,
) {
  const number =
    normaliseWhatsAppNumber(
      mobilePhone,
    );

  return `https://wa.me/${number}?text=${encodeURIComponent(
    message,
  )}`;
}

function createSmsLink(
  mobilePhone: string,
  message: string,
) {
  return `sms:${normaliseTelephoneLink(
    mobilePhone,
  )}?body=${encodeURIComponent(
    message,
  )}`;
}

function normaliseWhatsAppNumber(
  value: string,
) {
  const digits =
    value.replace(/\D/g, "");

  if (digits.startsWith("44")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `44${digits.slice(1)}`;
  }

  return digits;
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

function formatTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function formatDateTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
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

function WorkflowProgressCard({
  number,
  title,
  state,
}: {
  number: string;
  title: string;
  state: "done" | "current" | "later";
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        state === "done"
          ? "border-green-200 bg-green-50"
          : state === "current"
            ? "border-[#338b45] bg-green-50"
            : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
            state === "done"
              ? "bg-[#176b37] text-white"
              : state === "current"
                ? "bg-[#176b37] text-white"
                : "bg-slate-200 text-slate-600"
          }`}
        >
          {state === "done" ? "✓" : number}
        </span>
        <div>
          <div className="text-sm font-bold text-slate-950">{title}</div>
          <div className="mt-0.5 text-xs font-semibold text-slate-500">
            {state === "done" ? "Done" : state === "current" ? "Current step" : "Next"}
          </div>
        </div>
      </div>
    </div>
  );
}

function PolishedSummaryCard({
  symbol,
  label,
  value,
  detail,
  tone,
}: {
  symbol: string;
  label: string;
  value: string;
  detail: string;
  tone: "green" | "red" | "slate";
}) {
  const symbolClass =
    tone === "red"
      ? "bg-rose-100 text-rose-700"
      : tone === "green"
        ? "bg-green-100 text-green-800"
        : "bg-slate-100 text-slate-700";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-black ${symbolClass}`}
        >
          {symbol}
        </div>

        <div className="min-w-0">
          <div className="text-2xl font-black tracking-tight text-slate-950">
            {value}
          </div>
          <div className="text-sm font-bold text-slate-800">
            {label}
          </div>
          <div className="mt-0.5 text-xs leading-5 text-slate-500">
            {detail}
          </div>
        </div>
      </div>
    </article>
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