"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";
import {
  type DemoCustomerCount,
  generateDemoCustomers,
  summariseDemoGroups,
} from "@/lib/demo-data-generator";

const customerCountOptions: DemoCustomerCount[] = [
  20,
  50,
  100,
  250,
  500,
];

export default function DemoGeneratorPage() {
  const {
    customers,
    ready,
    replaceCustomers,
  } = useCustomerStore();

  const [
    customerCount,
    setCustomerCount,
  ] =
    useState<DemoCustomerCount>(
      100,
    );

  const [message, setMessage] =
    useState("");

  const previewCustomers =
    useMemo(
      () =>
        generateDemoCustomers({
          customerCount,
          groupCount: 20,
          vanNumber: 1,
          firstCustomerNumber:
            1001,
        }),
      [customerCount],
    );

  const groupSummary =
    useMemo(
      () =>
        summariseDemoGroups(
          previewCustomers,
        ),
      [previewCustomers],
    );

  const smallestGroup =
    groupSummary.reduce(
      (smallest, group) =>
        Math.min(
          smallest,
          group.customerCount,
        ),
      Number.POSITIVE_INFINITY,
    );

  const largestGroup =
    groupSummary.reduce(
      (largest, group) =>
        Math.max(
          largest,
          group.customerCount,
        ),
      0,
    );

  function generateCustomers() {
    const confirmed =
      window.confirm(
        `Replace the current ${customers.length} customers with ${customerCount} generated demo customers? This step changes customers only. Treatments, enquiries and programmes are not cleared yet.`,
      );

    if (!confirmed) return;

    replaceCustomers(
      previewCustomers,
    );

    setMessage(
      `${customerCount} demo customers created across ${groupSummary.length} groups.`,
    );

    window.setTimeout(() => {
      setMessage("");
    }, 3500);
  }

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading demo generator...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-6xl">
          <header className="mb-5">
            <Link
              href="/settings"
              className="text-sm font-semibold text-[#176b37] hover:underline"
            >
              ← Maintenance
            </Link>

            <h1 className="mt-2 text-3xl font-bold">
              Demo Customer Generator
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Generate a predictable customer database for testing. This first version changes customers only.
            </p>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Generator settings
              </div>

              <div className="mt-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Number of customers
                  </span>

                  <select
                    value={customerCount}
                    onChange={(event) =>
                      setCustomerCount(
                        Number(
                          event.target
                            .value,
                        ) as DemoCustomerCount,
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100"
                  >
                    {customerCountOptions.map(
                      (count) => (
                        <option
                          key={count}
                          value={count}
                        >
                          {count} customers
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>

              <div className="mt-5 space-y-3">
                <SettingSummary
                  label="Groups"
                  value="20"
                />

                <SettingSummary
                  label="Vehicle"
                  value="Van 1"
                />

                <SettingSummary
                  label="First customer"
                  value="1001"
                />

                <SettingSummary
                  label="Status"
                  value="Active"
                />
              </div>

              <button
                type="button"
                onClick={
                  generateCustomers
                }
                className="mt-6 w-full rounded-xl bg-[#176b37] px-5 py-3 text-sm font-bold text-white hover:bg-[#125b2f]"
              >
                Generate Customers
              </button>

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                This replaces the current customer list. Create a backup first when the existing customer data matters.
              </div>
            </aside>

            <section className="space-y-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
                      Preview
                    </div>

                    <h2 className="mt-2 text-2xl font-bold">
                      {customerCount} customers
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Distributed across{" "}
                      {
                        groupSummary.length
                      }{" "}
                      groups.
                    </p>
                  </div>

                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-right">
                    <div className="text-xs font-semibold uppercase tracking-wide text-green-700">
                      Customers per group
                    </div>

                    <div className="mt-1 text-2xl font-bold text-green-950">
                      {smallestGroup ===
                      largestGroup
                        ? smallestGroup
                        : `${smallestGroup}–${largestGroup}`}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                  {groupSummary.map(
                    (group) => (
                      <div
                        key={
                          group.groupNumber
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"
                      >
                        <div className="text-xs font-semibold text-slate-500">
                          Group{" "}
                          {
                            group.groupNumber
                          }
                        </div>

                        <div className="mt-1 text-xl font-bold">
                          {
                            group.customerCount
                          }
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold">
                  Sample generated customers
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  The first five records that will be created.
                </p>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="border-b border-slate-200 px-3 py-3">
                          Customer
                        </th>
                        <th className="border-b border-slate-200 px-3 py-3">
                          Name
                        </th>
                        <th className="border-b border-slate-200 px-3 py-3">
                          Group
                        </th>
                        <th className="border-b border-slate-200 px-3 py-3">
                          Lawn
                        </th>
                        <th className="border-b border-slate-200 px-3 py-3">
                          Price
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {previewCustomers
                        .slice(0, 5)
                        .map(
                          (customer) => (
                            <tr
                              key={
                                customer.customerNumber
                              }
                            >
                              <td className="border-b border-slate-100 px-3 py-3 font-semibold">
                                #
                                {
                                  customer.customerNumber
                                }
                              </td>

                              <td className="border-b border-slate-100 px-3 py-3">
                                {
                                  customer.fullName
                                }
                              </td>

                              <td className="border-b border-slate-100 px-3 py-3">
                                {
                                  customer.groupNumber
                                }
                              </td>

                              <td className="border-b border-slate-100 px-3 py-3">
                                {customer.lawnSize.toLocaleString(
                                  "en-GB",
                                )}{" "}
                                m²
                              </td>

                              <td className="border-b border-slate-100 px-3 py-3">
                                £
                                {customer.treatmentPrice.toFixed(
                                  2,
                                )}
                              </td>
                            </tr>
                          ),
                        )}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function SettingSummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-sm font-bold text-slate-900">
        {value}
      </span>
    </div>
  );
}