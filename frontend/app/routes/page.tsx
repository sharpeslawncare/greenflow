"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";

const activeGroups = [
  1, 2, 4, 5,
  6, 7, 9, 10,
  11, 12, 14, 15,
  16, 17,
];

const groupDetails: Record<
  number,
  {
    week: number;
    day: string;
  }
> = {
  1: { week: 1, day: "Monday" },
  2: { week: 1, day: "Tuesday" },
  3: { week: 1, day: "Wednesday" },
  4: { week: 1, day: "Thursday" },
  5: { week: 1, day: "Friday" },

  6: { week: 2, day: "Monday" },
  7: { week: 2, day: "Tuesday" },
  8: { week: 2, day: "Wednesday" },
  9: { week: 2, day: "Thursday" },
  10: { week: 2, day: "Friday" },

  11: { week: 3, day: "Monday" },
  12: { week: 3, day: "Tuesday" },
  13: { week: 3, day: "Wednesday" },
  14: { week: 3, day: "Thursday" },
  15: { week: 3, day: "Friday" },

  16: { week: 4, day: "Monday" },
  17: { week: 4, day: "Tuesday" },
  18: { week: 4, day: "Wednesday" },
  19: { week: 4, day: "Thursday" },
  20: { week: 4, day: "Friday" },
};

