"use client";

import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";
import { useProgrammeStore } from "@/components/programme-store";
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

type CustomerTab =
  | "Active"
  | "Paused"
  | "Cancelled";

type SortKey =
  | "customerNumber"
  | "fullName"
  | "address"
  | "postcode"
  | "phone"
  | "email"
  | "vanNumber"
  | "groupNumber"
  | "lawnSize"
  | "annualValue";

type SortDirection =
  | "ascending"
  | "descending";

type CustomerRow = {
  customer: Customer;
  annualValue: number;
};

const PAGE_SIZE = 25;

export default function CustomersPage() {
  const {
    customers,
    ready: customersReady,
    addCustomer,
    getNextCustomerNumber,
    restoreDemoCustomers,
  } = useCustomerStore();

  const {
    programmes,
    ready: programmesReady,
  } = useProgrammeStore();

  const [search, setSearch] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<CustomerTab>(
      "Active",
    );

  const [sortKey, setSortKey] =
    useState<SortKey>(
      "customerNumber",
    );

  const [
    sortDirection,
    setSortDirection,
  ] =
    useState<SortDirection>(
      "ascending",
    );

  const [currentPage, setCurrentPage] =
    useState(1);

  const [
    openMenuCustomerNumber,
    setOpenMenuCustomerNumber,
  ] = useState("");

  const [
    addingCustomer,
    setAddingCustomer,
  ] = useState(false);

  const [formError, setFormError] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [form, setForm] =
    useState<CustomerForm>(() =>
      createEmptyForm("1006"),
    );

  const statusCounts =
    useMemo(
      () => ({
        Active:
          customers.filter(
            (customer) =>
              customer.status ===
              "Active",
          ).length,

        Paused:
          customers.filter(
            (customer) =>
              customer.status ===
              "Paused",
          ).length,

        Cancelled:
          customers.filter(
            (customer) =>
              customer.status ===
              "Inactive",
          ).length,
      }),
      [customers],
    );

  const customerRows =
    useMemo<CustomerRow[]>(() => {
      const query =
        search.trim().toLowerCase();

      const requiredStatus =
        activeTab === "Cancelled"
          ? "Inactive"
          : activeTab;

      const rows =
        customers
          .filter(
            (customer) =>
              customer.status ===
              requiredStatus,
          )
          .filter(
            (customer) =>
              !query ||
              [
                customer.customerNumber,
                customer.fullName,
                customer.address,
                customer.postcode,
                customer.mobilePhone,
                customer.homePhone,
                customer.email,
                String(
                  customer.vanNumber,
                ),
                String(
                  customer.groupNumber,
                ),
              ].some((value) =>
                value
                  .toLowerCase()
                  .includes(query),
              ),
          )
          .map((customer) => {
            const customerProgrammes =
              programmes
                .filter(
                  (programme) =>
                    programme.customerNumber ===
                    customer.customerNumber,
                )
                .sort(
                  (first, second) =>
                    second.year -
                    first.year,
                );

            const currentProgramme =
              customerProgrammes[0];

            const chargeableVisits =
              currentProgramme
                ? currentProgramme.visits.filter(
                    (visit) =>
                      visit.status !==
                      "Skipped",
                  ).length
                : 0;

            return {
              customer,

              annualValue:
                customer.treatmentPrice *
                chargeableVisits,
            };
          });

      return rows.sort(
        (first, second) => {
          const result =
            compareRows(
              first,
              second,
              sortKey,
            );

          return sortDirection ===
            "ascending"
            ? result
            : -result;
        },
      );
    }, [
      customers,
      programmes,
      activeTab,
      search,
      sortKey,
      sortDirection,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        customerRows.length /
          PAGE_SIZE,
      ),
    );

  const safePage =
    Math.min(
      currentPage,
      totalPages,
    );

  const paginatedRows =
    customerRows.slice(
      (safePage - 1) *
        PAGE_SIZE,
      safePage * PAGE_SIZE,
    );

  const firstDisplayed =
    customerRows.length === 0
      ? 0
      : (safePage - 1) *
          PAGE_SIZE +
        1;

  const lastDisplayed =
    Math.min(
      safePage * PAGE_SIZE,
      customerRows.length,
    );

  const ready =
    customersReady &&
    programmesReady;

  function openAddCustomer() {
    setForm(
      createEmptyForm(
        getNextCustomerNumber(),
      ),
    );

    setFormError("");
    setAddingCustomer(true);
  }

  function closeAddCustomer() {
    setAddingCustomer(false);
    setFormError("");
  }

  function handleAddCustomer(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFormError("");

    const customerNumber =
      form.customerNumber.trim();
    const fullName =
      form.fullName.trim();
    const address =
      form.address.trim();
    const postcode =
      form.postcode.trim().toUpperCase();
    const email =
      form.email.trim();
    const homePhone =
      form.homePhone.trim();
    const mobilePhone =
      form.mobilePhone.trim();

    const lawnSize =
      Number(form.lawnSize);
    const groupNumber =
      Number(form.groupNumber);
    const treatmentPrice =
      Number(form.treatmentPrice);
    const vanNumber =
      Number(form.vanNumber);

    const validationErrors: string[] = [];

    if (!customerNumber) {
      validationErrors.push(
        "Enter a customer number.",
      );
    } else if (
      customers.some(
        (customer) =>
          customer.customerNumber.trim() ===
          customerNumber,
      )
    ) {
      validationErrors.push(
        `Customer number ${customerNumber} already exists.`,
      );
    }

    if (!fullName) {
      validationErrors.push(
        "Enter the customer's full name.",
      );
    }

    if (!address) {
      validationErrors.push(
        "Enter the customer's address.",
      );
    }

    if (!postcode) {
      validationErrors.push(
        "Enter the customer's postcode.",
      );
    }

    if (
      !email &&
      !mobilePhone &&
      !homePhone
    ) {
      validationErrors.push(
        "Enter at least one contact method: email, mobile phone or home phone.",
      );
    }

    if (
      form.lawnSize.trim() === "" ||
      !Number.isFinite(lawnSize) ||
      lawnSize < 0
    ) {
      validationErrors.push(
        "Lawn size must be a valid number of 0 m² or more.",
      );
    }

    if (
      form.groupNumber.trim() === "" ||
      !Number.isInteger(groupNumber) ||
      groupNumber < 1
    ) {
      validationErrors.push(
        "Group number must be a whole number of 1 or greater.",
      );
    }

    if (
      form.vanNumber.trim() === "" ||
      !Number.isInteger(vanNumber) ||
      vanNumber < 1
    ) {
      validationErrors.push(
        "Van number must be a whole number of 1 or greater.",
      );
    }

    if (
      form.treatmentPrice.trim() === "" ||
      !Number.isFinite(treatmentPrice) ||
      treatmentPrice < 0
    ) {
      validationErrors.push(
        "Treatment price must be a valid amount of £0 or more.",
      );
    }

    if (
      email &&
      !isValidEmailAddress(email)
    ) {
      validationErrors.push(
        "Enter a valid email address or leave the email field blank.",
      );
    }

    if (
      form.preferredContact === "SMS" &&
      !mobilePhone
    ) {
      validationErrors.push(
        "Preferred contact is SMS, so enter a mobile phone number.",
      );
    }

    if (
      form.preferredContact === "Email" &&
      !email
    ) {
      validationErrors.push(
        "Preferred contact is Email, so enter an email address.",
      );
    }

    if (
      form.preferredContact === "Telephone" &&
      !mobilePhone &&
      !homePhone
    ) {
      validationErrors.push(
        "Preferred contact is Telephone, so enter a mobile or home phone number.",
      );
    }

    if (validationErrors.length > 0) {
      setFormError(
        validationErrors.join(" • "),
      );
      return;
    }

    const customer: Customer = {
      customerNumber,
      firstName: form.firstName.trim(),
      surname: form.surname.trim(),
      fullName,
      address,
      postcode,
      email,
      homePhone,
      mobilePhone,
      lawnSize,
      groupNumber,
      treatmentPrice,
      status: form.status,
      vanNumber,
      nextVisit:
        form.nextVisit.trim() ||
        "Not yet scheduled",
      lastVisit:
        form.lastVisit.trim() ||
        "No previous visit",
      lockedGate: form.lockedGate,
      dogOnProperty: form.dogOnProperty,
      preferredContact:
        form.preferredContact,
      notes: form.notes.trim(),
    };

    const result =
      addCustomer(customer);

    if (!result.success) {
      setFormError(
        result.message,
      );
      return;
    }

    setAddingCustomer(false);
    setActiveTab(
      customer.status ===
        "Inactive"
        ? "Cancelled"
        : customer.status,
    );

    setCurrentPage(1);
    setSuccessMessage(
      result.message,
    );

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  }

  function handleRestoreDemoData() {
    const confirmed =
      window.confirm(
        "Restore the original Demo 2028 customers? Any customer changes made in this browser will be removed.",
      );

    if (!confirmed) {
      return;
    }

    restoreDemoCustomers();
    setSearch("");
    setActiveTab("Active");
    setCurrentPage(1);

    setSuccessMessage(
      "Demo 2028 customers restored.",
    );

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  }

  function changeTab(
    tab: CustomerTab,
  ) {
    setActiveTab(tab);
    setCurrentPage(1);
    setOpenMenuCustomerNumber("");
  }

  function changeSort(
    nextKey: SortKey,
  ) {
    if (sortKey === nextKey) {
      setSortDirection(
        (current) =>
          current ===
          "ascending"
            ? "descending"
            : "ascending",
      );
    } else {
      setSortKey(nextKey);
      setSortDirection(
        "ascending",
      );
    }

    setCurrentPage(1);
    setOpenMenuCustomerNumber("");
  }

  function toggleQuickMenu(
    customerNumber: string,
  ) {
    setOpenMenuCustomerNumber(
      (current) =>
        current ===
        customerNumber
          ? ""
          : customerNumber,
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1750px]">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Customer Centre
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage customer accounts, contact details and programme values.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={
                  handleRestoreDemoData
                }
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Restore demo data
              </button>

              <button
                type="button"
                onClick={
                  openAddCustomer
                }
                className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#125b2f]"
              >
                + Add Customer
              </button>
            </div>
          </header>

          {successMessage && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {
                successMessage
              }
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <nav className="flex overflow-x-auto border-b border-slate-200 px-3">
              <CustomerTabButton
                label="Active"
                count={
                  statusCounts.Active
                }
                active={
                  activeTab ===
                  "Active"
                }
                onClick={() =>
                  changeTab(
                    "Active",
                  )
                }
              />

              <CustomerTabButton
                label="Paused"
                count={
                  statusCounts.Paused
                }
                active={
                  activeTab ===
                  "Paused"
                }
                onClick={() =>
                  changeTab(
                    "Paused",
                  )
                }
              />

              <Link
                href="/enquiries"
                className="whitespace-nowrap border-b-2 border-transparent px-5 py-4 text-sm font-semibold text-slate-500 transition hover:border-green-200 hover:text-[#176b37]"
              >
                Quotes
              </Link>

              <CustomerTabButton
                label="Cancelled"
                count={
                  statusCounts.Cancelled
                }
                active={
                  activeTab ===
                  "Cancelled"
                }
                onClick={() =>
                  changeTab(
                    "Cancelled",
                  )
                }
              />
            </nav>

            <div className="p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(
                      event.target.value,
                    );
                    setCurrentPage(1);
                  }}
                  placeholder="Search by customer, number, address, postcode, phone or email"
                  className={inputClass}
                />

                <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-900">
                  Number of{" "}
                  {activeTab} Customers{" "}
                  {
                    customerRows.length
                  }
                </div>
              </div>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <div className="min-w-[1450px]">
                <div className="sticky top-0 z-10 grid grid-cols-[100px_1.25fr_1.6fr_115px_135px_1.4fr_70px_75px_90px_110px_56px] border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
                  <SortHeader
                    label="Cust. ID"
                    sortKey="customerNumber"
                    currentSortKey={sortKey}
                    direction={sortDirection}
                    onSort={changeSort}
                  />

                  <SortHeader
                    label="Customer"
                    sortKey="fullName"
                    currentSortKey={sortKey}
                    direction={sortDirection}
                    onSort={changeSort}
                  />

                  <SortHeader
                    label="Address"
                    sortKey="address"
                    currentSortKey={sortKey}
                    direction={sortDirection}
                    onSort={changeSort}
                  />

                  <SortHeader
                    label="Postcode"
                    sortKey="postcode"
                    currentSortKey={sortKey}
                    direction={sortDirection}
                    onSort={changeSort}
                  />

                  <SortHeader
                    label="Phone"
                    sortKey="phone"
                    currentSortKey={sortKey}
                    direction={sortDirection}
                    onSort={changeSort}
                  />

                  <SortHeader
                    label="Email"
                    sortKey="email"
                    currentSortKey={sortKey}
                    direction={sortDirection}
                    onSort={changeSort}
                  />

                  <SortHeader
                    label="Van"
                    sortKey="vanNumber"
                    currentSortKey={sortKey}
                    direction={sortDirection}
                    onSort={changeSort}
                    centred
                  />

                  <SortHeader
                    label="Group"
                    sortKey="groupNumber"
                    currentSortKey={sortKey}
                    direction={sortDirection}
                    onSort={changeSort}
                    centred
                  />

                  <SortHeader
                    label="Lawn"
                    sortKey="lawnSize"
                    currentSortKey={sortKey}
                    direction={sortDirection}
                    onSort={changeSort}
                    centred
                  />

                  <SortHeader
                    label="Annual Value"
                    sortKey="annualValue"
                    currentSortKey={sortKey}
                    direction={sortDirection}
                    onSort={changeSort}
                    centred
                  />

                  <div />
                </div>

                {!ready ? (
                  <div className="p-12 text-center text-slate-500">
                    Loading GreenFlow customers...
                  </div>
                ) : paginatedRows.length ===
                  0 ? (
                  <div className="p-12 text-center text-slate-500">
                    No{" "}
                    {activeTab.toLowerCase()}{" "}
                    customers match the current search.
                  </div>
                ) : (
                  <div>
                    {paginatedRows.map(
                      ({
                        customer,
                        annualValue,
                      }, index) => (
                        <div
                          key={
                            customer.customerNumber
                          }
                          className={`relative grid grid-cols-[100px_1.25fr_1.6fr_115px_135px_1.4fr_70px_75px_90px_110px_56px] items-center border-b border-slate-100 text-sm transition last:border-0 hover:bg-green-50 ${
                            index %
                              2 ===
                            0
                              ? "bg-white"
                              : "bg-slate-50/70"
                          }`}
                        >
                          <TableCell className="font-bold">
                            <Link
                              href={`/customers/${customer.customerNumber}`}
                              className="text-[#176b37] hover:underline"
                            >
                              {
                                customer.customerNumber
                              }
                            </Link>
                          </TableCell>

                          <TableCell>
                            <Link
                              href={`/customers/${customer.customerNumber}`}
                              className="font-semibold text-slate-900 hover:text-[#176b37] hover:underline"
                            >
                              {
                                customer.fullName
                              }
                            </Link>

                            {(customer.lockedGate ||
                              customer.dogOnProperty) && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {customer.lockedGate && (
                                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                    Locked gate
                                  </span>
                                )}

                                {customer.dogOnProperty && (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                    Dog
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="text-slate-700">
                            {
                              customer.address
                            }
                          </TableCell>

                          <TableCell className="font-medium">
                            {
                              customer.postcode
                            }
                          </TableCell>

                          <TableCell className="text-slate-700">
                            {customer.mobilePhone ||
                              customer.homePhone ||
                              "—"}
                          </TableCell>

                          <TableCell className="truncate text-slate-700">
                            {customer.email ||
                              "—"}
                          </TableCell>

                          <TableCell centred>
                            {
                              customer.vanNumber
                            }
                          </TableCell>

                          <TableCell centred>
                            {
                              customer.groupNumber
                            }
                          </TableCell>

                          <TableCell centred>
                            {customer.lawnSize.toLocaleString(
                              "en-GB",
                            )}{" "}
                            m²
                          </TableCell>

                          <TableCell
                            centred
                            className="font-semibold"
                          >
                            £
                            {annualValue.toFixed(
                              2,
                            )}
                          </TableCell>

                          <div className="relative flex justify-center px-2 py-3.5">
                            <button
                              type="button"
                              onClick={() =>
                                toggleQuickMenu(
                                  customer.customerNumber,
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-xl font-bold text-[#176b37] transition hover:bg-green-100"
                              aria-label={`Open actions for ${customer.fullName}`}
                              aria-expanded={
                                openMenuCustomerNumber ===
                                customer.customerNumber
                              }
                            >
                              ⋮
                            </button>

                            {openMenuCustomerNumber ===
                              customer.customerNumber && (
                              <div className="absolute right-3 top-12 z-30 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
                                <QuickActionLink
                                  href={`/customers/${customer.customerNumber}`}
                                  label="Open customer"
                                  onClick={() =>
                                    setOpenMenuCustomerNumber("")
                                  }
                                />

                                <QuickActionLink
                                  href={`/customers/${customer.customerNumber}?tab=programme`}
                                  label="Annual programme"
                                  onClick={() =>
                                    setOpenMenuCustomerNumber("")
                                  }
                                />

                                <QuickActionLink
                                  href={`/customers/${customer.customerNumber}?tab=treatments`}
                                  label="Treatment history"
                                  onClick={() =>
                                    setOpenMenuCustomerNumber("")
                                  }
                                />

                                <QuickActionLink
                                  href={`/customers/${customer.customerNumber}?tab=documents`}
                                  label="Documents"
                                  onClick={() =>
                                    setOpenMenuCustomerNumber("")
                                  }
                                />

                                <QuickActionLink
                                  href={`/customers/${customer.customerNumber}?tab=communications`}
                                  label="Communications"
                                  onClick={() =>
                                    setOpenMenuCustomerNumber("")
                                  }
                                />

                                <QuickActionLink
                                  href={`/customers/${customer.customerNumber}?tab=chemicals`}
                                  label="Chemical usage"
                                  onClick={() =>
                                    setOpenMenuCustomerNumber("")
                                  }
                                />

                                <div className="my-2 border-t border-slate-100" />

                                <QuickActionLink
                                  href={`/visit-centre?customer=${customer.customerNumber}`}
                                  label="Open in Visit Centre"
                                  onClick={() =>
                                    setOpenMenuCustomerNumber("")
                                  }
                                  emphasized
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm">
              <span className="text-slate-500">
                Showing{" "}
                {
                  firstDisplayed
                }{" "}
                to{" "}
                {
                  lastDisplayed
                }{" "}
                of{" "}
                {
                  customerRows.length
                }{" "}
                customers
              </span>

              <div className="flex items-center gap-2">
                <PageButton
                  label="‹"
                  disabled={
                    safePage === 1
                  }
                  onClick={() =>
                    setCurrentPage(
                      Math.max(
                        1,
                        safePage - 1,
                      ),
                    )
                  }
                />

                {getPageNumbers(
                  safePage,
                  totalPages,
                ).map(
                  (page, index) =>
                    page ===
                    "ellipsis" ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 text-slate-400"
                      >
                        …
                      </span>
                    ) : (
                      <PageButton
                        key={page}
                        label={String(
                          page,
                        )}
                        active={
                          page ===
                          safePage
                        }
                        onClick={() =>
                          setCurrentPage(
                            page,
                          )
                        }
                      />
                    ),
                )}

                <PageButton
                  label="›"
                  disabled={
                    safePage ===
                    totalPages
                  }
                  onClick={() =>
                    setCurrentPage(
                      Math.min(
                        totalPages,
                        safePage + 1,
                      ),
                    )
                  }
                />
              </div>
            </footer>
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
                  <option value="Inactive">Cancelled</option>
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
                  step="1"
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
                  step="1"
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
  children: ReactNode;
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


function isValidEmailAddress(
  value: string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

function compareRows(
  first: CustomerRow,
  second: CustomerRow,
  sortKey: SortKey,
) {
  const firstCustomer =
    first.customer;

  const secondCustomer =
    second.customer;

  switch (sortKey) {
    case "customerNumber":
      return compareCustomerNumbers(
        firstCustomer.customerNumber,
        secondCustomer.customerNumber,
      );

    case "fullName":
      return firstCustomer.fullName.localeCompare(
        secondCustomer.fullName,
      );

    case "address":
      return firstCustomer.address.localeCompare(
        secondCustomer.address,
      );

    case "postcode":
      return firstCustomer.postcode.localeCompare(
        secondCustomer.postcode,
      );

    case "phone":
      return (
        firstCustomer.mobilePhone ||
        firstCustomer.homePhone
      ).localeCompare(
        secondCustomer.mobilePhone ||
          secondCustomer.homePhone,
      );

    case "email":
      return firstCustomer.email.localeCompare(
        secondCustomer.email,
      );

    case "vanNumber":
      return (
        firstCustomer.vanNumber -
        secondCustomer.vanNumber
      );

    case "groupNumber":
      return (
        firstCustomer.groupNumber -
        secondCustomer.groupNumber
      );

    case "lawnSize":
      return (
        firstCustomer.lawnSize -
        secondCustomer.lawnSize
      );

    case "annualValue":
      return (
        first.annualValue -
        second.annualValue
      );
  }
}

function compareCustomerNumbers(
  first: string,
  second: string,
) {
  const firstNumber =
    Number(first);

  const secondNumber =
    Number(second);

  if (
    Number.isFinite(
      firstNumber,
    ) &&
    Number.isFinite(
      secondNumber,
    )
  ) {
    return (
      firstNumber -
      secondNumber
    );
  }

  return first.localeCompare(
    second,
  );
}

function CustomerTabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap border-b-2 px-5 py-4 text-sm font-semibold transition ${
        active
          ? "border-[#176b37] text-[#176b37]"
          : "border-transparent text-slate-500 hover:border-green-200 hover:text-[#176b37]"
      }`}
    >
      {label} ({count})
    </button>
  );
}

function SortHeader({
  label,
  sortKey,
  currentSortKey,
  direction,
  onSort,
  centred = false,
}: {
  label: string;
  sortKey: SortKey;
  currentSortKey: SortKey;
  direction: SortDirection;
  onSort: (
    sortKey: SortKey,
  ) => void;
  centred?: boolean;
}) {
  const active =
    currentSortKey ===
    sortKey;

  return (
    <button
      type="button"
      onClick={() =>
        onSort(sortKey)
      }
      className={`flex min-h-14 items-center gap-1 border-r border-slate-200 px-3 py-3 text-left transition hover:bg-green-50 ${
        centred
          ? "justify-center text-center"
          : ""
      }`}
    >
      <span>
        {label}
      </span>

      <span
        className={
          active
            ? "text-[#176b37]"
            : "text-slate-300"
        }
      >
        {active
          ? direction ===
            "ascending"
            ? "▲"
            : "▼"
          : "↕"}
      </span>
    </button>
  );
}

function TableCell({
  children,
  className = "",
  centred = false,
}: {
  children: ReactNode;
  className?: string;
  centred?: boolean;
}) {
  return (
    <div
      className={`min-w-0 px-3 py-3.5 ${
        centred
          ? "text-center"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

function QuickActionLink({
  href,
  label,
  onClick,
  emphasized = false,
}: {
  href: string;
  label: string;
  onClick: () => void;
  emphasized?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block px-4 py-2.5 text-sm font-semibold transition ${
        emphasized
          ? "text-[#176b37] hover:bg-green-50"
          : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}

function PageButton({
  label,
  onClick,
  disabled = false,
  active = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-w-9 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-[#176b37] bg-[#176b37] text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {label}
    </button>
  );
}

function getPageNumbers(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from(
      {
        length:
          totalPages,
      },
      (_, index) =>
        index + 1,
    );
  }

  const pages:
    Array<
      number | "ellipsis"
    > = [1];

  if (currentPage > 4) {
    pages.push(
      "ellipsis",
    );
  }

  const start =
    Math.max(
      2,
      currentPage - 1,
    );

  const end =
    Math.min(
      totalPages - 1,
      currentPage + 1,
    );

  for (
    let page = start;
    page <= end;
    page += 1
  ) {
    pages.push(page);
  }

  if (
    currentPage <
    totalPages - 3
  ) {
    pages.push(
      "ellipsis",
    );
  }

  pages.push(
    totalPages,
  );

  return pages;
}