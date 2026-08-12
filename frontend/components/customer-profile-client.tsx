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
  type AdditionalCustomerJob,
  type StoredCustomer,
  useCustomerStore,
} from "@/components/customer-store";
import {
  type ProgrammeVisitStatus,
  useProgrammeStore,
} from "@/components/programme-store";
import { useSeasonStore } from "@/components/season-store";
import {
  type TreatmentRecord,
  useTreatmentStore,
} from "@/components/treatment-store";
import { useSettingsStore } from "@/components/settings-store";

type CustomerProfileClientProps = {
  customerNumber: string;
};

type TabId =
  | "overview"
  | "programme"
  | "additionalJobs"
  | "treatments"
  | "documents"
  | "communications"
  | "chemicals"
  | "notes";

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
    id: "additionalJobs",
    label: "Additional Jobs",
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
    settings,
    ready: settingsReady,
  } = useSettingsStore();

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
    addingAdditionalJob,
    setAddingAdditionalJob,
  ] = useState(false);

  const [
    additionalJobTreatmentId,
    setAdditionalJobTreatmentId,
  ] = useState("");

  const [
    additionalJobDate,
    setAdditionalJobDate,
  ] = useState("");

  const [
    additionalJobPrice,
    setAdditionalJobPrice,
  ] = useState("");

  const [
    additionalJobNotes,
    setAdditionalJobNotes,
  ] = useState("");

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
                  today &&
                !hasFinalTreatmentOutcomeForVisit(
                  treatments,
                  programme,
                  visit,
                  customerNumber,
                ),
            ),
        );

      return (
        programmeWithFutureVisit ??
        customerProgrammes[0] ??
        null
      );
    }, [
      customerProgrammes,
      treatments,
      customerNumber,
    ]);

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
              today &&
            !hasFinalTreatmentOutcomeForVisit(
              treatments,
              customerProgrammes.find(
                (programme) =>
                  programme.year ===
                    visit.programmeYear,
              )!,
              visit,
              customerNumber,
            ),
        )
        .sort(
          (first, second) =>
            first.scheduledDate.localeCompare(
              second.scheduledDate,
            ),
        )[0];
    }, [
      customerProgrammes,
      treatments,
      customerNumber,
    ]);

  const lastCompletedTreatment =
    customerTreatments.find(
      (treatment) =>
        treatment.status ===
        "Completed",
    );

  const activeTreatmentLibrary =
    settings.treatmentLibrary.filter(
      (treatment) =>
        treatment.active,
    );

  const additionalJobs =
    (customer?.additionalJobs ?? [])
      .slice()
      .sort(
        (first, second) =>
          first.scheduledDate.localeCompare(
            second.scheduledDate,
          ),
      );

  const nextAdditionalJob =
    additionalJobs.find(
      (job) =>
        job.status === "Scheduled" &&
        job.scheduledDate >=
          toDateValue(new Date()),
    );

  const nextOverallVisit =
    [
      nextProgrammeVisit
        ? {
            date:
              nextProgrammeVisit.scheduledDate,
            label:
              nextProgrammeVisit.treatmentName,
          }
        : null,
      nextAdditionalJob
        ? {
            date:
              nextAdditionalJob.scheduledDate,
            label:
              nextAdditionalJob.treatmentName,
          }
        : null,
    ]
      .filter(
        (
          item,
        ): item is {
          date: string;
          label: string;
        } => Boolean(item),
      )
      .sort(
        (first, second) =>
          first.date.localeCompare(
            second.date,
          ),
      )[0] ?? null;

  const ready =
    customersReady &&
    programmesReady &&
    seasonsReady &&
    treatmentsReady &&
    settingsReady;

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

  /*
   * Keep a stable non-null customer reference for
   * nested handlers. TypeScript does not preserve the
   * earlier narrowing through every callback closure.
   */
  const currentCustomer = customer;

  function beginEditing() {
  const currentCustomer =
    getCustomer(customerNumber);

  if (!currentCustomer) {
    setSavedMessage(
      "The customer record could not be loaded.",
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

    if (
      draft.groupNumber < 1
    ) {
      setSavedMessage(
        "Group number must be at least 1.",
      );
      return;
    }

    updateCustomer({
      ...draft,

      fullName:
        draft.fullName.trim() ||
        [
          draft.firstName.trim(),
          draft.surname.trim(),
        ]
          .filter(Boolean)
          .join(" "),
    });

    setEditing(false);

    setSavedMessage(
      "Customer changes saved. Their programme will automatically follow the dates assigned to the selected group.",
    );

    window.setTimeout(() => {
      setSavedMessage("");
    }, 3500);
  }

  function openAdditionalJobModal() {
    const firstTreatment =
      activeTreatmentLibrary[0];

    setAdditionalJobTreatmentId(
      firstTreatment?.id ?? "",
    );

    setAdditionalJobDate("");

    setAdditionalJobPrice(
      firstTreatment
        ? String(
            suggestedAdditionalJobPrice(
              firstTreatment.name,
              currentCustomer.treatmentPrice,
            ),
          )
        : String(
            currentCustomer.treatmentPrice,
          ),
    );

    setAdditionalJobNotes("");
    setAddingAdditionalJob(true);
  }

  function selectAdditionalJobTreatment(
    treatmentId: string,
  ) {
    setAdditionalJobTreatmentId(
      treatmentId,
    );

    const treatment =
      activeTreatmentLibrary.find(
        (item) =>
          item.id === treatmentId,
      );

    if (treatment) {
      setAdditionalJobPrice(
        String(
          suggestedAdditionalJobPrice(
            treatment.name,
            currentCustomer.treatmentPrice,
          ),
        ),
      );
    }
  }

  function saveAdditionalJob() {
    const treatment =
      activeTreatmentLibrary.find(
        (item) =>
          item.id ===
          additionalJobTreatmentId,
      );

    if (!treatment) {
      setSavedMessage(
        "Choose a treatment before adding the job.",
      );
      return;
    }

    if (
      additionalJobDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(
        additionalJobDate,
      )
    ) {
      setSavedMessage(
        "Choose a valid date or leave the job unscheduled.",
      );
      return;
    }

    const price =
      Number(
        additionalJobPrice,
      );

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      setSavedMessage(
        "Enter a valid price for the additional job.",
      );
      return;
    }

    const job: AdditionalCustomerJob = {
      id:
        `additional-job-${currentCustomer.customerNumber}-${Date.now()}`,
      treatmentLibraryId:
        treatment.id,
      treatmentName:
        treatment.name,
      wordingSnapshot:
        treatment.wording,
      scheduledDate:
        additionalJobDate,
      price,
      notes:
        additionalJobNotes.trim(),
      status:
        additionalJobDate
          ? "Scheduled"
          : "Unscheduled",
      createdAt:
        new Date().toISOString(),
    };

    const result =
      updateCustomer({
        ...currentCustomer,
        additionalJobs: [
          ...currentCustomer.additionalJobs,
          job,
        ],
      });

    if (!result.success) {
      setSavedMessage(
        result.message,
      );
      return;
    }

    setAddingAdditionalJob(false);
    setSavedMessage(
      additionalJobDate
        ? `${treatment.name} added for ${formatDate(
            additionalJobDate,
          )}.`
        : `${treatment.name} added as an unscheduled additional job.`,
    );

    window.setTimeout(() => {
      setSavedMessage("");
    }, 4000);
  }

  function cancelAdditionalJob(
    jobId: string,
  ) {
    const job =
      currentCustomer.additionalJobs.find(
        (item) =>
          item.id === jobId,
      );

    if (!job) {
      return;
    }

    const confirmed =
      window.confirm(
        `Cancel ${job.treatmentName} scheduled for ${formatDate(
          job.scheduledDate,
        )}?`,
      );

    if (!confirmed) {
      return;
    }

    updateCustomer({
      ...currentCustomer,
      additionalJobs:
        currentCustomer.additionalJobs.map(
          (item) =>
            item.id === jobId
              ? {
                  ...item,
                  status:
                    "Cancelled",
                }
              : item,
        ),
    });
  }

  function deleteAdditionalJob(
    jobId: string,
  ) {
    const job =
      currentCustomer.additionalJobs.find(
        (item) =>
          item.id === jobId,
      );

    if (
      !job ||
      job.status === "Completed"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete ${job.treatmentName} from this customer?`,
      );

    if (!confirmed) {
      return;
    }

    updateCustomer({
      ...currentCustomer,
      additionalJobs:
        currentCustomer.additionalJobs.filter(
          (item) =>
            item.id !== jobId,
        ),
    });
  }

  const aerationPrice =
    currentCustomer.treatmentPrice * 2;

  const scarificationPrice =
    currentCustomer.treatmentPrice * 3;

  return (
    <>
      <div className="flex h-[calc(100vh-9rem)] min-h-[590px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {savedMessage && (
          <div className="border-b border-green-200 bg-green-50 px-5 py-3 text-sm font-semibold text-green-800">
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
                  nextOverallVisit
                    ? formatDate(
                        nextOverallVisit.date,
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
                nextOverallVisit
                  ? `/jobs?date=${nextOverallVisit.date}`
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
              treatments={
                customerTreatments
              }
            />
          )}

          {activeTab ===
            "additionalJobs" && (
            <AdditionalJobsTab
              jobs={
                additionalJobs
              }
              onAddJob={
                openAdditionalJobModal
              }
              onCancelJob={
                cancelAdditionalJob
              }
              onDeleteJob={
                deleteAdditionalJob
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

      {addingAdditionalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  Add additional job
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {currentCustomer.fullName} · Customer {currentCustomer.customerNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setAddingAdditionalJob(
                    false,
                  )
                }
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 p-6">
              <FormField label="Treatment / service">
                <select
                  value={
                    additionalJobTreatmentId
                  }
                  onChange={(event) =>
                    selectAdditionalJobTreatment(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    Choose treatment
                  </option>

                  {activeTreatmentLibrary.map(
                    (treatment) => (
                      <option
                        key={
                          treatment.id
                        }
                        value={
                          treatment.id
                        }
                      >
                        {treatment.name}
                      </option>
                    ),
                  )}
                </select>
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Scheduled date (optional)">
                  <input
                    type="date"
                    value={
                      additionalJobDate
                    }
                    onChange={(event) =>
                      setAdditionalJobDate(
                        event.target.value,
                      )
                    }
                    className={
                      inputClass
                    }
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Leave blank to keep this job in the unscheduled additional-jobs queue.
                  </p>
                </FormField>

                <FormField label="Agreed price including VAT">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-2.5 font-semibold text-slate-500">
                      £
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        additionalJobPrice
                      }
                      onChange={(event) =>
                        setAdditionalJobPrice(
                          event.target.value,
                        )
                      }
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                </FormField>
              </div>

              <FormField label="Job notes">
                <textarea
                  rows={4}
                  value={
                    additionalJobNotes
                  }
                  onChange={(event) =>
                    setAdditionalJobNotes(
                      event.target.value,
                    )
                  }
                  placeholder="Access requirements, areas to concentrate on, customer request or other job-specific information."
                  className={inputClass}
                />
              </FormField>

              {additionalJobTreatmentId && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                  <div className="font-bold">
                    Customer wording snapshot
                  </div>

                  <p className="mt-1">
                    {activeTreatmentLibrary.find(
                      (treatment) =>
                        treatment.id ===
                        additionalJobTreatmentId,
                    )?.wording ||
                      "No customer wording has been entered for this treatment yet."}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() =>
                  setAddingAdditionalJob(
                    false,
                  )
                }
                className="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  saveAdditionalJob
                }
                className="rounded-xl bg-[#176b37] px-5 py-2.5 font-semibold text-white hover:bg-[#125b2f]"
              >
                Add job
              </button>
            </div>
          </div>
        </div>
      )}

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
                  value={
                    draft.groupNumber
                  }
                  onChange={(event) =>
                    setDraft({
                      ...draft,

                      groupNumber:
                        Math.max(
                          1,
                          Number(
                            event.target
                              .value,
                          ) || 1,
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
                  value={draft.lawnSize}
                  onChange={(event) =>
                    setDraft({
                      ...draft,

                      lawnSize:
                        Math.max(
                          0,
                          Number(
                            event.target
                              .value,
                          ) || 0,
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
                        Math.max(
                          0,
                          Number(
                            event.target
                              .value,
                          ) || 0,
                        ),
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
                        Math.max(
                          1,
                          Number(
                            event.target
                              .value,
                          ) || 1,
                        ),
                    })
                  }
                  className={inputClass}
                />
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

function AdditionalJobsTab({
  jobs,
  onAddJob,
  onCancelJob,
  onDeleteJob,
}: {
  jobs: AdditionalCustomerJob[];
  onAddJob: () => void;
  onCancelJob: (
    jobId: string,
  ) => void;
  onDeleteJob: (
    jobId: string,
  ) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">
            Additional Jobs
          </h2>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            One-off or extra services for this customer. Jobs can be saved without a date and scheduled later from the central Additional Jobs Planner. These sit alongside the normal seasonal programme and do not replace any of the five standard visits.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddJob}
          className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#125b2f]"
        >
          + Add job
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <div className="font-bold text-slate-800">
            No additional jobs
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Add Scarification, Aeration, Overseeding or any other service from the Treatment Library.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {jobs.map((job) => (
            <article
              key={job.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold">
                      {job.treatmentName}
                    </h3>

                    <AdditionalJobStatusBadge
                      status={job.status}
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                    <span>
                      <strong>Date:</strong>{" "}
                      {job.scheduledDate
                        ? formatDate(
                            job.scheduledDate,
                          )
                        : "Unscheduled"}
                    </span>

                    <span>
                      <strong>Price:</strong>{" "}
                      £
                      {job.price.toFixed(
                        2,
                      )}
                    </span>
                  </div>

                  {job.notes && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {job.notes}
                    </p>
                  )}
                </div>

                {job.status !==
                  "Completed" && (
                  <div className="flex flex-wrap gap-2">
                    {job.status ===
                      "Scheduled" && (
                      <button
                        type="button"
                        onClick={() =>
                          onCancelJob(
                            job.id,
                          )
                        }
                        className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50"
                      >
                        Cancel job
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        onDeleteJob(
                          job.id,
                        )
                      }
                      className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-xs font-bold text-slate-600">
                  Customer wording saved with this job
                </summary>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {job.wordingSnapshot ||
                    "No wording snapshot was available when this job was created."}
                </p>
              </details>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function AdditionalJobStatusBadge({
  status,
}: {
  status:
    AdditionalCustomerJob["status"];
}) {
  const styles =
    status === "Completed"
      ? "bg-green-100 text-green-800"
      : status === "Cancelled"
        ? "bg-slate-200 text-slate-600"
        : status === "Unscheduled"
          ? "bg-amber-100 text-amber-800"
          : "bg-blue-100 text-blue-800";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}
    >
      {status}
    </span>
  );
}

function suggestedAdditionalJobPrice(
  treatmentName: string,
  standardTreatmentPrice: number,
) {
  const name =
    treatmentName
      .trim()
      .toLowerCase();

  if (
    name.includes(
      "scarif",
    )
  ) {
    return Number(
      (
        standardTreatmentPrice *
        3
      ).toFixed(2),
    );
  }

  if (
    name.includes(
      "aerat",
    )
  ) {
    return Number(
      (
        standardTreatmentPrice *
        2
      ).toFixed(2),
    );
  }

  return Number(
    standardTreatmentPrice.toFixed(
      2,
    ),
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
}: {
  customer: StoredCustomer;
  nextVisit: string;
  lastVisit: string;
  hasProgramme: boolean;
  treatmentPrice: number;
  aerationPrice: number;
  scarificationPrice: number;
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
          value={`Van ${customer.vanNumber}`}
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

function treatmentMatchesProgrammeVisit(
  treatment: TreatmentRecord,
  programme: ReturnType<
    typeof useProgrammeStore
  >["programmes"][number],
  visit: ReturnType<
    typeof useProgrammeStore
  >["programmes"][number]["visits"][number],
  customerNumber: string,
) {
  const directlyLinked =
    Boolean(
      treatment.programmeId &&
        treatment.programmeVisitId &&
        treatment.programmeId ===
          programme.id &&
        treatment.programmeVisitId ===
          visit.id,
    );

  if (directlyLinked) {
    return true;
  }

  /*
   * Older GreenFlow treatment records may pre-date
   * programme/visit IDs. Match those records using the
   * same safe fallback already used by Visits and Routes.
   */
  return (
    !treatment.programmeVisitId &&
    treatment.customerNumber ===
      customerNumber &&
    treatment.scheduledDate ===
      visit.scheduledDate &&
    treatment.treatmentName ===
      visit.treatmentName
  );
}

function getEffectiveProgrammeVisitStatus(
  treatments: TreatmentRecord[],
  programme: ReturnType<
    typeof useProgrammeStore
  >["programmes"][number],
  visit: ReturnType<
    typeof useProgrammeStore
  >["programmes"][number]["visits"][number],
  customerNumber: string,
) {
  const outcome =
    treatments.find(
      (treatment) =>
        (
          treatment.status ===
            "Completed" ||
          treatment.status ===
            "Cancelled"
        ) &&
        treatmentMatchesProgrammeVisit(
          treatment,
          programme,
          visit,
          customerNumber,
        ),
    );

  if (
    outcome?.status ===
    "Completed"
  ) {
    return "Completed" as const;
  }

  if (
    outcome?.status ===
    "Cancelled"
  ) {
    return "Skipped" as const;
  }

  return visit.status;
}

function hasFinalTreatmentOutcomeForVisit(
  treatments: TreatmentRecord[],
  programme: ReturnType<
    typeof useProgrammeStore
  >["programmes"][number],
  visit: ReturnType<
    typeof useProgrammeStore
  >["programmes"][number]["visits"][number],
  customerNumber: string,
) {
  const status =
    getEffectiveProgrammeVisitStatus(
      treatments,
      programme,
      visit,
      customerNumber,
    );

  return (
    status === "Completed" ||
    status === "Skipped"
  );
}

function ProgrammeTab({
  customer,
  programme,
  season,
  treatments,
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

  treatments:
    TreatmentRecord[];
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

              const effectiveStatus =
                visit && programme
                  ? getEffectiveProgrammeVisitStatus(
                      treatments,
                      programme,
                      visit,
                      customer.customerNumber,
                    )
                  : null;

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
                        effectiveStatus ??
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