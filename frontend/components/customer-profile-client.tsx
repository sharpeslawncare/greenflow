"use client";

import { CustomerTreatmentHistory } from "@/components/customer-treatment-history";
import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

import { useCustomerStore } from "@/components/customer-store";
import type { Customer } from "@/lib/demo-customers";

type CustomerProfileClientProps = {
  customerNumber: string;
};

type TabId =
  | "overview"
  | "programme"
  | "history"
  | "pricing"
  | "notes";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "programme", label: "Programme" },
  { id: "history", label: "History" },
  { id: "pricing", label: "Pricing" },
  { id: "notes", label: "Notes" },
];

export function CustomerProfileClient({
  customerNumber,
}: CustomerProfileClientProps) {
  const { getCustomer, updateCustomer } =
    useCustomerStore();

  const customer = getCustomer(customerNumber);

  const [activeTab, setActiveTab] =
    useState<TabId>("overview");

  const [draft, setDraft] =
    useState<Customer | null>(customer ?? null);

  const [editing, setEditing] = useState(false);
  const [savedMessage, setSavedMessage] =
    useState("");

  useEffect(() => {
    if (!customer) return;

    setDraft({ ...customer });
    setEditing(false);
    setActiveTab("overview");
  }, [customerNumber, customer]);

  if (!customer) {
    return null;
  }

  function beginEditing(customerToEdit: Customer) {
  setDraft({ ...customerToEdit });
  setEditing(true);
  setSavedMessage("");
}

function cancelEditing(customerToRestore: Customer) {
  setDraft({ ...customerToRestore });
  setEditing(false);
}

  function saveCustomer() {
    if (!draft) return;

    updateCustomer(draft);
    setEditing(false);
    setSavedMessage("Customer changes saved.");

    window.setTimeout(() => {
      setSavedMessage("");
    }, 2500);
  }

  const aerationPrice =
    customer.treatmentPrice * 2;

  const scarificationPrice =
    customer.treatmentPrice * 3;

  return (
    <>
      <div className="flex h-[calc(100vh-9rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {savedMessage && (
          <div className="border-b border-green-200 bg-green-50 px-5 py-2 text-sm font-semibold text-green-800">
            {savedMessage}
          </div>
        )}

        {/* Compact customer header */}
        <section className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {customer.fullName}
                </h1>

                <StatusBadge status={customer.status} />
              </div>

              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                <span>
                  Customer #{customer.customerNumber}
                </span>

                <span>
                  {customer.address}, {customer.postcode}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-7 gap-y-1 text-right sm:grid-cols-4">
              <HeaderStat
                label="Next visit"
                value={customer.nextVisit}
                highlight
              />

              <HeaderStat
                label="Group"
                value={`${customer.groupNumber}`}
              />

              <HeaderStat
                label="Price"
                value={`£${customer.treatmentPrice.toFixed(
                  2,
                )}`}
              />

              <HeaderStat
                label="Lawn"
                value={`${customer.lawnSize.toLocaleString()} m²`}
              />
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-[#176b37] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#125b2f]"
            >
              Complete treatment
            </button>

            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-slate-100"
            >
              Add service
            </button>

            <button
              type="button"
              onClick={() => beginEditing(customer)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-slate-100"
            >
              Edit customer
            </button>

            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-slate-100"
            >
              Print report
            </button>

            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-slate-100"
            >
              Send message
            </button>
          </div>
        </section>

        {/* Tabs */}
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 px-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-[#176b37] text-[#176b37]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Selected tab */}
        <section className="min-h-0 flex-1 overflow-auto p-5">
          {activeTab === "overview" && (
            <OverviewTab customer={customer} />
          )}

          {activeTab === "programme" && (
            <ProgrammeTab customer={customer} />
          )}

          {activeTab === "history" && (
  <CustomerTreatmentHistory
    customerNumber={
      customer.customerNumber
    }
  />
)}

          {activeTab === "pricing" && (
            <PricingTab
              treatmentPrice={
                customer.treatmentPrice
              }
              aerationPrice={aerationPrice}
              scarificationPrice={
                scarificationPrice
              }
            />
          )}

          {activeTab === "notes" && (
            <NotesTab notes={customer.notes} />
          )}
        </section>
      </div>

      {/* Edit customer modal */}
      {editing && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold">
                  Edit customer
                </h2>

                <p className="text-sm text-slate-500">
                  Customer #{customer.customerNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={() => cancelEditing(customer)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <FormField label="First name">
                <input
                  value={draft.firstName}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      firstName: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Surname">
                <input
                  value={draft.surname}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      surname: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Full name">
                <input
                  value={draft.fullName}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      fullName: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Status">
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      status:
                        event.target
                          .value as Customer["status"],
                    })
                  }
                  className={inputClass}
                >
                  <option value="Active">
                    Active
                  </option>
                  <option value="Paused">
                    Paused
                  </option>
                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </FormField>

              <FormField label="Address">
                <input
                  value={draft.address}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      address: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Postcode">
                <input
                  value={draft.postcode}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      postcode:
                        event.target.value.toUpperCase(),
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Email">
                <input
                  type="email"
                  value={draft.email}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      email: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Mobile phone">
                <input
                  value={draft.mobilePhone}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      mobilePhone:
                        event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Home phone">
                <input
                  value={draft.homePhone}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      homePhone: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Preferred contact">
                <select
                  value={draft.preferredContact}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      preferredContact:
                        event.target
                          .value as Customer["preferredContact"],
                    })
                  }
                  className={inputClass}
                >
                  <option value="SMS">SMS</option>
                  <option value="Email">
                    Email
                  </option>
                  <option value="Telephone">
                    Telephone
                  </option>
                </select>
              </FormField>

              <FormField label="Lawn size (m²)">
                <input
                  type="number"
                  min="0"
                  value={draft.lawnSize}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      lawnSize:
                        Number(event.target.value) ||
                        0,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Treatment price (£)">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={draft.treatmentPrice}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      treatmentPrice:
                        Number(event.target.value) ||
                        0,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Group number">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={draft.groupNumber}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      groupNumber:
                        Number(event.target.value) ||
                        1,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Van number">
                <input
                  type="number"
                  min="1"
                  value={draft.vanNumber}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      vanNumber:
                        Number(event.target.value) ||
                        1,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Next visit">
                <input
                  value={draft.nextVisit}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      nextVisit: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Last visit">
                <input
                  value={draft.lastVisit}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      lastVisit: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={draft.lockedGate}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      lockedGate:
                        event.target.checked,
                    })
                  }
                  className="h-5 w-5"
                />

                <span className="font-semibold">
                  Locked gate
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={draft.dogOnProperty}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      dogOnProperty:
                        event.target.checked,
                    })
                  }
                  className="h-5 w-5"
                />

                <span className="font-semibold">
                  Dog on property
                </span>
              </label>

              <div className="md:col-span-2">
                <FormField label="Notes">
                  <textarea
                    rows={4}
                    value={draft.notes}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        notes: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </FormField>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => cancelEditing(customer)}
                className="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveCustomer}
                className="rounded-xl bg-[#176b37] px-5 py-2.5 font-semibold text-white hover:bg-[#125b2f]"
              >
                Save customer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function OverviewTab({
  customer,
}: {
  customer: Customer;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <CompactCard title="Contact">
        <CompactRow
          label="Mobile"
          value={
            customer.mobilePhone ||
            "Not recorded"
          }
        />

        <CompactRow
          label="Home"
          value={
            customer.homePhone || "Not recorded"
          }
        />

        <CompactRow
          label="Email"
          value={customer.email || "Not recorded"}
        />

        <CompactRow
          label="Preferred"
          value={customer.preferredContact}
        />
      </CompactCard>

      <CompactCard title="Property">
        <CompactRow
          label="Lawn size"
          value={`${customer.lawnSize.toLocaleString()} m²`}
        />

        <CompactRow
          label="Group"
          value={`Group ${customer.groupNumber}`}
        />

        <CompactRow
          label="Van"
          value={`Van ${customer.vanNumber}`}
        />

        <CompactRow
          label="Last visit"
          value={customer.lastVisit}
        />
      </CompactCard>

      <CompactCard title="Alerts">
        <AlertRow
          label="Locked gate"
          active={customer.lockedGate}
        />

        <AlertRow
          label="Dog on property"
          active={customer.dogOnProperty}
        />

        <AlertRow
          label="SMS reminder"
          active={
            customer.preferredContact === "SMS"
          }
        />

        <AlertRow
          label="Active customer"
          active={customer.status === "Active"}
          positive
        />
      </CompactCard>
    </div>
  );
}

