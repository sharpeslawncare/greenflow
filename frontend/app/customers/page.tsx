"use client";

import Link from "next/link";
import {
  type FormEvent,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";
import type {
  Customer,
  CustomerStatus,
} from "@/lib/demo-customers";

type CustomerForm = {
  customerNumber: string;
  firstName: string;
  surname: string;
  fullName: string;
  address: string;
  postcode: string;
  email: string;
  homePhone: string;
  mobilePhone: string;
  lawnSize: string;
  groupNumber: string;
  treatmentPrice: string;
  status: CustomerStatus;
  vanNumber: string;
  nextVisit: string;
  lastVisit: string;
  lockedGate: boolean;
  dogOnProperty: boolean;
  preferredContact: Customer["preferredContact"];
  notes: string;
};

export default function CustomersPage() {
  const {
    customers,
    ready,
    addCustomer,
    getNextCustomerNumber,
    restoreDemoCustomers,
  } = useCustomerStore();

  const [search, setSearch] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState<CustomerForm>(() =>
    createEmptyForm("1006"),
  );

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) =>
      [
        customer.customerNumber,
        customer.fullName,
        customer.address,
        customer.postcode,
        customer.mobilePhone,
      ].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [customers, search]);

  function openAddCustomer() {
    setForm(createEmptyForm(getNextCustomerNumber()));
    setFormError("");
    setAddingCustomer(true);
  }

  function closeAddCustomer() {
    setAddingCustomer(false);
    setFormError("");
  }

  function handleAddCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (
      !form.customerNumber.trim() ||
      !form.fullName.trim() ||
      !form.address.trim() ||
      !form.postcode.trim()
    ) {
      setFormError(
        "Customer number, full name, address and postcode are required.",
      );
      return;
    }

    const customer: Customer = {
      customerNumber: form.customerNumber.trim(),
      firstName: form.firstName.trim(),
      surname: form.surname.trim(),
      fullName: form.fullName.trim(),
      address: form.address.trim(),
      postcode: form.postcode.trim().toUpperCase(),
      email: form.email.trim(),
      homePhone: form.homePhone.trim(),
      mobilePhone: form.mobilePhone.trim(),
      lawnSize: Number(form.lawnSize) || 0,
      groupNumber: Number(form.groupNumber) || 1,
      treatmentPrice: Number(form.treatmentPrice) || 18,
      status: form.status,
      vanNumber: Number(form.vanNumber) || 1,
      nextVisit:
        form.nextVisit.trim() || "Not yet scheduled",
      lastVisit:
        form.lastVisit.trim() || "No previous visit",
      lockedGate: form.lockedGate,
      dogOnProperty: form.dogOnProperty,
      preferredContact: form.preferredContact,
      notes: form.notes.trim(),
    };

    const result = addCustomer(customer);

    if (!result.success) {
      setFormError(result.message);
      return;
    }

    setAddingCustomer(false);
    setSuccessMessage(result.message);

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  }

  function handleRestoreDemoData() {
    const confirmed = window.confirm(
      "Restore the original Demo 2028 customers? Any customer changes made in this browser will be removed.",
    );

    if (!confirmed) return;

    restoreDemoCustomers();
    setSearch("");
    setSuccessMessage("Demo 2028 customers restored.");

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  }

  return (
    <AppShell>
      <main className="p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <Link
                href="/"
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-3 text-4xl font-bold tracking-tight">
                Customers
              </h1>

              <p className="mt-2 text-slate-500">
                Sharpes Lawn Care – Demo 2028
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRestoreDemoData}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Restore demo data
              </button>

              <button
                type="button"
                onClick={openAddCustomer}
                className="rounded-xl bg-[#176b37] px-5 py-3 font-semibold text-white transition hover:bg-[#125b2f]"
              >
                + Add customer
              </button>
            </div>
          </header>

          {successMessage && (
            <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 font-semibold text-green-800">
              {successMessage}
            </div>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <label className="block flex-1">
                <span className="sr-only">
                  Search customers
                </span>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search by name, customer number, address or postcode..."
                  className={inputClass}
                />
              </label>

              <div className="text-sm font-medium text-slate-500">
                {ready
                  ? `${filteredCustomers.length} customer${
                      filteredCustomers.length === 1
                        ? ""
                        : "s"
                    }`
                  : "Loading customers..."}
              </div>
            </div>
          </section>

          <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[100px_1.3fr_1.8fr_110px_110px_110px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
              <div>Number</div>
              <div>Customer</div>
              <div>Address</div>
              <div>Group</div>
              <div>Price</div>
              <div>Status</div>
            </div>

            {!ready ? (
              <div className="p-10 text-center text-slate-500">
                Loading GreenFlow customers...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                No customers match your search.
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <Link
                  key={customer.customerNumber}
                  href={`/customers/${customer.customerNumber}`}
                  className="grid gap-2 border-b border-slate-200 px-5 py-5 transition last:border-b-0 hover:bg-green-50 md:grid-cols-[100px_1.3fr_1.8fr_110px_110px_110px] md:items-center md:gap-4"
                >
                  <div className="font-bold text-[#176b37]">
                    {customer.customerNumber}
                  </div>

                  <div>
                    <div className="font-semibold">
                      {customer.fullName}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-2 text-xs md:hidden">
                      {customer.lockedGate && (
                        <span className="font-semibold text-red-600">
                          Locked gate
                        </span>
                      )}

                      {customer.dogOnProperty && (
                        <span className="font-semibold text-amber-700">
                          Dog
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-slate-600">
                    {customer.address}, {customer.postcode}
                  </div>

                  <div className="text-sm font-semibold">
                    Group {customer.groupNumber}
                  </div>

                  <div className="font-semibold">
                    £{customer.treatmentPrice.toFixed(2)}
                  </div>

                  <div>
                    <StatusBadge status={customer.status} />
                  </div>
                </Link>
              ))
            )}
          </section>
        </div>
      </main>

      {addingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleAddCustomer}
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-2xl font-bold">
                Add customer
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Create a customer in Sharpes Lawn Care – Demo
                2028.
              </p>
            </div>

            {formError && (
              <div className="mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700">
                {formError}
              </div>
            )}

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <FormField label="Customer number">
                <input
                  value={form.customerNumber}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      customerNumber: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Status">
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status:
                        event.target.value as CustomerStatus,
                    })
                  }
                  className={inputClass}
                >
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </FormField>

              <FormField label="First name">
                <input
                  value={form.firstName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      firstName: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Surname">
                <input
                  value={form.surname}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      surname: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Full name">
                <input
                  value={form.fullName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      fullName: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Preferred contact">
                <select
                  value={form.preferredContact}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      preferredContact:
                        event.target
                          .value as Customer["preferredContact"],
                    })
                  }
                  className={inputClass}
                >
                  <option value="SMS">SMS</option>
                  <option value="Email">Email</option>
                  <option value="Telephone">
                    Telephone
                  </option>
                </select>
              </FormField>

              <FormField label="Address">
                <input
                  value={form.address}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      address: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Postcode">
                <input
                  value={form.postcode}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      postcode:
                        event.target.value.toUpperCase(),
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Email address">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Mobile phone">
                <input
                  value={form.mobilePhone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      mobilePhone: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Home phone">
                <input
                  value={form.homePhone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      homePhone: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Lawn size (m²)">
                <input
                  type="number"
                  min="0"
                  value={form.lawnSize}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      lawnSize: event.target.value,
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
                  value={form.groupNumber}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      groupNumber: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Van number">
                <input
                  type="number"
                  min="1"
                  value={form.vanNumber}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      vanNumber: event.target.value,
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
                  value={form.treatmentPrice}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      treatmentPrice: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Next scheduled visit">
                <input
                  value={form.nextVisit}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      nextVisit: event.target.value,
                    })
                  }
                  placeholder="For example, 21 June 2028"
                  className={inputClass}
                />
              </FormField>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={form.lockedGate}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      lockedGate: event.target.checked,
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
                  checked={form.dogOnProperty}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      dogOnProperty: event.target.checked,
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
                    value={form.notes}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        notes: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </FormField>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                type="button"
                onClick={closeAddCustomer}
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-xl bg-[#176b37] px-5 py-3 font-semibold text-white hover:bg-[#125b2f]"
              >
                Save customer
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}

function createEmptyForm(
  customerNumber: string,
): CustomerForm {
  return {
    customerNumber,
    firstName: "",
    surname: "",
    fullName: "",
    address: "",
    postcode: "",
    email: "",
    homePhone: "",
    mobilePhone: "",
    lawnSize: "",
    groupNumber: "1",
    treatmentPrice: "18",
    status: "Active",
    vanNumber: "1",
    nextVisit: "",
    lastVisit: "",
    lockedGate: false,
    dogOnProperty: false,
    preferredContact: "SMS",
    notes: "",
  };
}

const inputClass =
  "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function StatusBadge({
  status,
}: {
  status: CustomerStatus;
}) {
  const styles =
    status === "Active"
      ? "bg-green-100 text-green-800"
      : status === "Paused"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-200 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles}`}
    >
      {status}
    </span>
  );
}