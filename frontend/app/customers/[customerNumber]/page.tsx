"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { CustomerProfileClient } from "@/components/customer-profile-client";
import { useCustomerStore } from "@/components/customer-store";

export default function CustomerPage() {
  const params = useParams<{
    customerNumber: string;
  }>();

  const {
    customers,
    ready,
    getCustomer,
  } = useCustomerStore();

  const customerNumber = params.customerNumber;
  const customer = getCustomer(customerNumber);

  const customerIndex = customers.findIndex(
    (item) => item.customerNumber === customerNumber,
  );

  const previousCustomer =
    customerIndex > 0
      ? customers[customerIndex - 1]
      : undefined;

  const nextCustomer =
    customerIndex >= 0 &&
    customerIndex < customers.length - 1
      ? customers[customerIndex + 1]
      : undefined;

  if (!ready) {
    return (
      <AppShell>
        <main className="p-6 md:p-10">
          <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading customer...
          </div>
        </main>
      </AppShell>
    );
  }

  if (!customer) {
    return (
      <AppShell>
        <main className="p-6 md:p-10">
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-bold">
              Customer not found
            </h1>

            <p className="mt-3 text-slate-500">
              Customer #{customerNumber} is not available in
              GreenFlow.
            </p>

            <Link
              href="/customers"
              className="mt-6 inline-flex rounded-xl bg-[#176b37] px-5 py-3 font-semibold text-white"
            >
              Return to customers
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/customers"
              className="font-semibold text-[#176b37] hover:underline"
            >
              ← Back to customers
            </Link>

            <div className="flex flex-wrap gap-2">
              {previousCustomer && (
                <Link
                  href={`/customers/${previousCustomer.customerNumber}`}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  ← Previous customer
                </Link>
              )}

              {nextCustomer && (
                <Link
                  href={`/customers/${nextCustomer.customerNumber}`}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Next customer →
                </Link>
              )}
            </div>
          </header>

          <CustomerProfileClient
            customerNumber={customer.customerNumber}
          />
        </div>
      </main>
    </AppShell>
  );
}