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
  type TreatmentRecord,
  type TreatmentStatus,
  useTreatmentStore,
} from "@/components/treatment-store";

type JobStatus =
  | "Scheduled"
  | TreatmentStatus;

type JobRecord = {
  customerNumber: string;
  selected: boolean;
  status: JobStatus;
  fertiliser: string;
  herbicide: string;
  otherMaterials: string;
  notes: string;
};

const STORAGE_KEY =
  "greenflow-todays-jobs-v2";

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
    ready,
    updateCustomer,
  } = useCustomerStore();

  const { addTreatments } =
    useTreatmentStore();

  const activeCustomers = useMemo(
    () =>
      customers.filter(
        (customer) =>
          customer.status === "Active" &&
          customer.groupNumber === 7,
      ),
    [customers],
  );

  const [jobs, setJobs] = useState<
    JobRecord[]
  >([]);

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

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    if (!ready) return;

    const saved =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    let savedJobs: JobRecord[] = [];

    if (saved) {
      try {
        const parsed = JSON.parse(
          saved,
        ) as JobRecord[];

        if (Array.isArray(parsed)) {
          savedJobs = parsed;
        }
      } catch {
        window.localStorage.removeItem(
          STORAGE_KEY,
        );
      }
    }

    setJobs(
      activeCustomers.map((customer) => {
        const existingJob =
          savedJobs.find(
            (job) =>
              job.customerNumber ===
              customer.customerNumber,
          );

        return (
          existingJob ?? {
            customerNumber:
              customer.customerNumber,
            selected: false,
            status: "Scheduled",
            fertiliser:
              "ProTurf Spring",
            herbicide: "Pastor Pro",
            otherMaterials: "",
            notes: "",
          }
        );
      }),
    );
  }, [ready, activeCustomers]);

  useEffect(() => {
    if (!ready) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(jobs),
    );
  }, [jobs, ready]);

  const selectedJobs = jobs.filter(
    (job) => job.selected,
  );

  const completedCount = jobs.filter(
    (job) =>
      job.status === "Completed",
  ).length;

  const totalArea =
    activeCustomers.reduce(
      (total, customer) =>
        total + customer.lawnSize,
      0,
    );

  const selectedArea =
    selectedJobs.reduce(
      (total, job) => {
        const customer =
          activeCustomers.find(
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

  const selectableJobs = jobs.filter(
    (job) =>
      job.status === "Scheduled",
  );

  const allSelected =
    selectableJobs.length > 0 &&
    selectableJobs.every((job) =>
      job.selected,
    );

  function toggleSelectAll() {
    setJobs((current) =>
      current.map((job) =>
        job.status === "Scheduled"
          ? {
              ...job,
              selected: !allSelected,
            }
          : job,
      ),
    );
  }

  function toggleJob(
    customerNumber: string,
  ) {
    setJobs((current) =>
      current.map((job) =>
        job.customerNumber ===
          customerNumber &&
        job.status === "Scheduled"
          ? {
              ...job,
              selected: !job.selected,
            }
          : job,
      ),
    );
  }

  function applyDefaults() {
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
      `Products applied to ${selectedJobs.length} selected job${
        selectedJobs.length === 1
          ? ""
          : "s"
      }.`,
    );
  }

  function recordSelectedJobs(
    status: TreatmentStatus,
  ) {
    if (selectedJobs.length === 0) {
      showMessage(
        "Select at least one job first.",
      );
      return;
    }

    const now = new Date();
    const today = toDateValue(now);

    const treatmentRecords: TreatmentRecord[] =
      selectedJobs.map((job) => {
        const customer =
          activeCustomers.find(
            (item) =>
              item.customerNumber ===
              job.customerNumber,
          );

        return {
          id: `treatment-${Date.now()}-${job.customerNumber}`,
          customerNumber:
            job.customerNumber,
          scheduledDate:
            customer?.nextVisit ?? today,
          recordedDate:
            now.toISOString(),
          completedDate:
            status === "Completed"
              ? today
              : "",
          status,
          treatmentName:
            "Seasonal lawn treatment",
          fertiliser:
            job.fertiliser ||
            defaultFertiliser,
          herbicide:
            job.herbicide ||
            defaultHerbicide,
          otherMaterials:
            job.otherMaterials ||
            defaultOtherMaterials,
          notes:
            job.notes ||
            defaultNotes,
          nextVisitDate:
            customer?.nextVisit ??
            "Not yet scheduled",
        };
      });

    addTreatments(treatmentRecords);

    if (status === "Completed") {
      selectedJobs.forEach((job) => {
        const customer =
          customers.find(
            (item) =>
              item.customerNumber ===
              job.customerNumber,
          );

        if (!customer) return;

        updateCustomer({
          ...customer,
          lastVisit:
            formatDisplayDate(today),
        });
      });
    }

    setJobs((current) =>
      current.map((job) =>
        job.selected
          ? {
              ...job,
              status,
              selected: false,
              fertiliser:
                job.fertiliser ||
                defaultFertiliser,
              herbicide:
                job.herbicide ||
                defaultHerbicide,
              otherMaterials:
                job.otherMaterials ||
                defaultOtherMaterials,
              notes:
                job.notes ||
                defaultNotes,
            }
          : job,
      ),
    );

    showMessage(
      `${selectedJobs.length} job${
        selectedJobs.length === 1
          ? ""
          : "s"
      } recorded as ${status.toLowerCase()}.`,
    );
  }

  function resetToday() {
    const confirmed =
      window.confirm(
        "Reset today's jobs to Scheduled? Existing customer treatment-history records will remain.",
      );

    if (!confirmed) return;

    setJobs(
      activeCustomers.map(
        (customer) => ({
          customerNumber:
            customer.customerNumber,
          selected: false,
          status: "Scheduled",
          fertiliser:
            defaultFertiliser,
          herbicide:
            defaultHerbicide,
          otherMaterials:
            defaultOtherMaterials,
          notes: defaultNotes,
        }),
      ),
    );

    window.localStorage.removeItem(
      STORAGE_KEY,
    );

    showMessage(
      "Today's jobs were reset.",
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
            Loading today&apos;s jobs...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1550px]">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
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
                Group 7 · Treatment
                completion and product records
              </p>
            </div>

            <button
              type="button"
              onClick={resetToday}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
            >
              Reset demo day
            </button>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Jobs"
              value={String(jobs.length)}
              detail="Group 7"
            />

            <SummaryCard
              label="Completed"
              value={`${completedCount}/${jobs.length}`}
              detail={`${jobs.length - completedCount} remaining`}
            />

            <SummaryCard
              label="Total area"
              value={`${totalArea.toLocaleString()} m²`}
              detail={`${selectedArea.toLocaleString()} m² selected`}
            />

            <SummaryCard
              label="Selected"
              value={String(
                selectedJobs.length,
              )}
              detail="Ready to record"
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
                  value={defaultHerbicide}
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
                onClick={applyDefaults}
                className="rounded-xl border border-[#338b45] px-4 py-2.5 text-sm font-semibold text-[#176b37] hover:bg-green-50"
              >
                Apply to selected
              </button>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[42px_85px_1.15fr_1.6fr_85px_1.4fr_135px] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4"
              />

              <span>Number</span>
              <span>Customer</span>
              <span>Address</span>
              <span>Area</span>
              <span>Products</span>
              <span>Status</span>
            </div>

            <div className="max-h-[43vh] overflow-y-auto">
              {jobs.map((job) => {
                const customer =
                  activeCustomers.find(
                    (item) =>
                      item.customerNumber ===
                      job.customerNumber,
                  );

                if (!customer) return null;

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
                    key={job.customerNumber}
                    className="grid grid-cols-[42px_85px_1.15fr_1.6fr_85px_1.4fr_135px] items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0 hover:bg-green-50/40"
                  >
                    <input
                      type="checkbox"
                      checked={job.selected}
                      disabled={
                        job.status !==
                        "Scheduled"
                      }
                      onChange={() =>
                        toggleJob(
                          job.customerNumber,
                        )
                      }
                      className="h-4 w-4"
                    />

                    <Link
                      href={`/customers/${customer.customerNumber}`}
                      className="font-bold text-[#176b37] hover:underline"
                    >
                      {customer.customerNumber}
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

                    <span className="font-semibold">
                      {customer.lawnSize} m²
                    </span>

                    <span className="truncate text-xs text-slate-600">
                      {products ||
                        "Not selected"}
                    </span>

                    <StatusBadge
                      status={job.status}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-600">
              <strong>
                {selectedJobs.length}
              </strong>{" "}
              selected ·{" "}
              <strong>
                {selectedArea.toLocaleString()} m²
              </strong>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  recordSelectedJobs(
                    "Needs Rescheduling",
                  )
                }
                className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100"
              >
                Needs rescheduling
              </button>

              <button
                type="button"
                onClick={() =>
                  recordSelectedJobs(
                    "Cancelled",
                  )
                }
                className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                Cancel selected
              </button>

              <button
                type="button"
                onClick={() =>
                  recordSelectedJobs(
                    "Completed",
                  )
                }
                className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
              >
                Complete selected
              </button>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
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

function formatDisplayDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(
    new Date(year, month - 1, day),
  );
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
      <span className="mb-1.5 block text-sm font-semibold">
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

function StatusBadge({
  status,
}: {
  status: JobStatus;
}) {
  const styles =
    status === "Completed"
      ? "bg-green-100 text-green-800"
      : status ===
          "Needs Rescheduling"
        ? "bg-amber-100 text-amber-800"
        : status === "Cancelled"
          ? "bg-red-100 text-red-700"
          : "bg-blue-100 text-blue-800";

  return (
    <span
      className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}
    >
      {status}
    </span>
  );
}