function ProgrammeTab({
  customer,
}: {
  customer: Customer;
}) {
  const visits = [
    {
      name: "Early winter moss control",
      date: "15 January 2028",
      status: "Completed",
    },
    {
      name: "Spring weed and feed",
      date: customer.lastVisit,
      status: "Completed",
    },
    {
      name: "Summer weed and feed",
      date: customer.nextVisit,
      status: "Upcoming",
    },
    {
      name: "Autumn weed and feed",
      date: "14 September 2028",
      status: "Planned",
    },
    {
      name: "Winter moss control",
      date: "16 November 2028",
      status: "Planned",
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-[50px_1.5fr_1fr_100px] gap-3 bg-slate-50 px-4 py-2 text-xs font-bold uppercase text-slate-500">
        <span>Visit</span>
        <span>Treatment</span>
        <span>Date</span>
        <span>Status</span>
      </div>

      {visits.map((visit, index) => (
        <div
          key={visit.name}
          className="grid grid-cols-[50px_1.5fr_1fr_100px] items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm"
        >
          <span className="font-bold">
            {index + 1}
          </span>

          <span className="font-semibold">
            {visit.name}
          </span>

          <span className="text-slate-600">
            {visit.date}
          </span>

          <ProgrammeStatus
            status={visit.status}
          />
        </div>
      ))}
    </div>
  );
}

function HistoryTab({
  customer,
}: {
  customer: Customer;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <HistoryRow
        date={customer.lastVisit}
        treatment="Spring weed and feed"
        products="ProTurf Spring, Pastor Pro"
        result="Completed"
      />

      <HistoryRow
        date="15 January 2028"
        treatment="Early winter moss control"
        products="Moss control treatment"
        result="Completed"
      />

      <HistoryRow
        date="16 November 2027"
        treatment="Winter moss control"
        products="Moss control treatment"
        result="Completed"
      />
    </div>
  );
}

function PricingTab({
  treatmentPrice,
  aerationPrice,
  scarificationPrice,
}: {
  treatmentPrice: number;
  aerationPrice: number;
  scarificationPrice: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <PriceCard
        title="Standard treatment"
        price={treatmentPrice}
        detail="Base price including VAT"
      />

      <PriceCard
        title="Aeration"
        price={aerationPrice}
        detail="Treatment price ×2"
      />

      <PriceCard
        title="Scarification"
        price={scarificationPrice}
        detail="Treatment price ×3"
      />
    </div>
  );
}

function NotesTab({
  notes,
}: {
  notes: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="font-bold">
        Customer notes
      </h2>

      <p className="mt-3 leading-7 text-slate-600">
        {notes || "No customer notes recorded."}
      </p>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

function FormField({
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

function HeaderStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div
        className={`mt-0.5 whitespace-nowrap font-bold ${
          highlight
            ? "text-[#176b37]"
            : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: Customer["status"];
}) {
  const styles =
    status === "Active"
      ? "bg-green-100 text-green-800"
      : status === "Paused"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-200 text-slate-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${styles}`}
    >
      {status}
    </span>
  );
}

function CompactCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <h2 className="mb-3 font-bold">
        {title}
      </h2>

      <div className="space-y-2">
        {children}
      </div>
    </article>
  );
}

function CompactRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 text-sm last:border-0 last:pb-0">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="text-right font-semibold">
        {value}
      </span>
    </div>
  );
}

