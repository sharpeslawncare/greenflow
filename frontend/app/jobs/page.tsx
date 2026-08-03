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
import {
  type CustomerProgramme,
  type ProgrammeVisit,
  useProgrammeStore,
} from "@/components/programme-store";
import { useSettingsStore } from "@/components/settings-store";
import {
  type TreatmentRecord,
  type TreatmentStatus,
  useTreatmentStore,
} from "@/components/treatment-store";
import type { Customer } from "@/lib/demo-customers";

type WorkingJob = {
  key: string;
  programmeId: string;
  visitId: string;
  customerNumber: string;
  selected: boolean;
  fertiliser: string;
  herbicide: string;
  otherMaterials: string;
  notes: string;
};

type ScheduledItem = {
  programme: CustomerProgramme;
  visit: ProgrammeVisit;
};

type ValidJob = {
  job: WorkingJob;
  programme: CustomerProgramme;
  visit: ProgrammeVisit;
  customer: Customer;
};

const fertiliserOptions = [
  "ProTurf Spring",
  "ProTurf Summer",
  "ProTurf Autumn",
  "Moss Control Granules",
  "None",
];

const herbicideOptions = [
  "Pastor Pro",
  "Dicophar",
  "Hurler",
  "None",
];

export default function JobsPage() {
  const {
    customers,
    ready: customersReady,
    updateCustomer,
  } = useCustomerStore();

  const {
    programmes,
    ready: programmesReady,
    saveProgramme,
  } = useProgrammeStore();

  const {
    addTreatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const {
    ready: settingsReady,
    reserveInvoiceNumbers,
  } = useSettingsStore();

  const availableDates = useMemo(() => {
    return Array.from(
      new Set(
        programmes.flatMap((programme) =>
          programme.visits
            .filter(
              (visit) =>
                visit.status === "Scheduled" ||
                visit.status === "Planned",
            )
            .map(
              (visit) => visit.scheduledDate,
            ),
        ),
      ),
    ).sort();
  }, [programmes]);

  const [selectedDate, setSelectedDate] =
    useState("");

  const [selectedGroup, setSelectedGroup] =
    useState("All");

  const [selectedVan, setSelectedVan] =
    useState("All");

  const [jobs, setJobs] =
    useState<WorkingJob[]>([]);

  const [
    defaultFertiliser,
    setDefaultFertiliser,
  ] = useState("ProTurf Spring");

  const [
    defaultHerbicide,
    setDefaultHerbicide,
  ] = useState("Pastor Pro");

  const [
    defaultOtherMaterials,
    setDefaultOtherMaterials,
  ] = useState("");

  const [defaultNotes, setDefaultNotes] =
    useState("");

  const [rescheduleDate, setRescheduleDate] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    if (
      selectedDate ||
      availableDates.length === 0
    ) {
      return;
    }

    const today = toDateValue(new Date());

    const nextAvailableDate =
      availableDates.find(
        (date) => date >= today,
      ) ?? availableDates[0];

    setSelectedDate(nextAvailableDate);
    setRescheduleDate(nextAvailableDate);
  }, [availableDates, selectedDate]);

  const scheduledItems =
    useMemo<ScheduledItem[]>(() => {
      if (!selectedDate) {
        return [];
      }

      return programmes.flatMap(
        (programme) =>
          programme.visits
            .filter(
              (visit) =>
                visit.scheduledDate ===
                  selectedDate &&
                (visit.status ===
                  "Scheduled" ||
                  visit.status ===
                    "Planned"),
            )
            .map((visit) => ({
              programme,
              visit,
            })),
      );
    }, [programmes, selectedDate]);

  const filteredItems =
    useMemo<ScheduledItem[]>(() => {
      return scheduledItems.filter(
        ({ programme }) => {
          const customer = customers.find(
            (item) =>
              item.customerNumber ===
              programme.customerNumber,
          );

          if (!customer) {
            return false;
          }

          const matchesGroup =
            selectedGroup === "All" ||
            customer.groupNumber ===
              Number(selectedGroup);

          const matchesVan =
            selectedVan === "All" ||
            customer.vanNumber ===
              Number(selectedVan);

          return (
            customer.status === "Active" &&
            matchesGroup &&
            matchesVan
          );
        },
      );
    }, [
      scheduledItems,
      customers,
      selectedGroup,
      selectedVan,
    ]);

  useEffect(() => {
    setJobs((currentJobs) =>
      filteredItems.map(
        ({ programme, visit }) => {
          const key = createJobKey(
            programme.id,
            visit.id,
          );

          const existingJob =
            currentJobs.find(
              (job) => job.key === key,
            );

          if (existingJob) {
            return existingJob;
          }

          return {
            key,
            programmeId: programme.id,
            visitId: visit.id,
            customerNumber:
              programme.customerNumber,
            selected: false,
            fertiliser:
              defaultFertiliser,
            herbicide:
              defaultHerbicide,
            otherMaterials: "",
            notes: "",
          };
        },
      ),
    );
  }, [
    filteredItems,
    defaultFertiliser,
    defaultHerbicide,
  ]);

  const selectedJobs = jobs.filter(
    (job) => job.selected,
  );

  const displayedCustomers = jobs
    .map((job) =>
      customers.find(
        (customer) =>
          customer.customerNumber ===
          job.customerNumber,
      ),
    )
    .filter(
      (customer): customer is Customer =>
        Boolean(customer),
    );

  const totalArea =
    displayedCustomers.reduce(
      (total, customer) =>
        total + customer.lawnSize,
      0,
    );

  const selectedArea =
    selectedJobs.reduce(
      (total, job) => {
        const customer = customers.find(
          (item) =>
            item.customerNumber ===
            job.customerNumber,
        );

        return (
          total +
          (customer?.lawnSize ?? 0)
        );
      },
      0,
    );

  const expectedValue =
    displayedCustomers.reduce(
      (total, customer) =>
        total + customer.treatmentPrice,
      0,
    );

  const groups = useMemo(() => {
    return Array.from(
      new Set(
        customers
          .filter(
            (customer) =>
              customer.status === "Active",
          )
          .map(
            (customer) =>
              customer.groupNumber,
          ),
      ),
    ).sort(
      (first, second) =>
        first - second,
    );
  }, [customers]);

  const allSelected =
    jobs.length > 0 &&
    jobs.every((job) => job.selected);

  function toggleAllJobs() {
    setJobs((current) =>
      current.map((job) => ({
        ...job,
        selected: !allSelected,
      })),
    );
  }

  function toggleJob(jobKey: string) {
    setJobs((current) =>
      current.map((job) =>
        job.key === jobKey
          ? {
              ...job,
              selected: !job.selected,
            }
          : job,
      ),
    );
  }

  function applyProductsToSelected() {
    if (selectedJobs.length === 0) {
      showMessage(
        "Select at least one job first.",
      );
      return;
    }

    setJobs((current) =>
      current.map((job) =>
        job.selected
          ? {
              ...job,
              fertiliser:
                defaultFertiliser,
              herbicide:
                defaultHerbicide,
              otherMaterials:
                defaultOtherMaterials,
              notes: defaultNotes,
            }
          : job,
      ),
    );

    showMessage(
      `Products applied to ${
        selectedJobs.length
      } selected job${
        selectedJobs.length === 1
          ? ""
          : "s"
      }.`,
    );
  }

  function completeSelectedJobs() {
    processSelectedJobs("Completed");
  }

  function cancelSelectedJobs() {
    processSelectedJobs("Cancelled");
  }

  function processSelectedJobs(
    status: TreatmentStatus,
  ) {
    if (selectedJobs.length === 0) {
      showMessage(
        "Select at least one job first.",
      );
      return;
    }

    const validJobs: ValidJob[] =
      selectedJobs.flatMap((job) => {
        const programme =
          programmes.find(
            (item) =>
              item.id ===
              job.programmeId,
          );

        const visit =
          programme?.visits.find(
            (item) =>
              item.id === job.visitId,
          );

        const customer =
          customers.find(
            (item) =>
              item.customerNumber ===
              job.customerNumber,
          );

        if (
          !programme ||
          !visit ||
          !customer
        ) {
          return [];
        }

        return [
          {
            job,
            programme,
            visit,
            customer,
          },
        ];
      });

    if (validJobs.length === 0) {
      showMessage(
        "The selected jobs could not be processed.",
      );
      return;
    }

    const invoiceNumbers =
      status === "Completed"
        ? reserveInvoiceNumbers(
            validJobs.length,
          )
        : [];

    const now = new Date();
    const today = toDateValue(now);

    const records: TreatmentRecord[] =
      validJobs.map(
        (
          {
            job,
            programme,
            visit,
            customer,
          },
          index,
        ) => {
          const updatedProgramme =
            updateProgrammeVisitStatus(
              programme,
              visit.id,
              status === "Completed"
                ? "Completed"
                : "Skipped",
            );

          saveProgramme(
            updatedProgramme,
          );

          const nextVisitDate =
            findNextVisitDate(
              updatedProgramme,
              visit,
            );

          if (status === "Completed") {
            updateCustomer({
              ...customer,
              lastVisit:
                formatLongDate(today),
              nextVisit:
                nextVisitDate,
            });
          }

          return {
            id: createTreatmentId(
              customer.customerNumber,
              visit.visitNumber,
              index,
            ),

            invoiceNumber:
              status === "Completed"
                ? invoiceNumbers[index] ??
                  ""
                : "",

            customerNumber:
              customer.customerNumber,

            scheduledDate:
              visit.scheduledDate,

            recordedDate:
              now.toISOString(),

            completedDate:
              status === "Completed"
                ? today
                : "",

            status,

            treatmentName:
              visit.treatmentName,

            fertiliser:
              job.fertiliser,

            herbicide:
              job.herbicide,

            otherMaterials:
              job.otherMaterials,

            notes:
              job.notes,

            nextVisitDate,
          };
        },
      );

    addTreatments(records);

    const selectedKeys = new Set(
      selectedJobs.map(
        (job) => job.key,
      ),
    );

    setJobs((current) =>
      current.filter(
        (job) =>
          !selectedKeys.has(job.key),
      ),
    );

    if (status === "Completed") {
      const firstInvoice =
        records[0]?.invoiceNumber ??
        "";

      const lastInvoice =
        records[
          records.length - 1
        ]?.invoiceNumber ?? "";

      if (records.length === 1) {
        showMessage(
          `1 job completed. Invoice ${firstInvoice} was assigned.`,
        );
      } else {
        showMessage(
          `${records.length} jobs completed. Invoices ${firstInvoice} to ${lastInvoice} were assigned.`,
        );
      }

      return;
    }

    showMessage(
      `${records.length} job${
        records.length === 1
          ? ""
          : "s"
      } recorded as ${status.toLowerCase()}.`,
    );
  }

  function rescheduleSelectedJobs() {
    if (selectedJobs.length === 0) {
      showMessage(
        "Select at least one job first.",
      );
      return;
    }

    if (!rescheduleDate) {
      showMessage(
        "Choose a new visit date.",
      );
      return;
    }

    const now = new Date();

    const records: TreatmentRecord[] =
      [];

    selectedJobs.forEach((job) => {
      const programme =
        programmes.find(
          (item) =>
            item.id ===
            job.programmeId,
        );

      const visit =
        programme?.visits.find(
          (item) =>
            item.id === job.visitId,
        );

      const customer =
        customers.find(
          (item) =>
            item.customerNumber ===
            job.customerNumber,
        );

      if (
        !programme ||
        !visit ||
        !customer
      ) {
        return;
      }

      records.push({
        id: `treatment-${Date.now()}-${job.customerNumber}-reschedule`,

        invoiceNumber: "",

        customerNumber:
          customer.customerNumber,

        scheduledDate:
          visit.scheduledDate,

        recordedDate:
          now.toISOString(),

        completedDate: "",

        status:
          "Needs Rescheduling",

        treatmentName:
          visit.treatmentName,

        fertiliser:
          job.fertiliser,

        herbicide:
          job.herbicide,

        otherMaterials:
          job.otherMaterials,

        notes:
          job.notes ||
          `Visit moved to ${formatLongDate(
            rescheduleDate,
          )}.`,

        nextVisitDate:
          formatLongDate(
            rescheduleDate,
          ),
      });

      const updatedProgramme =
        updateProgrammeVisitDate(
          programme,
          visit.id,
          rescheduleDate,
        );

      saveProgramme(
        updatedProgramme,
      );

      updateCustomer({
        ...customer,
        nextVisit:
          formatLongDate(
            rescheduleDate,
          ),
      });
    });

    addTreatments(records);

    const selectedKeys = new Set(
      selectedJobs.map(
        (job) => job.key,
      ),
    );

    setJobs((current) =>
      current.filter(
        (job) =>
          !selectedKeys.has(job.key),
      ),
    );

    showMessage(
      `${records.length} job${
        records.length === 1
          ? ""
          : "s"
      } moved to ${formatLongDate(
        rescheduleDate,
      )}.`,
    );
  }

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  if (
    !customersReady ||
    !programmesReady ||
    !treatmentsReady ||
    !settingsReady
  ) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading scheduled jobs...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1600px]">
          <header className="mb-5">
            <Link
              href="/"
              className="text-sm font-semibold text-[#176b37] hover:underline"
            >
              ← Dashboard
            </Link>

            <h1 className="mt-2 text-3xl font-bold">
              Today&apos;s Jobs
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Daily work generated from saved
              customer annual programmes.
            </p>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          {programmes.length === 0 && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              No annual programmes have been
              saved yet. Create customer
              schedules in{" "}
              <Link
                href="/programmes"
                className="font-bold underline"
              >
                Annual Programmes
              </Link>
              .
            </div>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_150px_150px] lg:items-end">
              <Field label="Scheduled date">
                <select
                  value={selectedDate}
                  onChange={(event) => {
                    setSelectedDate(
                      event.target.value,
                    );

                    setRescheduleDate(
                      event.target.value,
                    );
                  }}
                  className={inputClass}
                >
                  {availableDates.length ===
                  0 ? (
                    <option value="">
                      No scheduled dates
                    </option>
                  ) : (
                    availableDates.map(
                      (date) => (
                        <option
                          key={date}
                          value={date}
                        >
                          {formatDateWithDay(
                            date,
                          )}
                        </option>
                      ),
                    )
                  )}
                </select>
              </Field>

              <Field label="Customer group">
                <select
                  value={selectedGroup}
                  onChange={(event) =>
                    setSelectedGroup(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                >
                  <option value="All">
                    All groups
                  </option>

                  {groups.map(
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

              <Field label="Van">
                <select
                  value={selectedVan}
                  onChange={(event) =>
                    setSelectedVan(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                >
                  <option value="All">
                    All vans
                  </option>

                  <option value="1">
                    Van 1
                  </option>

                  <option value="2">
                    Van 2
                  </option>

                  <option value="3">
                    Van 3
                  </option>
                </select>
              </Field>

              <Link
                href="/programmes"
                className="rounded-xl border border-[#338b45] px-4 py-2.5 text-center text-sm font-semibold text-[#176b37] hover:bg-green-50"
              >
                Annual programmes
              </Link>
            </div>
          </section>

          <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Scheduled jobs"
              value={String(jobs.length)}
              detail={
                selectedDate
                  ? formatShortDate(
                      selectedDate,
                    )
                  : "No date selected"
              }
            />

            <SummaryCard
              label="Total area"
              value={`${totalArea.toLocaleString()} m²`}
              detail={`${selectedArea.toLocaleString()} m² selected`}
            />

            <SummaryCard
              label="Expected value"
              value={`£${expectedValue.toFixed(
                2,
              )}`}
              detail="Standard treatment prices"
            />

            <SummaryCard
              label="Selected"
              value={String(
                selectedJobs.length,
              )}
              detail="Ready to process"
            />
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_1fr_auto] xl:items-end">
              <Field label="Fertiliser">
                <select
                  value={
                    defaultFertiliser
                  }
                  onChange={(event) =>
                    setDefaultFertiliser(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                >
                  {fertiliserOptions.map(
                    (option) => (
                      <option key={option}>
                        {option}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Herbicide">
                <select
                  value={
                    defaultHerbicide
                  }
                  onChange={(event) =>
                    setDefaultHerbicide(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                >
                  {herbicideOptions.map(
                    (option) => (
                      <option key={option}>
                        {option}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Other materials">
                <input
                  value={
                    defaultOtherMaterials
                  }
                  onChange={(event) =>
                    setDefaultOtherMaterials(
                      event.target.value,
                    )
                  }
                  placeholder="Optional"
                  className={inputClass}
                />
              </Field>

              <Field label="Treatment notes">
                <input
                  value={defaultNotes}
                  onChange={(event) =>
                    setDefaultNotes(
                      event.target.value,
                    )
                  }
                  placeholder="Optional"
                  className={inputClass}
                />
              </Field>

              <button
                type="button"
                onClick={
                  applyProductsToSelected
                }
                className="rounded-xl border border-[#338b45] px-4 py-2.5 text-sm font-semibold text-[#176b37] hover:bg-green-50"
              >
                Apply to selected
              </button>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[42px_85px_1.15fr_1.5fr_1.25fr_85px_85px_1.25fr] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAllJobs}
                className="h-4 w-4"
                aria-label="Select all displayed jobs"
              />

              <span>Number</span>
              <span>Customer</span>
              <span>Address</span>
              <span>Treatment</span>
              <span>Area</span>
              <span>Group</span>
              <span>Products</span>
            </div>

            <div className="max-h-[40vh] overflow-y-auto">
              {jobs.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="font-bold">
                    No jobs scheduled
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    No active customer programme
                    visits match the selected date,
                    group and van.
                  </p>
                </div>
              ) : (
                jobs.map((job) => {
                  const customer =
                    customers.find(
                      (item) =>
                        item.customerNumber ===
                        job.customerNumber,
                    );

                  const programme =
                    programmes.find(
                      (item) =>
                        item.id ===
                        job.programmeId,
                    );

                  const visit =
                    programme?.visits.find(
                      (item) =>
                        item.id ===
                        job.visitId,
                    );

                  if (
                    !customer ||
                    !programme ||
                    !visit
                  ) {
                    return null;
                  }

                  const products = [
                    job.fertiliser,
                    job.herbicide,
                    job.otherMaterials,
                  ]
                    .filter(
                      (product) =>
                        product &&
                        product !== "None",
                    )
                    .join(", ");

                  return (
                    <div
                      key={job.key}
                      className="grid grid-cols-[42px_85px_1.15fr_1.5fr_1.25fr_85px_85px_1.25fr] items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0 hover:bg-green-50/40"
                    >
                      <input
                        type="checkbox"
                        checked={
                          job.selected
                        }
                        onChange={() =>
                          toggleJob(job.key)
                        }
                        className="h-4 w-4"
                        aria-label={`Select ${customer.fullName}`}
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

                      <div>
                        <div className="font-semibold">
                          {
                            visit.treatmentName
                          }
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Visit{" "}
                          {visit.visitNumber} of{" "}
                          {
                            programme.visits
                              .length
                          }
                        </div>
                      </div>

                      <span className="font-semibold">
                        {customer.lawnSize} m²
                      </span>

                      <span>
                        {customer.groupNumber}
                      </span>

                      <span className="truncate text-xs text-slate-600">
                        {products ||
                          "Not selected"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="text-sm text-slate-600">
                <strong>
                  {selectedJobs.length}
                </strong>{" "}
                selected ·{" "}
                <strong>
                  {selectedArea.toLocaleString()} m²
                </strong>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <Field label="New date">
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(event) =>
                      setRescheduleDate(
                        event.target.value,
                      )
                    }
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </Field>

                <button
                  type="button"
                  onClick={
                    rescheduleSelectedJobs
                  }
                  className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                >
                  Reschedule selected
                </button>

                <button
                  type="button"
                  onClick={
                    cancelSelectedJobs
                  }
                  className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  Cancel selected
                </button>

                <button
                  type="button"
                  onClick={
                    completeSelectedJobs
                  }
                  className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
                >
                  Complete selected
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function updateProgrammeVisitStatus(
  programme: CustomerProgramme,
  visitId: string,
  status: ProgrammeVisit["status"],
): CustomerProgramme {
  return {
    ...programme,

    visits: programme.visits.map(
      (visit) =>
        visit.id === visitId
          ? {
              ...visit,
              status,
            }
          : visit,
    ),
  };
}

function updateProgrammeVisitDate(
  programme: CustomerProgramme,
  visitId: string,
  newDate: string,
): CustomerProgramme {
  return {
    ...programme,

    visits: programme.visits.map(
      (visit) =>
        visit.id === visitId
          ? {
              ...visit,
              scheduledDate: newDate,
              status: "Scheduled",
            }
          : visit,
    ),
  };
}

function findNextVisitDate(
  programme: CustomerProgramme,
  currentVisit: ProgrammeVisit,
) {
  const nextVisit =
    programme.visits
      .filter(
        (visit) =>
          visit.visitNumber >
            currentVisit.visitNumber &&
          visit.status !== "Completed" &&
          visit.status !== "Skipped",
      )
      .sort(
        (first, second) =>
          first.visitNumber -
          second.visitNumber,
      )[0];

  return nextVisit
    ? formatLongDate(
        nextVisit.scheduledDate,
      )
    : "Programme complete";
}

function createJobKey(
  programmeId: string,
  visitId: string,
) {
  return `${programmeId}:${visitId}`;
}

function createTreatmentId(
  customerNumber: string,
  visitNumber: number,
  index: number,
) {
  return `treatment-${Date.now()}-${customerNumber}-${visitNumber}-${index}`;
}

function parseDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
  );
}

function toDateValue(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(parseDate(value));
}

function formatDateWithDay(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(parseDate(value));
}

function formatShortDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(parseDate(value));
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