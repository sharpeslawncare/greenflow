"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { CustomerTreatmentHistory } from "@/components/customer-treatment-history";
import {
  type StoredCustomer,
  useCustomerStore,
} from "@/components/customer-store";
import {
  type ProgrammeVisitStatus,
  useProgrammeStore,
} from "@/components/programme-store";
import { useSeasonStore } from "@/components/season-store";
import { useTreatmentStore } from "@/components/treatment-store";
import { useFleetStore } from "@/components/fleet-store";

type CustomerProfileClientProps = {
  customerNumber: string;
};

type TabId =
  | "overview"
  | "programme"
  | "treatments"
  | "documents"
  | "communications"
  | "chemicals"
  | "notes";

type ProfileMessageTone =
  | "success"
  | "error";

const tabs: Array<{
  id: TabId;
  label: string;
}> = [
  {
    id: "overview",
    label: "Overview",
  },
  {
    id: "programme",
    label: "Programme",
  },
  {
    id: "treatments",
    label: "Treatments",
  },
  {
    id: "documents",
    label: "Documents",
  },
  {
    id: "communications",
    label: "Communications",
  },
  {
    id: "chemicals",
    label: "Chemicals",
  },
  {
    id: "notes",
    label: "Notes",
  },
];

function isTabId(
  value: string | null,
): value is TabId {
  return tabs.some(
    (tab) => tab.id === value,
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

export function CustomerProfileClient({
  customerNumber,
}: CustomerProfileClientProps) {
  const searchParams =
    useSearchParams();

  const requestedTab =
    searchParams.get("tab");

  const {
    getCustomer,
    updateCustomer,
    ready: customersReady,
  } = useCustomerStore();

  const {
    programmes,
    ready: programmesReady,
  } = useProgrammeStore();

  const {
    seasons,
    ready: seasonsReady,
  } = useSeasonStore();

  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const {
    vehicles,
    activeVehicles,
    ready: fleetReady,
  } = useFleetStore();

  const customer =
    getCustomer(customerNumber);

  const [activeTab, setActiveTab] =
    useState<TabId>(
      isTabId(requestedTab)
        ? requestedTab
        : "overview",
    );

  const [draft, setDraft] =
    useState<StoredCustomer | null>(
      customer ?? null,
    );

  const [editing, setEditing] =
    useState(false);

  const [
    savedMessage,
    setSavedMessage,
  ] = useState("");

  const [
    savedMessageTone,
    setSavedMessageTone,
  ] = useState<ProfileMessageTone>(
    "success",
  );

  useEffect(() => {
    if (!customer) {
      return;
    }

    setDraft({
      ...customer,
    });

    setEditing(false);

    setActiveTab(
      isTabId(requestedTab)
        ? requestedTab
        : "overview",
    );
  }, [
    customerNumber,
    customer,
    requestedTab,
  ]);

  const customerProgrammes =
    useMemo(
      () =>
        programmes
          .filter(
            (programme) =>
              programme.customerNumber ===
              customerNumber,
          )
          .sort(
            (first, second) =>
              second.year -
              first.year,
          ),
      [
        programmes,
        customerNumber,
      ],
    );

  const selectedProgramme =
    useMemo(() => {
      const today =
        toDateValue(new Date());

      const programmeWithFutureVisit =
        customerProgrammes.find(
          (programme) =>
            programme.visits.some(
              (visit) =>
                (visit.status ===
                  "Scheduled" ||
                  visit.status ===
                    "Planned") &&
                visit.scheduledDate >=
                  today,
            ),
        );

      return (
        programmeWithFutureVisit ??
        customerProgrammes[0] ??
        null
      );
    }, [customerProgrammes]);

  const selectedSeason =
    selectedProgramme
      ? seasons.find(
          (season) =>
            season.year ===
            selectedProgramme.year,
        ) ?? null
      : null;

  const customerTreatments =
    useMemo(
      () =>
        treatments
          .filter(
            (treatment) =>
              treatment.customerNumber ===
              customerNumber,
          )
          .sort(
            (first, second) =>
              getTreatmentDate(
                second,
              ).localeCompare(
                getTreatmentDate(
                  first,
                ),
              ),
          ),
      [
        treatments,
        customerNumber,
      ],
    );

  const customerChemicalTreatments =
    useMemo(
      () =>
        customerTreatments.filter(
          (treatment) =>
            treatment.status ===
              "Completed" &&
            Boolean(
              treatment.chemicalName,
            ) &&
            treatment.productRequired >
              0,
        ),
      [customerTreatments],
    );

  const nextProgrammeVisit =
    useMemo(() => {
      const today =
        toDateValue(new Date());

      return customerProgrammes
        .flatMap(
          (programme) =>
            programme.visits.map(
              (visit) => ({
                ...visit,
                programmeYear:
                  programme.year,
              }),
            ),
        )
        .filter(
          (visit) =>
            (visit.status ===
              "Scheduled" ||
              visit.status ===
                "Planned") &&
            visit.scheduledDate >=
              today,
        )
        .sort(
          (first, second) =>
            first.scheduledDate.localeCompare(
              second.scheduledDate,
            ),
        )[0];
    }, [customerProgrammes]);

  const lastCompletedTreatment =
    customerTreatments.find(
      (treatment) =>
        treatment.status ===
        "Completed",
    );

  const ready =
    customersReady &&
    programmesReady &&
    seasonsReady &&
    treatmentsReady &&
    fleetReady;

  if (!ready) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
        Loading customer profile...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-red-800">
        Customer {customerNumber} could not
        be found.
      </div>
    );
  }

  function showProfileMessage(
    text: string,
    tone: ProfileMessageTone = "success",
  ) {
    setSavedMessage(text);
    setSavedMessageTone(tone);

    window.setTimeout(() => {
      setSavedMessage("");
    }, 3500);
  }

  function beginEditing() {
  const currentCustomer =
    getCustomer(customerNumber);

  if (!currentCustomer) {
    showProfileMessage(
      "The customer record could not be loaded.",
      "error",
    );
    return;
  }

  setDraft({
    ...currentCustomer,
  });

  setEditing(true);
  setSavedMessage("");
}

function cancelEditing() {
  const currentCustomer =
    getCustomer(customerNumber);

  if (currentCustomer) {
    setDraft({
      ...currentCustomer,
    });
  }

  setEditing(false);
}

  function saveCustomer() {
    if (!draft) {
      return;
    }

    const currentCustomer =
      getCustomer(customerNumber);

    if (!currentCustomer) {
      showProfileMessage(
        "The customer record could not be loaded.",
        "error",
      );
      return;
    }

    const firstName =
      draft.firstName.trim();

    const surname =
      draft.surname.trim();

    const fullName =
      draft.fullName.trim() ||
      [firstName, surname]
        .filter(Boolean)
        .join(" ");

    const address =
      draft.address.trim();

    const postcode =
      draft.postcode
        .trim()
        .toUpperCase();

    const email =
      draft.email.trim();

    const mobilePhone =
      draft.mobilePhone.trim();

    const homePhone =
      draft.homePhone.trim();

    if (!firstName && !surname) {
      showProfileMessage(
        "Enter at least a first name or surname.",
        "error",
      );
      return;
    }

    if (!address) {
      showProfileMessage(
        "Enter the customer's address.",
        "error",
      );
      return;
    }

    if (!postcode) {
      showProfileMessage(
        "Enter the customer's postcode.",
        "error",
      );
      return;
    }

    if (
      email &&
      !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(
        email,
      )
    ) {
      showProfileMessage(
        "Enter a valid email address or leave the email field blank.",
        "error",
      );
      return;
    }

    if (
      !email &&
      !mobilePhone &&
      !homePhone
    ) {
      showProfileMessage(
        "Enter at least one contact method: email, mobile phone or home phone.",
        "error",
      );
      return;
    }

    if (
      draft.preferredContact === "Email" &&
      !email
    ) {
      showProfileMessage(
        "Enter an email address when Email is the preferred contact method.",
        "error",
      );
      return;
    }

    if (
      draft.preferredContact === "SMS" &&
      !mobilePhone
    ) {
      showProfileMessage(
        "Enter a mobile phone number when SMS is the preferred contact method.",
        "error",
      );
      return;
    }

    if (
      draft.preferredContact === "Telephone" &&
      !mobilePhone &&
      !homePhone
    ) {
      showProfileMessage(
        "Enter a mobile or home phone number when Telephone is the preferred contact method.",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(
        draft.lawnSize,
      ) ||
      draft.lawnSize <= 0
    ) {
      showProfileMessage(
        "Lawn size must be a valid number greater than 0 m².",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(
        draft.treatmentPrice,
      ) ||
      draft.treatmentPrice <= 0
    ) {
      showProfileMessage(
        "Treatment price must be a valid amount greater than £0.00.",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(
        draft.groupNumber,
      ) ||
      !Number.isInteger(
        draft.groupNumber,
      ) ||
      draft.groupNumber < 1
    ) {
      showProfileMessage(
        "Group number must be a positive whole number.",
        "error",
      );
      return;
    }

    const selectedVehicle =
      vehicles.find(
        (vehicle) =>
          vehicle.number ===
          draft.vanNumber,
      );

    if (!selectedVehicle) {
      showProfileMessage(
        "Choose a van that exists in the fleet.",
        "error",
      );
      return;
    }

    const currentVehicle =
      vehicles.find(
        (vehicle) =>
          vehicle.number ===
          currentCustomer.vanNumber,
      );

    const keepingCurrentInactiveVan =
      currentVehicle &&
      !currentVehicle.active &&
      currentVehicle.number ===
        draft.vanNumber;

    if (
      !selectedVehicle.active &&
      !keepingCurrentInactiveVan
    ) {
      showProfileMessage(
        "Choose an active van. Inactive vans cannot be newly assigned to a customer.",
        "error",
      );
      return;
    }

    if (
      draft.programmeStartDate &&
      !isDateValue(
        draft.programmeStartDate,
      )
    ) {
      showProfileMessage(
        "Enter a valid programme eligibility date or leave it blank.",
        "error",
      );
      return;
    }

    updateCustomer({
      ...draft,
      firstName,
      surname,
      fullName,
      address,
      postcode,
      email,
      mobilePhone,
      homePhone,
      lawnSize:
        Number(
          draft.lawnSize,
        ),
      treatmentPrice:
        Number(
          draft.treatmentPrice.toFixed(
            2,
          ),
        ),
      groupNumber:
        Math.floor(
          draft.groupNumber,
        ),
      vanNumber:
        draft.vanNumber,
      notes: draft.notes.trim(),
    });

    setEditing(false);

    showProfileMessage(
      "Customer changes saved. Their programme will automatically follow the dates assigned to the selected group.",
    );
  }

  function vehiclesLabel(
    vanNumber: number,
  ) {
    const vehicle =
      vehicles.find(
        (item) =>
          item.number ===
          vanNumber,
      );

    if (!vehicle) {
      return `Van ${vanNumber} — missing`;
    }

    return vehicle.active
      ? vehicle.name
      : `${vehicle.name} — inactive`;
  }

  const aerationPrice =
    customer.treatmentPrice * 2;

  const scarificationPrice =
    customer.treatmentPrice * 3;

  return (
    <>
      <div className="flex h-[calc(100vh-9rem)] min-h-[590px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {savedMessage && (
          <div
            role={
              savedMessageTone === "error"
                ? "alert"
                : "status"
            }
            className={`border-b px-5 py-3 text-sm font-semibold ${
              savedMessageTone === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-green-200 bg-green-50 text-green-800"
            }`}
          >
            {savedMessage}
          </div>
        )}

        <section className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {customer.fullName}
                </h1>

                <StatusBadge
                  status={
                    customer.status
                  }
                />

                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                  Group{" "}
                  {
                    customer.groupNumber
                  }
                </span>
              </div>

              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                <span>
                  Customer #
                  {
                    customer.customerNumber
                  }
                </span>

                <span>
                  {customer.address},{" "}
                  {customer.postcode}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-7 gap-y-2 text-right sm:grid-cols-4">
              <HeaderStat
                label="Next visit"
                value={
                  nextProgrammeVisit
                    ? formatDate(
                        nextProgrammeVisit.scheduledDate,
                      )
                    : "None scheduled"
                }
                highlight
              />

              <HeaderStat
                label="Last completed"
                value={
                  lastCompletedTreatment
                    ? formatDate(
                        getTreatmentDate(
                          lastCompletedTreatment,
                        ),
                      )
                    : "No history"
                }
              />

              <HeaderStat
                label="Price"
                value={`£${customer.treatmentPrice.toFixed(
                  2,
                )}`}
              />

              <HeaderStat
                label="Lawn"
                value={`${customer.lawnSize.toLocaleString(
                  "en-GB",
                )} m²`}
              />
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            <Link
              href={
                nextProgrammeVisit
                  ? `/jobs?date=${nextProgrammeVisit.scheduledDate}`
                  : "/jobs"
              }
              className="rounded-lg bg-[#176b37] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#125b2f]"
            >
              Open jobs
            </Link>

            <button
              type="button"
              onClick={beginEditing}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-slate-100"
            >
              Edit customer
            </button>

          </div>
        </section>

        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 px-5">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={`?tab=${tab.id}`}
              onClick={() =>
                setActiveTab(
                  tab.id,
                )
              }
              className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-[#176b37] text-[#176b37]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <section className="min-h-0 flex-1 overflow-auto p-5">
          {activeTab ===
            "overview" && (
            <OverviewTab
              customer={customer}
              nextVisit={
                nextProgrammeVisit
                  ? formatDate(
                      nextProgrammeVisit.scheduledDate,
                    )
                  : "None scheduled"
              }
              lastVisit={
                lastCompletedTreatment
                  ? formatDate(
                      getTreatmentDate(
                        lastCompletedTreatment,
                      ),
                    )
                  : "No completed treatment"
              }
              hasProgramme={
                customerProgrammes.length >
                0
              }
              treatmentPrice={
                customer.treatmentPrice
              }
              aerationPrice={
                aerationPrice
              }
              scarificationPrice={
                scarificationPrice
              }
              vehiclesLabel={
                vehiclesLabel
              }
            />
          )}

          {activeTab ===
            "programme" && (
            <ProgrammeTab
              customer={customer}
              programme={
                selectedProgramme
              }
              season={
                selectedSeason
              }
            />
          )}

          {activeTab ===
            "treatments" && (
            <CustomerTreatmentHistory
              customerNumber={
                customer.customerNumber
              }
            />
          )}

          {activeTab ===
            "documents" && (
            <CustomerModuleTab
              title="Customer documents"
              description="Open the Document Centre already filtered to this customer."
              href={`/documents?customer=${customer.customerNumber}`}
              actionLabel="Open customer documents"
              emptyText="No embedded customer document list is available yet. The linked Document Centre remains the source of truth."
            />
          )}

          {activeTab ===
            "communications" && (
            <CustomerModuleTab
              title="Customer communications"
              description="Open Communications with this customer already identified."
              href={`/communications?customer=${customer.customerNumber}`}
              actionLabel="Open customer communications"
              emptyText="Communication history will appear here once the Communications store exposes customer-linked records."
            />
          )}

          {activeTab ===
            "chemicals" && (
            <ChemicalHistoryTab
              treatments={
                customerChemicalTreatments
              }
            />
          )}

          {activeTab === "notes" && (
            <NotesTab
              notes={customer.notes}
            />
          )}
        </section>
      </div>

      {editing && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold">
                  Edit customer
                </h2>

                <p className="text-sm text-slate-500">
                  Customer #
                  {
                    customer.customerNumber
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={
                  cancelEditing
                }
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
                      firstName:
                        event.target
                          .value,
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
                      surname:
                        event.target
                          .value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Display name">
                <input
                  value={draft.fullName}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      fullName:
                        event.target
                          .value,
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
                          .value as StoredCustomer["status"],
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

              <div className="md:col-span-2">
                <FormField label="Address">
                  <input
                    value={draft.address}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        address:
                          event.target
                            .value,
                      })
                    }
                    className={inputClass}
                  />
                </FormField>
              </div>

              <FormField label="Postcode">
                <input
                  value={draft.postcode}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      postcode:
                        event.target
                          .value,
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
                      email:
                        event.target
                          .value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Mobile phone">
                <input
                  value={
                    draft.mobilePhone
                  }
                  onChange={(event) =>
                    setDraft({
                      ...draft,

                      mobilePhone:
                        event.target
                          .value,
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
                      homePhone:
                        event.target
                          .value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Preferred contact">
                <select
                  value={
                    draft.preferredContact
                  }
                  onChange={(event) =>
                    setDraft({
                      ...draft,

                      preferredContact:
                        event.target
                          .value as StoredCustomer["preferredContact"],
                    })
                  }
                  className={inputClass}
                >
                  <option value="SMS">
                    SMS
                  </option>

                  <option value="Email">
                    Email
                  </option>

                  <option value="Telephone">
                    Telephone
                  </option>
                </select>
              </FormField>

              <FormField label="Assigned group">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={
                    draft.groupNumber
                  }
                  onChange={(event) =>
                    setDraft({
                      ...draft,

                      groupNumber:
                        Number(
                          event.target
                            .value,
                        ),
                    })
                  }
                  className={inputClass}
                />

                <p className="mt-1 text-xs text-slate-500">
                  Changing this automatically moves
                  the customer onto the dates assigned
                  to the new group.
                </p>
              </FormField>

              <FormField label="Programme eligibility date">
                <input
                  type="date"
                  value={
                    draft.programmeStartDate
                  }
                  onChange={(event) =>
                    setDraft({
                      ...draft,

                      programmeStartDate:
                        event.target
                          .value,
                    })
                  }
                  className={inputClass}
                />

                <p className="mt-1 text-xs text-slate-500">
                  Leave blank for an established
                  customer. For a new customer, past
                  treatment rounds before this date
                  are excluded.
                </p>
              </FormField>

              <FormField label="Lawn size (m²)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.lawnSize}
                  onChange={(event) =>
                    setDraft({
                      ...draft,

                      lawnSize:
                        Number(
                          event.target
                            .value,
                        ),
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Treatment price (£)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    draft.treatmentPrice
                  }
                  onChange={(event) =>
                    setDraft({
                      ...draft,

                      treatmentPrice:
                        Number(
                          event.target
                            .value,
                        ),
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Assigned van">
                <select
                  value={draft.vanNumber}
                  onChange={(event) =>
                    setDraft({
                      ...draft,

                      vanNumber:
                        Number(
                          event.target
                            .value,
                        ),
                    })
                  }
                  className={inputClass}
                >
                  {(() => {
                    const currentVehicle =
                      vehicles.find(
                        (vehicle) =>
                          vehicle.number ===
                          draft.vanNumber,
                      );

                    const currentIsInactive =
                      currentVehicle &&
                      !currentVehicle.active;

                    return (
                      <>
                        {currentIsInactive && (
                          <option
                            value={
                              currentVehicle.number
                            }
                          >
                            {currentVehicle.name} — inactive
                          </option>
                        )}

                        {!currentVehicle &&
                          draft.vanNumber > 0 && (
                            <option
                              value={
                                draft.vanNumber
                              }
                            >
                              Van {draft.vanNumber} — missing from fleet
                            </option>
                          )}

                        {activeVehicles.map(
                          (vehicle) => (
                            <option
                              key={
                                vehicle.id
                              }
                              value={
                                vehicle.number
                              }
                            >
                              {vehicle.name}
                            </option>
                          ),
                        )}
                      </>
                    );
                  })()}
                </select>

                <p className="mt-1 text-xs text-slate-500">
                  Only active fleet vehicles can be newly assigned. An existing inactive assignment remains visible until you deliberately change it.
                </p>
              </FormField>

              <FormField label="Access and property alerts">
                <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                  <CheckboxField
                    label="Locked gate"
                    checked={
                      draft.lockedGate
                    }
                    onChange={(checked) =>
                      setDraft({
                        ...draft,
                        lockedGate:
                          checked,
                      })
                    }
                  />

                  <CheckboxField
                    label="Dog on property"
                    checked={
                      draft.dogOnProperty
                    }
                    onChange={(checked) =>
                      setDraft({
                        ...draft,
                        dogOnProperty:
                          checked,
                      })
                    }
                  />
                </div>
              </FormField>

              <div className="md:col-span-2">
                <FormField label="Customer notes">
                  <textarea
                    rows={5}
                    value={draft.notes}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        notes:
                          event.target
                            .value,
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
                onClick={
                  cancelEditing
                }
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
  nextVisit,
  lastVisit,
  hasProgramme,
  treatmentPrice,
  aerationPrice,
  scarificationPrice,
  vehiclesLabel,
}: {
  customer: StoredCustomer;
  nextVisit: string;
  lastVisit: string;
  hasProgramme: boolean;
  treatmentPrice: number;
  aerationPrice: number;
  scarificationPrice: number;
  vehiclesLabel: (
    vanNumber: number,
  ) => string;
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
            customer.homePhone ||
            "Not recorded"
          }
        />

        <CompactRow
          label="Email"
          value={
            customer.email ||
            "Not recorded"
          }
        />

        <CompactRow
          label="Preferred"
          value={
            customer.preferredContact
          }
        />
      </CompactCard>

      <CompactCard title="Scheduling">
        <CompactRow
          label="Assigned group"
          value={`Group ${customer.groupNumber}`}
        />

        <CompactRow
          label="Next visit"
          value={nextVisit}
        />

        <CompactRow
          label="Last completed"
          value={lastVisit}
        />

        <CompactRow
          label="Eligibility"
          value={
            customer.programmeStartDate
              ? formatDate(
                  customer.programmeStartDate,
                )
              : "Established customer"
          }
        />
      </CompactCard>

      <CompactCard title="Property and alerts">
        <CompactRow
          label="Lawn size"
          value={`${customer.lawnSize.toLocaleString(
            "en-GB",
          )} m²`}
        />

        <CompactRow
          label="Van"
          value={
            vehiclesLabel(
              customer.vanNumber,
            )
          }
        />

        <AlertRow
          label="Locked gate"
          active={
            customer.lockedGate
          }
        />

        <AlertRow
          label="Dog on property"
          active={
            customer.dogOnProperty
          }
        />

        <AlertRow
          label="Inherited programme"
          active={hasProgramme}
          positive
        />
      </CompactCard>

      <div className="lg:col-span-3">
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
      </div>
    </div>
  );
}

function ProgrammeTab({
  customer,
  programme,
  season,
}: {
  customer: StoredCustomer;

  programme:
    | ReturnType<
        typeof useProgrammeStore
      >["programmes"][number]
    | null;

  season:
    | ReturnType<
        typeof useSeasonStore
      >["seasons"][number]
    | null;
}) {
  if (!season) {
    return (
      <EmptyState>
        No Season Calendar is available for this
        customer&apos;s programme year.
      </EmptyState>
    );
  }

  const groupDates =
    season.groupDates.find(
      (group) =>
        group.groupNumber ===
        customer.groupNumber,
    );

  if (!groupDates) {
    return (
      <EmptyState>
        Group {customer.groupNumber} is outside the
        configured range for {season.year}.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <div>
          <div className="font-bold">
            Group {customer.groupNumber} inherited
            schedule
          </div>

          <p className="mt-1">
            These treatment names and standard dates
            come directly from the {season.year} Season
            Calendar.
          </p>
        </div>

        <Link
          href="/programmes"
          className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-blue-900 hover:bg-blue-100"
        >
          Review overrides
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[70px_1.4fr_180px_180px_130px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            <span>Round</span>
            <span>Treatment</span>
            <span>Group date</span>
            <span>Customer date</span>
            <span>Status</span>
          </div>

          {season.treatmentRounds.map(
            (round, index) => {
              const visit =
                programme?.visits.find(
                  (item) =>
                    item.visitNumber ===
                    round.visitNumber,
                ) ?? null;

              const groupDate =
                groupDates
                  .treatmentDates[index];

              const overridden =
                Boolean(
                  visit &&
                    visit.scheduledDate !==
                      groupDate,
                );

              return (
                <div
                  key={
                    round.visitNumber
                  }
                  className="grid grid-cols-[70px_1.4fr_180px_180px_130px] items-center gap-3 border-t border-slate-100 px-4 py-4 text-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#176b37] font-bold text-white">
                    {
                      round.visitNumber
                    }
                  </span>

                  <div>
                    <div className="font-bold">
                      {
                        round.treatmentName
                      }
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {index === 0
                        ? "Season starting round"
                        : `${round.gapAfterPreviousDays} day standard gap`}
                    </div>
                  </div>

                  <span className="font-semibold">
                    {formatDate(
                      groupDate,
                    )}
                  </span>

                  <div>
                    {visit ? (
                      <>
                        <div className="font-semibold">
                          {formatDate(
                            visit.scheduledDate,
                          )}
                        </div>

                        {overridden && (
                          <div className="mt-1 text-xs font-bold text-amber-700">
                            Customer override
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          Not included
                        </span>

                        <div className="mt-2 text-xs text-slate-500">
                          This round was before the
                          customer became eligible.
                        </div>
                      </>
                    )}
                  </div>

                  {visit ? (
                    <ProgrammeStatus
                      status={
                        visit.status
                      }
                    />
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">
                      Unavailable
                    </span>
                  )}
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerModuleTab({
  title,
  description,
  href,
  actionLabel,
  emptyText,
}: {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
      <h2 className="text-xl font-bold">
        {title}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        {description}
      </p>

      <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        {emptyText}
      </div>

      <Link
        href={href}
        className="mt-5 inline-flex rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function ChemicalHistoryTab({
  treatments,
}: {
  treatments: ReturnType<
    typeof useTreatmentStore
  >["treatments"];
}) {
  if (treatments.length === 0) {
    return (
      <EmptyState>
        No completed chemical applications are recorded for this customer.
      </EmptyState>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <div className="min-w-[950px]">
        <div className="grid grid-cols-[120px_1.25fr_1.25fr_130px_120px_110px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          <span>Date</span>
          <span>Treatment</span>
          <span>Chemical</span>
          <span>Product</span>
          <span>Water</span>
          <span>Cost</span>
        </div>

        {treatments.map(
          (treatment) => (
            <div
              key={treatment.id}
              className="grid grid-cols-[120px_1.25fr_1.25fr_130px_120px_110px] items-center gap-3 border-t border-slate-100 px-4 py-4 text-sm"
            >
              <span>
                {formatDate(
                  getTreatmentDate(
                    treatment,
                  ),
                )}
              </span>

              <span className="font-semibold">
                {
                  treatment.treatmentName
                }
              </span>

              <div>
                <div className="font-semibold">
                  {
                    treatment.chemicalName
                  }
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {
                    treatment.chemicalType ||
                    "Product"
                  }
                </div>
              </div>

              <span>
                {
                  treatment.productRequired
                }{" "}
                {
                  treatment.productUnit
                }
              </span>

              <span>
                {treatment.waterRequiredLitres.toFixed(
                  2,
                )}{" "}
                L
              </span>

              <span className="font-semibold">
                £
                {treatment.estimatedProductCost.toFixed(
                  2,
                )}
              </span>
            </div>
          ),
        )}
      </div>
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
        price={
          scarificationPrice
        }
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

      <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">
        {notes ||
          "No customer notes recorded."}
      </p>
    </div>
  );
}

function getTreatmentDate(
  treatment: {
    completedDate: string;
    scheduledDate: string;
    recordedDate: string;
  },
) {
  return (
    treatment.completedDate ||
    treatment.scheduledDate ||
    treatment.recordedDate.slice(
      0,
      10,
    )
  );
}

function parseDate(
  value: string,
) {
  const [year, month, day] =
    value
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day,
  );
}

function isDateValue(
  value: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const date =
    parseDate(value);

  return (
    !Number.isNaN(
      date.getTime(),
    ) &&
    toDateValue(date) === value
  );
}

function toDateValue(
  date: Date,
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      date.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(
  value: string,
) {
  if (!isDateValue(value)) {
    return "No date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(parseDate(value));
}

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

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (
    checked: boolean,
  ) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm">
      <span className="font-semibold">
        {label}
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked,
          )
        }
        className="h-5 w-5"
      />
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
  status: StoredCustomer["status"];
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
  status: ProgrammeVisitStatus;
}) {
  const style =
    status === "Completed"
      ? "bg-green-100 text-green-800"
      : status === "Scheduled"
        ? "bg-blue-100 text-blue-800"
        : status === "Planned"
          ? "bg-slate-100 text-slate-700"
          : "bg-amber-100 text-amber-800";

  return (
    <span
      className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${style}`}
    >
      {status}
    </span>
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
      <h2 className="font-bold">
        {title}
      </h2>

      <div className="mt-2 text-3xl font-bold text-[#176b37]">
        £{price.toFixed(2)}
      </div>

      <p className="mt-1 text-sm text-slate-500">
        {detail}
      </p>
    </article>
  );
}

function EmptyState({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}