function AlertRow({
  label,
  active,
  positive = false,
}: {
  label: string;
  active: boolean;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <span>{label}</span>

      <span
        className={`font-bold ${
          active
            ? positive
              ? "text-green-700"
              : "text-red-600"
            : "text-slate-400"
        }`}
      >
        {active ? "Yes" : "No"}
      </span>
    </div>
  );
}

function ProgrammeStatus({
  status,
}: {
  status: string;
}) {
  const style =
    status === "Completed"
      ? "bg-green-100 text-green-800"
      : status === "Upcoming"
        ? "bg-blue-100 text-blue-800"
        : "bg-slate-100 text-slate-700";

  return (
    <span
      className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${style}`}
    >
      {status}
    </span>
  );
}

function HistoryRow({
  date,
  treatment,
  products,
  result,
}: {
  date: string;
  treatment: string;
  products: string;
  result: string;
}) {
  return (
    <div className="grid grid-cols-[130px_1.2fr_1.5fr_100px] items-center gap-4 border-b border-slate-100 px-4 py-3 text-sm last:border-0">
      <span className="text-slate-500">
        {date}
      </span>

      <span className="font-semibold">
        {treatment}
      </span>

      <span className="text-slate-600">
        {products}
      </span>

      <span className="rounded-full bg-green-100 px-2.5 py-1 text-center text-xs font-bold text-green-800">
        {result}
      </span>
    </div>
  );
}

function PriceCard({
  title,
  price,
  detail,
}: {
  title: string;
  price: number;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 p-5">
      <h2 className="font-bold">{title}</h2>

      <div className="mt-2 text-3xl font-bold text-[#176b37]">
        £{price.toFixed(2)}
      </div>

      <p className="mt-1 text-sm text-slate-500">
        {detail}
      </p>
    </article>
  );
}