export default function RoutesPage() {
  const {
    customers,
    ready,
    updateCustomer,
  } = useCustomerStore();

  const [selectedGroup, setSelectedGroup] =
    useState(7);

  const [selectedCustomers, setSelectedCustomers] =
    useState<string[]>([]);

  const [destinationGroup, setDestinationGroup] =
    useState(7);

  const [destinationVan, setDestinationVan] =
    useState(1);

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const activeCustomers = useMemo(
    () =>
      customers.filter(
        (customer) => customer.status === "Active",
      ),
    [customers],
  );

  const displayedCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activeCustomers.filter((customer) => {
      const isCorrectGroup =
        customer.groupNumber === selectedGroup;

      const matchesSearch =
        !query ||
        [
          customer.customerNumber,
          customer.fullName,
          customer.address,
          customer.postcode,
        ].some((value) =>
          value.toLowerCase().includes(query),
        );

      return isCorrectGroup && matchesSearch;
    });
  }, [
    activeCustomers,
    selectedGroup,
    search,
  ]);

  const groupSummaries = useMemo(
    () =>
      activeGroups.map((groupNumber) => {
        const groupCustomers =
          activeCustomers.filter(
            (customer) =>
              customer.groupNumber === groupNumber,
          );

        return {
          groupNumber,
          customerCount: groupCustomers.length,
          totalArea: groupCustomers.reduce(
            (total, customer) =>
              total + customer.lawnSize,
            0,
          ),
          totalValue: groupCustomers.reduce(
            (total, customer) =>
              total + customer.treatmentPrice,
            0,
          ),
        };
      }),
    [activeCustomers],
  );

  const selectedGroupSummary =
    groupSummaries.find(
      (group) =>
        group.groupNumber === selectedGroup,
    );

  const selectedArea = selectedCustomers.reduce(
    (total, customerNumber) => {
      const customer = customers.find(
        (item) =>
          item.customerNumber === customerNumber,
      );

      return total + (customer?.lawnSize ?? 0);
    },
    0,
  );

  const allDisplayedSelected =
    displayedCustomers.length > 0 &&
    displayedCustomers.every((customer) =>
      selectedCustomers.includes(
        customer.customerNumber,
      ),
    );

  function chooseGroup(groupNumber: number) {
    setSelectedGroup(groupNumber);
    setDestinationGroup(groupNumber);
    setSelectedCustomers([]);
    setSearch("");
  }

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

  function toggleAllDisplayed() {
    if (allDisplayedSelected) {
      const displayedNumbers =
        displayedCustomers.map(
          (customer) =>
            customer.customerNumber,
        );

      setSelectedCustomers((current) =>
        current.filter(
          (number) =>
            !displayedNumbers.includes(number),
        ),
      );

      return;
    }

    setSelectedCustomers((current) => [
      ...new Set([
        ...current,
        ...displayedCustomers.map(
          (customer) =>
            customer.customerNumber,
        ),
      ]),
    ]);
  }

  function moveSelectedCustomers() {
    if (selectedCustomers.length === 0) {
      showMessage(
        "Select at least one customer first.",
      );
      return;
    }

    selectedCustomers.forEach(
      (customerNumber) => {
        const customer = customers.find(
          (item) =>
            item.customerNumber ===
            customerNumber,
        );

        if (!customer) return;

        updateCustomer({
          ...customer,
          groupNumber: destinationGroup,
          vanNumber: destinationVan,
        });
      },
    );

    const numberMoved =
      selectedCustomers.length;

    setSelectedCustomers([]);

    showMessage(
      `${numberMoved} customer${
        numberMoved === 1 ? "" : "s"
      } moved to Group ${destinationGroup}, Van ${destinationVan}.`,
    );
  }

  function updateSingleCustomer(
    customerNumber: string,
    groupNumber: number,
    vanNumber: number,
  ) {
    const customer = customers.find(
      (item) =>
        item.customerNumber === customerNumber,
    );

    if (!customer) return;

    updateCustomer({
      ...customer,
      groupNumber,
      vanNumber,
    });

    showMessage(
      `${customer.fullName} updated.`,
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
            Loading groups and routes...
          </div>
        </main>
      </AppShell>
    );
  }

  const groupInfo =
    groupDetails[selectedGroup];

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
                Groups & Routes
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Organise customers geographically
                across the four-week working cycle.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
              <span className="text-slate-500">
                Active customers:
              </span>{" "}
              <strong>
                {activeCustomers.length}
              </strong>
            </div>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <section className="grid gap-4 xl:grid-cols-[330px_1fr]">
            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4">
                <h2 className="font-bold">
                  Four-week cycle
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Wednesdays remain available but
                  are not currently active.
                </p>
              </div>

              <div className="max-h-[68vh] space-y-2 overflow-y-auto pr-1">
                {groupSummaries.map(
                  (group) => {
                    const details =
                      groupDetails[
                        group.groupNumber
                      ];

                    const isSelected =
                      selectedGroup ===
                      group.groupNumber;

                    return (
                      <button
                        key={
                          group.groupNumber
                        }
                        type="button"
                        onClick={() =>
                          chooseGroup(
                            group.groupNumber,
                          )
                        }
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? "border-[#338b45] bg-green-50"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-bold">
                              Group{" "}
                              {
                                group.groupNumber
                              }
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              Week{" "}
                              {details.week} ·{" "}
                              {details.day}
                            </div>
                          </div>

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">
                            {
                              group.customerCount
                            }
                          </span>
                        </div>

                        <div className="mt-3 flex justify-between text-xs">
                          <span className="text-slate-500">
                            {
                              group.totalArea
                            }{" "}
                            m²
                          </span>

                          <span className="font-semibold text-[#176b37]">
                            £
                            {group.totalValue.toFixed(
                              2,
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            </aside>

            <section className="min-w-0">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      Group {selectedGroup}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Week {groupInfo.week} ·{" "}
                      {groupInfo.day}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-6 text-right">
                    <SummaryStat
                      label="Customers"
                      value={String(
                        selectedGroupSummary
                          ?.customerCount ?? 0,
                      )}
                    />

                    <SummaryStat
                      label="Area"
                      value={`${(
                        selectedGroupSummary
                          ?.totalArea ?? 0
                      ).toLocaleString()} m²`}
                    />

                    <SummaryStat
                      label="Value"
                      value={`£${(
                        selectedGroupSummary
                          ?.totalValue ?? 0
                      ).toFixed(2)}`}
                    />
                  </div>
                </div>
              </article>

              <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[1fr_150px_130px_auto] lg:items-end">
                  <Field label="Search this group">
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

                  <Field label="Move to group">
                    <select
                      value={destinationGroup}
                      onChange={(event) =>
                        setDestinationGroup(
                          Number(
                            event.target.value,
                          ),
                        )
                      }
                      className={inputClass}
                    >
                      {activeGroups.map(
                        (groupNumber) => (
                          <option
                            key={groupNumber}
                            value={groupNumber}
                          >
                            Group {groupNumber}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field label="Assign van">
                    <select
                      value={destinationVan}
                      onChange={(event) =>
                        setDestinationVan(
                          Number(
                            event.target.value,
                          ),
                        )
                      }
                      className={inputClass}
                    >
                      <option value={1}>
                        Van 1
                      </option>
                      <option value={2}>
                        Van 2
                      </option>
                      <option value={3}>
                        Van 3
                      </option>
                    </select>
                  </Field>

                  <button
                    type="button"
                    onClick={
                      moveSelectedCustomers
                    }
                    className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
                  >
                    Move selected
                  </button>
                </div>
              </article>

              <article className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="grid grid-cols-[42px_85px_1.15fr_1.6fr_90px_120px_130px] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <input
                    type="checkbox"
                    checked={
                      allDisplayedSelected
                    }
                    onChange={
                      toggleAllDisplayed
                    }
                    className="h-4 w-4"
                    aria-label="Select all customers"
                  />

                  <span>Number</span>
                  <span>Customer</span>
                  <span>Address</span>
                  <span>Area</span>
                  <span>Van</span>
                  <span>Actions</span>
                </div>

                <div className="max-h-[46vh] overflow-y-auto">
                  {displayedCustomers.length ===
                  0 ? (
                    <div className="p-10 text-center text-slate-500">
                      No customers are currently
                      assigned to this group.
                    </div>
                  ) : (
                    displayedCustomers.map(
                      (customer) => (
                        <div
                          key={
                            customer.customerNumber
                          }
                          className="grid grid-cols-[42px_85px_1.15fr_1.6fr_90px_120px_130px] items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0 hover:bg-green-50/40"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCustomers.includes(
                              customer.customerNumber,
                            )}
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
                              {
                                customer.fullName
                              }
                            </div>

                            <div className="mt-0.5 flex gap-2 text-xs">
                              {customer.lockedGate && (
                                <span className="font-bold text-red-600">
                                  Locked gate
                                </span>
                              )}

                              {customer.dogOnProperty && (
                                <span className="font-bold text-amber-700">
                                  Dog
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="text-slate-600">
                            {customer.address},{" "}
                            {customer.postcode}
                          </span>

                          <span className="font-semibold">
                            {
                              customer.lawnSize
                            }{" "}
                            m²
                          </span>

                          <select
                            value={
                              customer.vanNumber
                            }
                            onChange={(event) =>
                              updateSingleCustomer(
                                customer.customerNumber,
                                customer.groupNumber,
                                Number(
                                  event.target
                                    .value,
                                ),
                              )
                            }
                            className="rounded-lg border border-slate-300 px-2 py-2"
                          >
                            <option value={1}>
                              Van 1
                            </option>
                            <option value={2}>
                              Van 2
                            </option>
                            <option value={3}>
                              Van 3
                            </option>
                          </select>

                          <select
                            value={
                              customer.groupNumber
                            }
                            onChange={(event) =>
                              updateSingleCustomer(
                                customer.customerNumber,
                                Number(
                                  event.target
                                    .value,
                                ),
                                customer.vanNumber,
                              )
                            }
                            className="rounded-lg border border-slate-300 px-2 py-2"
                          >
                            {activeGroups.map(
                              (groupNumber) => (
                                <option
                                  key={
                                    groupNumber
                                  }
                                  value={
                                    groupNumber
                                  }
                                >
                                  Group{" "}
                                  {groupNumber}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      ),
                    )
                  )}
                </div>
              </article>

              <article className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="text-sm text-slate-600">
                  <strong>
                    {selectedCustomers.length}
                  </strong>{" "}
                  selected ·{" "}
                  <strong>
                    {selectedArea.toLocaleString()}{" "}
                    m²
                  </strong>
                </div>

                <div className="text-xs text-slate-500">
                  Customer changes are saved
                  automatically in this browser.
                </div>
              </article>
            </section>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">
        {label}
      </span>

      {children}
    </label>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="mt-1 font-bold">
        {value}
      </div>
    </div>
  );
}