"use client";

import Link from "next/link";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";
import type { Customer } from "@/lib/demo-customers";

type CommunicationStatus =
  | "Queued"
  | "Sent"
  | "Failed"
  | "Cancelled";

type CommunicationChannel =
  | "SMS"
  | "WhatsApp"
  | "Email";

type CommunicationRecord = {
  id: string;
  customerNumber: string;
  customerName: string;
  destination: string;
  channel: CommunicationChannel;
  message: string;
  createdAt: string;
  sentAt: string;
  status: CommunicationStatus;
};

type CommunicationsData = {
  template: string;
  records: CommunicationRecord[];
};

const STORAGE_KEY = "greenflow-communications-v1";

const DEFAULT_TEMPLATE =
  "Hello {firstName}, this is a reminder that Sharpes Lawn Care is scheduled to visit on {nextVisit}. Please leave any locked gates accessible. Thank you, Rob.";

const defaultData: CommunicationsData = {
  template: DEFAULT_TEMPLATE,
  records: [],
};

export default function CommunicationsPage() {
  const { customers, ready } = useCustomerStore();

  const [data, setData] =
    useState<CommunicationsData>(defaultData);

  const [selectedCustomers, setSelectedCustomers] =
    useState<string[]>([]);

  const [channel, setChannel] =
    useState<CommunicationChannel>("SMS");

  const [search, setSearch] = useState("");
  const [showOnlyLockedGates, setShowOnlyLockedGates] =
    useState(true);

  const [previewCustomerNumber, setPreviewCustomerNumber] =
    useState("");

  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(
      STORAGE_KEY,
    );

    if (!saved) return;

    try {
      const parsed = JSON.parse(
        saved,
      ) as CommunicationsData;

      if (
        typeof parsed.template === "string" &&
        Array.isArray(parsed.records)
      ) {
        setData(parsed);
      }
    } catch {
      window.localStorage.removeItem(
        STORAGE_KEY,
      );
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data),
    );
  }, [data]);

  const eligibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers
      .filter(
        (customer) =>
          customer.status === "Active",
      )
      .filter((customer) =>
        showOnlyLockedGates
          ? customer.lockedGate
          : true,
      )
      .filter((customer) => {
        if (!query) return true;

        return [
          customer.customerNumber,
          customer.fullName,
          customer.address,
          customer.postcode,
          customer.mobilePhone,
        ].some((value) =>
          value.toLowerCase().includes(query),
        );
      });
  }, [
    customers,
    search,
    showOnlyLockedGates,
  ]);

  const previewCustomer =
    customers.find(
      (customer) =>
        customer.customerNumber ===
        previewCustomerNumber,
    ) ??
    eligibleCustomers[0] ??
    customers[0];

  const selectedCustomerRecords =
    selectedCustomers
      .map((customerNumber) =>
        customers.find(
          (customer) =>
            customer.customerNumber ===
            customerNumber,
        ),
      )
      .filter(
        (customer): customer is Customer =>
          Boolean(customer),
      );

  const queuedRecords = data.records.filter(
    (record) => record.status === "Queued",
  );

  const sentRecords = data.records.filter(
    (record) => record.status === "Sent",
  );

  const customersWithoutMobile =
    eligibleCustomers.filter(
      (customer) =>
        !customer.mobilePhone.trim(),
    );

  const selectableCustomers =
    eligibleCustomers.filter(
      (customer) =>
        hasDestination(customer, channel),
    );

  const allSelectableSelected =
    selectableCustomers.length > 0 &&
    selectableCustomers.every((customer) =>
      selectedCustomers.includes(
        customer.customerNumber,
      ),
    );

  function toggleCustomer(
    customerNumber: string,
  ) {
    setSelectedCustomers((current) =>
      current.includes(customerNumber)
        ? current.filter(
            (number) =>
              number !== customerNumber,
          )
        : [...current, customerNumber],
    );
  }

  function toggleAllSelectable() {
    const selectableNumbers =
      selectableCustomers.map(
        (customer) =>
          customer.customerNumber,
      );

    if (allSelectableSelected) {
      setSelectedCustomers((current) =>
        current.filter(
          (customerNumber) =>
            !selectableNumbers.includes(
              customerNumber,
            ),
        ),
      );

      return;
    }

    setSelectedCustomers((current) => [
      ...new Set([
        ...current,
        ...selectableNumbers,
      ]),
    ]);
  }

  function addSelectedToQueue() {
    if (selectedCustomerRecords.length === 0) {
      showMessage(
        "Select at least one customer first.",
      );
      return;
    }

    const validCustomers =
      selectedCustomerRecords.filter(
        (customer) =>
          hasDestination(customer, channel),
      );

    if (validCustomers.length === 0) {
      showMessage(
        `The selected customers do not have a valid ${channel} destination.`,
      );
      return;
    }

    const newRecords: CommunicationRecord[] =
      validCustomers.map((customer) => ({
        id: `communication-${Date.now()}-${customer.customerNumber}`,
        customerNumber:
          customer.customerNumber,
        customerName: customer.fullName,
        destination: getDestination(
          customer,
          channel,
        ),
        channel,
        message: personaliseMessage(
          data.template,
          customer,
        ),
        createdAt: new Date().toISOString(),
        sentAt: "",
        status: "Queued",
      }));

    setData((current) => ({
      ...current,
      records: [
        ...newRecords,
        ...current.records,
      ],
    }));

    setSelectedCustomers([]);

    showMessage(
      `${newRecords.length} reminder${
        newRecords.length === 1 ? "" : "s"
      } added to the queue.`,
    );
  }

  function markRecordSent(recordId: string) {
    setData((current) => ({
      ...current,
      records: current.records.map(
        (record) =>
          record.id === recordId
            ? {
                ...record,
                status: "Sent",
                sentAt:
                  new Date().toISOString(),
              }
            : record,
      ),
    }));

    showMessage(
      "Reminder marked as sent.",
    );
  }

  function markAllQueuedSent() {
    if (queuedRecords.length === 0) {
      showMessage(
        "There are no queued reminders.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Mark all ${queuedRecords.length} queued reminders as sent? This is a test action and will not send real messages.`,
    );

    if (!confirmed) return;

    const sentTime =
      new Date().toISOString();

    setData((current) => ({
      ...current,
      records: current.records.map(
        (record) =>
          record.status === "Queued"
            ? {
                ...record,
                status: "Sent",
                sentAt: sentTime,
              }
            : record,
      ),
    }));

    showMessage(
      `${queuedRecords.length} reminders marked as sent.`,
    );
  }

  function cancelQueuedRecord(recordId: string) {
    setData((current) => ({
      ...current,
      records: current.records.map(
        (record) =>
          record.id === recordId
            ? {
                ...record,
                status: "Cancelled",
              }
            : record,
      ),
    }));

    showMessage(
      "Queued reminder cancelled.",
    );
  }

  function clearCommunicationHistory() {
    const confirmed = window.confirm(
      "Clear all demonstration communication records? The reminder template will be retained.",
    );

    if (!confirmed) return;

    setData((current) => ({
      ...current,
      records: [],
    }));

    showMessage(
      "Communication history cleared.",
    );
  }

  function restoreDefaultTemplate() {
    setData((current) => ({
      ...current,
      template: DEFAULT_TEMPLATE,
    }));

    showMessage(
      "Default gate-reminder wording restored.",
    );
  }

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 2800);
  }

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading customer communications...
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
              <Link
                href="/"
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-3xl font-bold">
                Communications
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Prepare locked-gate reminders and
                maintain a customer contact history.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  clearCommunicationHistory
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
              >
                Clear demo history
              </button>

              <button
                type="button"
                onClick={markAllQueuedSent}
                className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
              >
                Mark queue as sent
              </button>
            </div>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <strong>Testing mode:</strong> GreenFlow
            is recording and previewing reminders
            locally. No SMS, WhatsApp or email is
            being sent from this page yet.
          </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Locked-gate customers"
              value={String(
                customers.filter(
                  (customer) =>
                    customer.status ===
                      "Active" &&
                    customer.lockedGate,
                ).length,
              )}
              detail="Active customer records"
            />

            <SummaryCard
              label="Selected reminders"
              value={String(
                selectedCustomers.length,
              )}
              detail={`${channel} channel`}
            />

            <SummaryCard
              label="Queued"
              value={String(
                queuedRecords.length,
              )}
              detail="Awaiting test completion"
              warning={
                queuedRecords.length > 0
              }
            />

            <SummaryCard
              label="Sent history"
              value={String(
                sentRecords.length,
              )}
              detail="Demonstration records"
            />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">
                    Gate-reminder template
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Available placeholders:
                    {" "}
                    <code>
                      {"{firstName}"}
                    </code>
                    ,{" "}
                    <code>
                      {"{fullName}"}
                    </code>
                    ,{" "}
                    <code>
                      {"{nextVisit}"}
                    </code>
                    ,{" "}
                    <code>
                      {"{customerNumber}"}
                    </code>
                    .
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    restoreDefaultTemplate
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Restore wording
                </button>
              </div>

              <textarea
                rows={5}
                value={data.template}
                onChange={(event) =>
                  setData((current) => ({
                    ...current,
                    template:
                      event.target.value,
                  }))
                }
                className={`${inputClass} mt-4`}
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Communication channel">
                  <select
                    value={channel}
                    onChange={(event) => {
                      setChannel(
                        event.target
                          .value as CommunicationChannel,
                      );
                      setSelectedCustomers([]);
                    }}
                    className={inputClass}
                  >
                    <option value="SMS">
                      SMS
                    </option>

                    <option value="WhatsApp">
                      WhatsApp
                    </option>

                    <option value="Email">
                      Email
                    </option>
                  </select>
                </Field>

                <Field label="Preview customer">
                  <select
                    value={
                      previewCustomer
                        ?.customerNumber ?? ""
                    }
                    onChange={(event) =>
                      setPreviewCustomerNumber(
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  >
                    {customers
                      .filter(
                        (customer) =>
                          customer.status ===
                          "Active",
                      )
                      .map((customer) => (
                        <option
                          key={
                            customer.customerNumber
                          }
                          value={
                            customer.customerNumber
                          }
                        >
                          {customer.fullName}
                        </option>
                      ))}
                  </select>
                </Field>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">
                Message preview
              </h2>

              {previewCustomer ? (
                <>
                  <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm leading-6 text-green-950">
                    {personaliseMessage(
                      data.template,
                      previewCustomer,
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    <SummaryRow
                      label="Customer"
                      value={
                        previewCustomer.fullName
                      }
                    />

                    <SummaryRow
                      label="Channel"
                      value={channel}
                    />

                    <SummaryRow
                      label="Destination"
                      value={
                        getDestination(
                          previewCustomer,
                          channel,
                        ) ||
                        "Not recorded"
                      }
                    />

                    <SummaryRow
                      label="Next visit"
                      value={
                        previewCustomer.nextVisit
                      }
                    />

                    <SummaryRow
                      label="Characters"
                      value={String(
                        personaliseMessage(
                          data.template,
                          previewCustomer,
                        ).length,
                      )}
                    />
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  No active customer is available
                  for preview.
                </p>
              )}
            </article>
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
              <Field label="Search customers">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Name, number, address or postcode"
                  className={inputClass}
                />
              </Field>

              <label className="flex h-[43px] items-center gap-3 rounded-xl border border-slate-300 bg-white px-4">
                <input
                  type="checkbox"
                  checked={
                    showOnlyLockedGates
                  }
                  onChange={(event) =>
                    setShowOnlyLockedGates(
                      event.target.checked,
                    )
                  }
                  className="h-4 w-4"
                />

                <span className="text-sm font-semibold">
                  Locked gates only
                </span>
              </label>

              <button
                type="button"
                onClick={addSelectedToQueue}
                className="h-[43px] rounded-xl bg-[#176b37] px-5 text-sm font-semibold text-white hover:bg-[#125b2f]"
              >
                Add selected to queue
              </button>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[42px_90px_1.1fr_1.6fr_1fr_120px_110px] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              <input
                type="checkbox"
                checked={
                  allSelectableSelected
                }
                onChange={
                  toggleAllSelectable
                }
                className="h-4 w-4"
                aria-label="Select all available customers"
              />

              <span>Number</span>
              <span>Customer</span>
              <span>Address</span>
              <span>Destination</span>
              <span>Next visit</span>
              <span>Access</span>
            </div>

            <div className="max-h-[38vh] overflow-y-auto">
              {eligibleCustomers.length === 0 ? (
                <div className="p-10 text-center text-slate-500">
                  No customers match the current
                  communication filter.
                </div>
              ) : (
                eligibleCustomers.map(
                  (customer) => {
                    const destination =
                      getDestination(
                        customer,
                        channel,
                      );

                    const canSelect =
                      Boolean(destination);

                    return (
                      <div
                        key={
                          customer.customerNumber
                        }
                        className="grid grid-cols-[42px_90px_1.1fr_1.6fr_1fr_120px_110px] items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0 hover:bg-green-50/40"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(
                            customer.customerNumber,
                          )}
                          disabled={!canSelect}
                          onChange={() =>
                            toggleCustomer(
                              customer.customerNumber,
                            )
                          }
                          className="h-4 w-4"
                        />

                        <Link
                          href={`/customers/${customer.customerNumber}`}
                          className="font-bold text-[#176b37] hover:underline"
                        >
                          {
                            customer.customerNumber
                          }
                        </Link>

                        <div>
                          <div className="font-semibold">
                            {customer.fullName}
                          </div>

                          {!canSelect && (
                            <div className="mt-1 text-xs font-semibold text-red-600">
                              No valid{" "}
                              {channel} destination
                            </div>
                          )}
                        </div>

                        <span className="text-slate-600">
                          {customer.address},{" "}
                          {customer.postcode}
                        </span>

                        <span
                          className={
                            destination
                              ? "text-slate-700"
                              : "font-semibold text-red-600"
                          }
                        >
                          {destination ||
                            "Not recorded"}
                        </span>

                        <span className="font-semibold">
                          {customer.nextVisit}
                        </span>

                        <span className="w-fit rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                          Locked gate
                        </span>
                      </div>
                    );
                  },
                )
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-600">
                <strong>
                  {selectedCustomers.length}
                </strong>{" "}
                selected
              </span>

              {customersWithoutMobile.length >
                0 &&
                channel !== "Email" && (
                  <span className="font-semibold text-red-700">
                    {
                      customersWithoutMobile.length
                    }{" "}
                    customer
                    {customersWithoutMobile.length ===
                    1
                      ? ""
                      : "s"}{" "}
                    without a mobile number
                  </span>
                )}
            </div>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-2">
            <CommunicationList
              title="Reminder queue"
              description="Prepared reminders that have not yet been marked as sent."
              records={queuedRecords}
              emptyMessage="There are no reminders in the queue."
              onMarkSent={markRecordSent}
              onCancel={cancelQueuedRecord}
            />

            <CommunicationList
              title="Recent communication history"
              description="The latest demonstration communication records."
              records={data.records
                .filter(
                  (record) =>
                    record.status !==
                    "Queued",
                )
                .slice(0, 12)}
              emptyMessage="No completed communication records are available."
            />
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function personaliseMessage(
  template: string,
  customer: Customer,
) {
  return template
    .replaceAll(
      "{firstName}",
      customer.firstName ||
        customer.fullName,
    )
    .replaceAll(
      "{fullName}",
      customer.fullName,
    )
    .replaceAll(
      "{nextVisit}",
      customer.nextVisit,
    )
    .replaceAll(
      "{customerNumber}",
      customer.customerNumber,
    );
}

function hasDestination(
  customer: Customer,
  channel: CommunicationChannel,
) {
  return Boolean(
    getDestination(customer, channel),
  );
}

function getDestination(
  customer: Customer,
  channel: CommunicationChannel,
) {
  if (channel === "Email") {
    return customer.email.trim();
  }

  return customer.mobilePhone.trim();
}

function formatDateTime(value: string) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const inputClass =
  "w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

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

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 text-sm last:border-0 last:pb-0">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="max-w-[65%] text-right font-bold">
        {value}
      </span>
    </div>
  );
}

function CommunicationList({
  title,
  description,
  records,
  emptyMessage,
  onMarkSent,
  onCancel,
}: {
  title: string;
  description: string;
  records: CommunicationRecord[];
  emptyMessage: string;
  onMarkSent?: (recordId: string) => void;
  onCancel?: (recordId: string) => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
            {records.length}
          </span>
        </div>
      </div>

      <div className="max-h-[38vh] overflow-y-auto">
        {records.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            {emptyMessage}
          </div>
        ) : (
          records.map((record) => (
            <div
              key={record.id}
              className="border-b border-slate-100 p-4 last:border-0"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-bold">
                    {record.customerName}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Customer #
                    {record.customerNumber} ·{" "}
                    {record.channel} ·{" "}
                    {record.destination}
                  </div>
                </div>

                <CommunicationStatusBadge
                  status={record.status}
                />
              </div>

              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                {record.message}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Prepared{" "}
                  {formatDateTime(
                    record.createdAt,
                  )}
                  {record.sentAt
                    ? ` · Sent ${formatDateTime(
                        record.sentAt,
                      )}`
                    : ""}
                </div>

                {record.status ===
                  "Queued" && (
                  <div className="flex gap-2">
                    {onCancel && (
                      <button
                        type="button"
                        onClick={() =>
                          onCancel(
                            record.id,
                          )
                        }
                        className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Cancel
                      </button>
                    )}

                    {onMarkSent && (
                      <button
                        type="button"
                        onClick={() =>
                          onMarkSent(
                            record.id,
                          )
                        }
                        className="rounded-lg bg-[#176b37] px-3 py-2 text-xs font-semibold text-white hover:bg-[#125b2f]"
                      >
                        Mark sent
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function CommunicationStatusBadge({
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
          ? "bg-red-100 text-red-700"
          : "bg-slate-200 text-slate-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${styles}`}
    >
      {status}
    </span>
  );
}