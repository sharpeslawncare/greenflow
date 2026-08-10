"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import {
  type AdvisoryType,
  type BrandingSettings,
  type BusinessSettings,
  type InvoiceSettings,
  type TreatmentWordingSettings,
  useSettingsStore,
} from "@/components/settings-store";

import {
  type FleetVehicle,
  useFleetStore,
} from "@/components/fleet-store";
import { useCustomerStore } from "@/components/customer-store";
import { useProgrammeStore } from "@/components/programme-store";
import { useTreatmentStore } from "@/components/treatment-store";
import { useChemicalStore } from "@/components/chemical-store";

type SettingsTab =
  | "maintenance"
  | "health"
  | "backups"
  | "business"
  | "invoices"
  | "wording"
  | "advisories"
  | "branding"
  | "fleet";

const tabs: Array<{
  id: SettingsTab;
  label: string;
}> = [
  {
    id: "maintenance",
    label: "Operational",
  },
  {
    id: "health",
    label: "System Health",
  },
  {
    id: "backups",
    label: "Backup & Restore",
  },
  {
    id: "business",
    label: "Business details",
  },
  {
    id: "invoices",
    label: "Invoices",
  },
  {
    id: "wording",
    label: "Treatment wording",
  },
  {
    id: "advisories",
    label: "Advisories",
  },
  {
    id: "branding",
    label: "Branding",
  },
  {
    id: "fleet",
    label: "Fleet",
  },
];

export default function SettingsPage() {
  const {
    settings,
    ready,
    updateBusinessSettings,
    updateInvoiceSettings,
    updateTreatmentWording,
    updateBrandingSettings,
    updateAdvisory,
    addAdvisory,
    deleteAdvisory,
    getNextInvoiceNumber,
    incrementInvoiceNumber,
    restoreDefaultSettings,
  } = useSettingsStore();

  const {
    vehicles,
    activeVehicles,
    ready: fleetReady,
    addVehicle,
    updateVehicle,
    restoreDefaultFleet,
  } = useFleetStore();

  const {
    customers,
    ready: customersReady,
  } = useCustomerStore();

  const {
    programmes,
    ready: programmesReady,
  } = useProgrammeStore();

  const {
    treatments,
    ready: treatmentsReady,
  } = useTreatmentStore();

  const {
    chemicals,
    stockMovements,
    ready: chemicalsReady,
    restoreDemoChemicals,
  } = useChemicalStore();

  const [activeTab, setActiveTab] =
    useState<SettingsTab>("maintenance");

  const [message, setMessage] =
    useState("");

  const [healthCheckRun, setHealthCheckRun] =
    useState(false);

  const [lastBackupAt, setLastBackupAt] =
    useState("");

  useEffect(() => {
    const backupDate =
      window.localStorage.getItem(
        "greenflow-last-backup-at",
      );

    if (backupDate) {
      setLastBackupAt(
        backupDate,
      );
    }
  }, []);

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 2800);
  }

  function createBackup() {
    const payload: Record<string, string> = {};

    for (
      let index = 0;
      index < window.localStorage.length;
      index += 1
    ) {
      const key =
        window.localStorage.key(index);

      if (
        !key ||
        !key.startsWith("greenflow-")
      ) {
        continue;
      }

      const value =
        window.localStorage.getItem(key);

      if (value !== null) {
        payload[key] = value;
      }
    }

    const createdAt =
      new Date().toISOString();

    const backup = {
      application: "GreenFlow",
      version: 1,
      createdAt,
      items: payload,
    };

    const blob = new Blob(
      [
        JSON.stringify(
          backup,
          null,
          2,
        ),
      ],
      {
        type: "application/json",
      },
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      `greenflow-backup-${createdAt
        .slice(0, 19)
        .replaceAll(":", "-")}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    window.localStorage.setItem(
      "greenflow-last-backup-at",
      createdAt,
    );

    setLastBackupAt(createdAt);

    showMessage(
      "GreenFlow backup downloaded.",
    );
  }

  async function restoreBackup(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    let parsed: unknown;

    try {
      parsed = JSON.parse(
        await file.text(),
      );
    } catch {
      showMessage(
        "The selected file is not valid JSON.",
      );
      return;
    }

    if (
      !isGreenFlowBackup(parsed)
    ) {
      showMessage(
        "The selected file is not a valid GreenFlow backup.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Restore the backup created ${formatBackupDate(
        parsed.createdAt,
      )}? Existing GreenFlow browser data will be replaced.`,
    );

    if (!confirmed) return;

    const currentSettingsJson =
      window.localStorage.getItem(
        "greenflow-business-settings-v1",
      );

    const currentGreenFlowKeys: string[] =
      [];

    for (
      let index = 0;
      index < window.localStorage.length;
      index += 1
    ) {
      const key =
        window.localStorage.key(index);

      if (
        key?.startsWith(
          "greenflow-",
        )
      ) {
        currentGreenFlowKeys.push(
          key,
        );
      }
    }

    currentGreenFlowKeys.forEach(
      (key) =>
        window.localStorage.removeItem(
          key,
        ),
    );

    Object.entries(
      parsed.items,
    ).forEach(
      ([key, value]) => {
        if (
          key.startsWith(
            "greenflow-",
          )
        ) {
          window.localStorage.setItem(
            key,
            value,
          );
        }
      },
    );

    preserveHighestInvoiceSequence(
      currentSettingsJson,
      window.localStorage.getItem(
        "greenflow-business-settings-v1",
      ),
    );

    window.alert(
      "Backup restored successfully. GreenFlow will now reload.",
    );

    window.location.reload();
  }

  function restoreDefaults() {
    const confirmed = window.confirm(
      "Restore all GreenFlow business settings to their original demonstration values?",
    );

    if (!confirmed) return;

    restoreDefaultSettings();
    showMessage(
      "Default GreenFlow settings restored.",
    );
  }

  function startNewTestDay() {
    const confirmed = window.confirm(
      "Start a new test day? Completed treatment records, visit outcomes, documents, route order and the saved daily working mix will be cleared. Customers, programme schedules, chemicals, LIVE STOCK QUANTITIES and STOCK MOVEMENT HISTORY will be preserved.",
    );

    if (!confirmed) return;

    const treatmentKeys = [
      "greenflow-treatments-v3",
      "greenflow-treatments-v2",
      "greenflow-treatments-v1",
    ];

    treatmentKeys.forEach((key) =>
      window.localStorage.removeItem(key),
    );

    const programmeStorageKey =
      "greenflow-customer-programmes-v1";

    const savedProgrammes =
      window.localStorage.getItem(
        programmeStorageKey,
      );

    if (savedProgrammes) {
      try {
        const savedProgrammeRecords =
          JSON.parse(
            savedProgrammes,
          ) as Array<{
            visits?: Array<{
              status?: string;
              notes?: string;
              [key: string]: unknown;
            }>;
            [key: string]: unknown;
          }>;

        const resetProgrammes =
          Array.isArray(
            savedProgrammeRecords,
          )
            ? savedProgrammeRecords.map(
                (programme) => ({
                  ...programme,
                  visits: Array.isArray(
                    programme.visits,
                  )
                    ? programme.visits.map(
                        (visit) => ({
                          ...visit,
                          status:
                            visit.status ===
                            "Planned"
                              ? "Planned"
                              : "Scheduled",
                          notes:
                            removeOutcomeNotes(
                              typeof visit.notes ===
                                "string"
                                ? visit.notes
                                : "",
                            ),
                        }),
                      )
                    : programme.visits,
                }),
              )
            : savedProgrammeRecords;

        window.localStorage.setItem(
          programmeStorageKey,
          JSON.stringify(
            resetProgrammes,
          ),
        );
      } catch {
        // Leave unreadable programme data untouched rather than risking data loss.
      }
    }

    /*
     * Clean up old incorrect programme-reset keys.
     * The live Programme Store uses greenflow-customer-programmes-v1.
     */
    [
      "greenflow-programmes-v3",
      "greenflow-programmes-v2",
      "greenflow-programmes-v1",
    ].forEach((key) =>
      window.localStorage.removeItem(key),
    );

    window.localStorage.removeItem(
      "greenflow-route-orders-v1",
    );

    window.localStorage.removeItem(
      "greenflow-visit-centre-standard-mixes-v1",
    );

    window.dispatchEvent(
      new CustomEvent(
        "greenflow:route-orders-updated",
      ),
    );

    window.alert(
      "New test day prepared. Treatment outcomes were cleared, but live stock and stock movement history were preserved. GreenFlow will now reload.",
    );

    window.location.reload();
  }

  function resetDemoInventory() {
    const confirmed = window.confirm(
      "Reset demo inventory? Chemical products will return to the current demo seed values and the shared stock movement history will be cleared. Customers, programmes, treatments, fleet and business settings will not be changed.",
    );

    if (!confirmed) return;

    restoreDemoChemicals();

    /*
     * Remove obsolete Stock-page stores and optional purchasing
     * metadata so the inventory demo restarts cleanly.
     */
    [
      "greenflow-stock-v1",
      "greenflow-stock-movements-v2",
      "greenflow-stock-metadata-v2",
    ].forEach((key) =>
      window.localStorage.removeItem(key),
    );

    showMessage(
      "Demo inventory restored and stock movement history cleared.",
    );
  }

  function fullDemoReset() {
    const phrase =
      window.prompt(
        'This resets ALL GreenFlow browser data to the demonstration defaults. Create a backup first if needed. Type RESET DEMO to continue.',
      );

    if (phrase !== "RESET DEMO") {
      if (phrase !== null) {
        showMessage(
          'Full demo reset cancelled. The phrase must be exactly "RESET DEMO".',
        );
      }
      return;
    }

    const greenFlowKeys: string[] = [];

    for (
      let index = 0;
      index < window.localStorage.length;
      index += 1
    ) {
      const key =
        window.localStorage.key(index);

      if (
        key?.startsWith(
          "greenflow-",
        )
      ) {
        greenFlowKeys.push(key);
      }
    }

    greenFlowKeys.forEach(
      (key) =>
        window.localStorage.removeItem(
          key,
        ),
    );

    window.alert(
      "Full GreenFlow demo reset complete. Customers, programmes, treatments, chemicals, inventory, movement history, fleet and settings will reload from their current demo defaults.",
    );

    window.location.reload();
  }

  function testInvoiceNumber() {
    const confirmed = window.confirm(
      `The next invoice number is ${getNextInvoiceNumber()}. Increase it to the following number?`,
    );

    if (!confirmed) return;

    incrementInvoiceNumber();

    showMessage(
      "The next invoice number was increased.",
    );
  }

  if (
    !ready ||
    !fleetReady ||
    !customersReady ||
    !programmesReady ||
    !treatmentsReady ||
    !chemicalsReady
  ) {
    return (
      <AppShell>
        <main className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading business settings...
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="p-5 md:p-7">
        <div className="mx-auto max-w-[1500px]">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-sm font-semibold text-[#176b37] hover:underline"
              >
                ← Back to dashboard
              </Link>

              <h1 className="text-3xl font-bold">
              Maintenance
              </h1>

            <p className="mt-2 text-slate-500">
             System administration, operational resets, backups and diagnostic tools.
            </p>

              <p className="mt-1 text-sm text-slate-500">
                Manage Sharpes Lawn Care details,
                invoice wording, customer advice and
                GreenFlow branding.
              </p>
            </div>

            <button
              type="button"
              onClick={restoreDefaults}
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Restore default settings
            </button>
          </header>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <nav className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveTab(tab.id)
                  }
                  className={`whitespace-nowrap border-b-2 px-5 py-4 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "border-[#176b37] text-[#176b37]"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="p-5 md:p-6">
              {activeTab === "maintenance" && (
                <OperationalMaintenanceTab
                  onStartNewTestDay={
                    startNewTestDay
                  }
                  onResetDemoInventory={
                    resetDemoInventory
                  }
                  onFullDemoReset={
                    fullDemoReset
                  }
                  chemicalCount={
                    chemicals.length
                  }
                  stockMovementCount={
                    stockMovements.length
                  }
                />
              )}

              {activeTab === "health" && (
                <SystemHealthTab
                  customers={customers}
                  programmes={programmes}
                  treatments={treatments}
                  chemicals={chemicals}
                  vehicles={vehicles}
                  healthCheckRun={
                    healthCheckRun
                  }
                  onRunHealthCheck={() => {
                    setHealthCheckRun(true);
                    showMessage(
                      "System health check completed.",
                    );
                  }}
                />
              )}

              {activeTab === "backups" && (
                <BackupRestoreTab
                  lastBackupAt={
                    lastBackupAt
                  }
                  onCreateBackup={
                    createBackup
                  }
                  onRestoreBackup={
                    restoreBackup
                  }
                />
              )}

              {activeTab === "business" && (
                <BusinessTab
                  settings={settings.business}
                  updateSettings={
                    updateBusinessSettings
                  }
                />
              )}

              {activeTab === "invoices" && (
                <InvoicesTab
                  settings={settings.invoices}
                  nextInvoiceNumber={getNextInvoiceNumber()}
                  updateSettings={
                    updateInvoiceSettings
                  }
                  onIncreaseInvoiceNumber={
                    testInvoiceNumber
                  }
                />
              )}

              {activeTab === "wording" && (
                <TreatmentWordingTab
                  settings={
                    settings.treatmentWording
                  }
                  updateSettings={
                    updateTreatmentWording
                  }
                />
              )}

              {activeTab === "advisories" && (
                <AdvisoriesTab
                  advisories={
                    settings.advisories
                  }
                  updateAdvisory={
                    updateAdvisory
                  }
                  addAdvisory={addAdvisory}
                  deleteAdvisory={
                    deleteAdvisory
                  }
                />
              )}

              {activeTab === "branding" && (
                <BrandingTab
                  settings={settings.branding}
                  businessName={
                    settings.business
                      .businessName
                  }
                  applicationName={
                    settings.business
                      .applicationName
                  }
                  updateSettings={
                    updateBrandingSettings
                  }
                />
              )}


              {activeTab === "fleet" && (
                <FleetTab
                  vehicles={vehicles}
                  activeVehicles={
                    activeVehicles
                  }
                  addVehicle={
                    addVehicle
                  }
                  updateVehicle={
                    updateVehicle
                  }
                  restoreDefaultFleet={
                    restoreDefaultFleet
                  }
                  showMessage={
                    showMessage
                  }
                />
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm">
              <span className="text-slate-500">
                Changes are saved automatically in
                this browser.
              </span>

              <span className="font-semibold text-green-700">
                Settings active
              </span>
            </footer>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function BackupRestoreTab({
  lastBackupAt,
  onCreateBackup,
  onRestoreBackup,
}: {
  lastBackupAt: string;
  onCreateBackup: () => void;
  onRestoreBackup: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Backup and restore"
        description="Create a portable copy of all GreenFlow browser data before resets, testing or major changes."
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <article className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
            Create backup
          </div>

          <h3 className="mt-2 text-2xl font-bold text-green-950">
            Download GreenFlow data
          </h3>

          <p className="mt-2 text-sm leading-6 text-green-800">
            Downloads customers, programmes, treatments, chemicals, live stock, stock movement history, routes, fleet, settings and saved working-day data as one JSON file.
          </p>

          <button
            type="button"
            onClick={onCreateBackup}
            className="mt-6 rounded-xl bg-[#176b37] px-5 py-3 text-sm font-bold text-white hover:bg-[#125b2f]"
          >
            Create Backup
          </button>

          <div className="mt-4 rounded-xl border border-green-200 bg-white p-4 text-sm text-green-900">
            <strong>Last backup:</strong>{" "}
            {lastBackupAt
              ? formatBackupDate(
                  lastBackupAt,
                )
              : "No backup recorded in this browser."}
          </div>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">
            Restore backup
          </div>

          <h3 className="mt-2 text-2xl font-bold text-amber-950">
            Replace current browser data
          </h3>

          <p className="mt-2 text-sm leading-6 text-amber-900">
            Select a GreenFlow backup file. The restore process replaces existing GreenFlow data in this browser and then reloads the application.
          </p>

          <label className="mt-6 inline-flex cursor-pointer rounded-xl bg-amber-700 px-5 py-3 text-sm font-bold text-white hover:bg-amber-800">
            Choose Backup File

            <input
              type="file"
              accept="application/json,.json"
              onChange={
                onRestoreBackup
              }
              className="hidden"
            />
          </label>

          <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4 text-sm leading-6 text-amber-900">
            Create a fresh backup before restoring another file. Restore does not merge data; it replaces GreenFlow's current browser records.
          </div>
        </article>
      </div>

      <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        Backups are local JSON files. Keep them somewhere secure, such as your GreenFlow project backup folder or OneDrive.
      </div>
    </div>
  );
}

function isGreenFlowBackup(
  value: unknown,
): value is {
  application: "GreenFlow";
  version: number;
  createdAt: string;
  items: Record<string, string>;
} {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const candidate =
    value as {
      application?: unknown;
      version?: unknown;
      createdAt?: unknown;
      items?: unknown;
    };

  return (
    candidate.application ===
      "GreenFlow" &&
    typeof candidate.version ===
      "number" &&
    typeof candidate.createdAt ===
      "string" &&
    Boolean(
      candidate.items &&
        typeof candidate.items ===
          "object" &&
        !Array.isArray(
          candidate.items,
        ),
    ) &&
    Object.values(
      candidate.items as Record<
        string,
        unknown
      >,
    ).every(
      (item) =>
        typeof item === "string",
    )
  );
}

function preserveHighestInvoiceSequence(
  currentSettingsJson: string | null,
  restoredSettingsJson: string | null,
) {
  if (
    !currentSettingsJson ||
    !restoredSettingsJson
  ) {
    return;
  }

  try {
    const currentSettings =
      JSON.parse(
        currentSettingsJson,
      ) as {
        invoices?: {
          nextInvoiceNumber?: number;
        };
      };

    const restoredSettings =
      JSON.parse(
        restoredSettingsJson,
      ) as {
        invoices?: {
          nextInvoiceNumber?: number;
        };
      };

    const currentNext =
      Number(
        currentSettings.invoices
          ?.nextInvoiceNumber,
      );

    const restoredNext =
      Number(
        restoredSettings.invoices
          ?.nextInvoiceNumber,
      );

    if (
      !Number.isFinite(currentNext) ||
      !Number.isFinite(restoredNext) ||
      currentNext <= restoredNext
    ) {
      return;
    }

    window.localStorage.setItem(
      "greenflow-business-settings-v1",
      JSON.stringify({
        ...restoredSettings,
        invoices: {
          ...restoredSettings.invoices,
          nextInvoiceNumber:
            currentNext,
        },
      }),
    );
  } catch {
    // If either settings record cannot be read,
    // leave the restored backup untouched.
  }
}

function formatBackupDate(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function SystemHealthTab({
  customers,
  programmes,
  treatments,
  chemicals,
  vehicles,
  healthCheckRun,
  onRunHealthCheck,
}: {
  customers: Array<{
    customerNumber: string;
    fullName: string;
    status: string;
    vanNumber: number;
  }>;
  programmes: Array<{
    id: string;
    customerNumber: string;
    visits: unknown[];
  }>;
  treatments: Array<{
    id: string;
    customerNumber: string;
    programmeId: string;
  }>;
  chemicals: Array<{
    id: string;
    name: string;
    active: boolean;
    currentStock: number;
    reorderLevel: number;
  }>;
  vehicles: FleetVehicle[];
  healthCheckRun: boolean;
  onRunHealthCheck: () => void;
}) {
  const customerNumbers =
    customers.map(
      (customer) =>
        customer.customerNumber,
    );

  const duplicateCustomerNumbers =
    Array.from(
      new Set(
        customerNumbers.filter(
          (customerNumber, index) =>
            customerNumbers.indexOf(
              customerNumber,
            ) !== index,
        ),
      ),
    );

  const customersWithoutProgrammes =
    customers.filter(
      (customer) =>
        customer.status === "Active" &&
        !programmes.some(
          (programme) =>
            programme.customerNumber ===
            customer.customerNumber,
        ),
    );

  const orphanTreatmentRecords =
    treatments.filter(
      (treatment) =>
        !customers.some(
          (customer) =>
            customer.customerNumber ===
            treatment.customerNumber,
        ),
    );

  const treatmentsWithoutProgrammes =
    treatments.filter(
      (treatment) =>
        Boolean(
          treatment.programmeId,
        ) &&
        !programmes.some(
          (programme) =>
            programme.id ===
            treatment.programmeId,
        ),
    );

  const lowStockProducts =
    chemicals.filter(
      (chemical) =>
        chemical.active &&
        chemical.currentStock <=
          chemical.reorderLevel,
    );

  const activeVehicleNumbers =
    new Set(
      vehicles
        .filter(
          (vehicle) =>
            vehicle.active,
        )
        .map(
          (vehicle) =>
            vehicle.number,
        ),
    );

  const customersOnInactiveVehicles =
    customers.filter(
      (customer) =>
        customer.status === "Active" &&
        !activeVehicleNumbers.has(
          customer.vanNumber,
        ),
    );

  const checks = [
    {
      id: "duplicates",
      label: "Duplicate customer numbers",
      count:
        duplicateCustomerNumbers.length,
      detail:
        duplicateCustomerNumbers.length > 0
          ? duplicateCustomerNumbers.join(
              ", ",
            )
          : "Every customer number is unique.",
    },
    {
      id: "programmes",
      label: "Active customers without programmes",
      count:
        customersWithoutProgrammes.length,
      detail:
        customersWithoutProgrammes.length > 0
          ? customersWithoutProgrammes
              .slice(0, 5)
              .map(
                (customer) =>
                  `${customer.fullName} (#${customer.customerNumber})`,
              )
              .join(", ")
          : "Every active customer has an annual programme.",
    },
    {
      id: "orphans",
      label: "Treatment records without customers",
      count:
        orphanTreatmentRecords.length,
      detail:
        orphanTreatmentRecords.length > 0
          ? "Treatment records reference customer numbers that do not exist."
          : "Every treatment record has a matching customer.",
    },
    {
      id: "treatment-programmes",
      label: "Treatment records without programmes",
      count:
        treatmentsWithoutProgrammes.length,
      detail:
        treatmentsWithoutProgrammes.length > 0
          ? "Some treatment records reference programme IDs that do not exist."
          : "Every linked treatment record has a matching programme.",
    },
    {
      id: "stock",
      label: "Products at or below reorder level",
      count:
        lowStockProducts.length,
      detail:
        lowStockProducts.length > 0
          ? lowStockProducts
              .slice(0, 5)
              .map(
                (chemical) =>
                  chemical.name,
              )
              .join(", ")
          : "All active products are above their reorder levels.",
    },
    {
      id: "vehicles",
      label: "Active customers on inactive vehicles",
      count:
        customersOnInactiveVehicles.length,
      detail:
        customersOnInactiveVehicles.length > 0
          ? customersOnInactiveVehicles
              .slice(0, 5)
              .map(
                (customer) =>
                  `${customer.fullName} (Van ${customer.vanNumber})`,
              )
              .join(", ")
          : "Every active customer is assigned to an active vehicle.",
    },
  ];

  const issueCount =
    checks.reduce(
      (total, check) =>
        total + check.count,
      0,
    );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          title="System health"
          description="Scan GreenFlow for missing links, duplicate records, low stock and invalid operational assignments."
        />

        <button
          type="button"
          onClick={onRunHealthCheck}
          className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#125b2f]"
        >
          Run Health Check
        </button>
      </div>

      {!healthCheckRun ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <div className="text-xl font-bold">
            Health check not yet run
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Run the check to inspect customers, programmes, treatments, stock and fleet assignments.
          </p>
        </div>
      ) : (
        <>
          <div
            className={`mt-6 rounded-2xl border p-5 ${
              issueCount === 0
                ? "border-green-200 bg-green-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
              Overall status
            </div>

            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h3
                  className={`text-3xl font-bold ${
                    issueCount === 0
                      ? "text-green-950"
                      : "text-amber-950"
                  }`}
                >
                  {issueCount === 0
                    ? "Healthy"
                    : `${issueCount} issue${
                        issueCount === 1
                          ? ""
                          : "s"
                      } found`}
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  {checks.length} automatic checks completed.
                </p>
              </div>

              <span
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  issueCount === 0
                    ? "bg-green-700 text-white"
                    : "bg-amber-500 text-amber-950"
                }`}
              >
                {issueCount === 0
                  ? "All clear"
                  : "Review required"}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {checks.map((check) => (
              <article
                key={check.id}
                className={`rounded-2xl border p-5 ${
                  check.count === 0
                    ? "border-green-200 bg-green-50/40"
                    : "border-amber-200 bg-amber-50/60"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {check.label}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {check.detail}
                    </p>
                  </div>

                  <span
                    className={`flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-bold ${
                      check.count === 0
                        ? "bg-green-700 text-white"
                        : "bg-amber-500 text-amber-950"
                    }`}
                  >
                    {check.count}
                  </span>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            This first health check is read-only. It identifies issues but does not change or delete any GreenFlow data.
          </div>
        </>
      )}
    </div>
  );
}

function OperationalMaintenanceTab({
  onStartNewTestDay,
  onResetDemoInventory,
  onFullDemoReset,
  chemicalCount,
  stockMovementCount,
}: {
  onStartNewTestDay: () => void;
  onResetDemoInventory: () => void;
  onFullDemoReset: () => void;
  chemicalCount: number;
  stockMovementCount: number;
}) {
  return (
    <div>
      <SectionHeading
        title="Operational resets"
        description="Choose the smallest reset that matches what you are trying to test. Inventory is now protected separately from treatment results."
      />

      <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        <strong>Stock protection is active.</strong>{" "}
        A normal New Test Day does not restore or reverse stock. Current chemical stock and the shared stock movement history remain untouched.
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
            Level 1 · Operational
          </div>

          <h3 className="mt-2 text-2xl font-bold text-green-950">
            Start New Test Day
          </h3>

          <p className="mt-2 text-sm leading-6 text-green-800">
            Clear operational treatment results so Visit Centre can be tested again without changing the inventory position you have built up.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ResetDetail
              label="Cleared"
              items={[
                "Treatment records and recorded outcomes",
                "Treatment documents and invoice references derived from those records",
                "Visit Centre progress, revenue and observation totals",
                "Saved route order",
                "Saved daily working mix",
              ]}
            />

            <ResetDetail
              label="Preserved"
              items={[
                "Customers and programme structure / scheduled dates",
                "Chemical products",
                "Live stock quantities",
                "Shared stock movement history",
                "Fleet and business settings",
              ]}
            />
          </div>

          <button
            type="button"
            onClick={onStartNewTestDay}
            className="mt-6 rounded-xl bg-[#176b37] px-5 py-3 text-sm font-bold text-white hover:bg-[#125b2f]"
          >
            Start New Test Day
          </button>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">
            Level 2 · Inventory only
          </div>

          <h3 className="mt-2 text-2xl font-bold text-amber-950">
            Reset Demo Inventory
          </h3>

          <p className="mt-2 text-sm leading-6 text-amber-900">
            Restore only the chemical inventory to the current demo seed values. This is useful when you want to repeat stock testing from a known starting point.
          </p>

          <div className="mt-5 rounded-xl border border-amber-200 bg-white p-4 text-sm leading-6 text-amber-950">
            <div>
              <strong>{chemicalCount}</strong>{" "}
              chemical products currently loaded.
            </div>

            <div className="mt-1">
              <strong>{stockMovementCount}</strong>{" "}
              stock movement records currently in the shared audit trail.
            </div>
          </div>

          <div className="mt-4 text-sm leading-6 text-amber-900">
            This reset restores demo chemical quantities and clears the stock movement history. It does not touch customers, programmes or completed treatment records.
          </div>

          <button
            type="button"
            onClick={onResetDemoInventory}
            className="mt-6 rounded-xl bg-amber-700 px-5 py-3 text-sm font-bold text-white hover:bg-amber-800"
          >
            Reset Demo Inventory
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
            Level 3 · Season
          </div>

          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Start New Season
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-700">
            Keep this as a separate season-management operation. Programme visits and treatment history can be reset for a new season while real stock quantities and the inventory audit trail remain preserved.
          </p>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
            GreenFlow already has separate Season Management logic. Do not use the inventory reset for a normal season change.
          </div>
        </section>

        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">
            Level 4 · Everything
          </div>

          <h3 className="mt-2 text-2xl font-bold text-red-950">
            Full Demo Reset
          </h3>

          <p className="mt-2 text-sm leading-6 text-red-900">
            Remove all GreenFlow browser data and reload every store from its current demonstration defaults. This is the only reset intended to wipe the whole demo environment.
          </p>

          <div className="mt-4 rounded-xl border border-red-200 bg-white p-4 text-sm leading-6 text-red-900">
            <strong>Create a backup first if anything matters.</strong>{" "}
            You will be required to type <strong>RESET DEMO</strong> exactly before this runs.
          </div>

          <button
            type="button"
            onClick={onFullDemoReset}
            className="mt-6 rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white hover:bg-red-800"
          >
            Full Demo Reset
          </button>
        </section>
      </div>
    </div>
  );
}

function ResetDetail({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-green-200 bg-white p-4">
      <div className="font-bold text-slate-900">
        {label}
      </div>

      <div className="mt-3 space-y-2 text-sm text-slate-600">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-start gap-2"
          >
            <span className="mt-0.5 font-bold text-[#176b37]">
              ✓
            </span>

            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function removeOutcomeNotes(
  notes: string,
) {
  return notes
    .split("\n")
    .filter(
      (line) =>
        !/^(Outcome:|Replacement date:)/i.test(
          line.trim(),
        ),
    )
    .join("\n")
    .trim();
}

function BusinessTab({
  settings,
  updateSettings,
}: {
  settings: BusinessSettings;
  updateSettings: (
    updates: Partial<BusinessSettings>,
  ) => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Business details"
        description="These details will later appear throughout GreenFlow, including customer documents and invoices."
      />

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label="Application name">
          <input
            value={settings.applicationName}
            onChange={(event) =>
              updateSettings({
                applicationName:
                  event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Business or trading name">
          <input
            value={settings.businessName}
            onChange={(event) =>
              updateSettings({
                businessName:
                  event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Proprietor name">
          <input
            value={settings.proprietorName}
            onChange={(event) =>
              updateSettings({
                proprietorName:
                  event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Telephone">
          <input
            value={settings.telephone}
            onChange={(event) =>
              updateSettings({
                telephone:
                  event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Mobile">
          <input
            value={settings.mobile}
            onChange={(event) =>
              updateSettings({
                mobile: event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Email address">
          <input
            type="email"
            value={settings.email}
            onChange={(event) =>
              updateSettings({
                email: event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Website">
          <input
            value={settings.website}
            onChange={(event) =>
              updateSettings({
                website:
                  event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="VAT number">
          <input
            value={settings.vatNumber}
            onChange={(event) =>
              updateSettings({
                vatNumber:
                  event.target.value,
              })
            }
            placeholder="For example, GB 123 4567 89"
            className={inputClass}
          />
        </Field>

        <Field label="Address line 1">
          <input
            value={settings.addressLine1}
            onChange={(event) =>
              updateSettings({
                addressLine1:
                  event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Address line 2">
          <input
            value={settings.addressLine2}
            onChange={(event) =>
              updateSettings({
                addressLine2:
                  event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Town or city">
          <input
            value={settings.town}
            onChange={(event) =>
              updateSettings({
                town: event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="County">
          <input
            value={settings.county}
            onChange={(event) =>
              updateSettings({
                county: event.target.value,
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Postcode">
          <input
            value={settings.postcode}
            onChange={(event) =>
              updateSettings({
                postcode:
                  event.target.value.toUpperCase(),
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Company number">
          <input
            value={settings.companyNumber}
            onChange={(event) =>
              updateSettings({
                companyNumber:
                  event.target.value,
              })
            }
            placeholder="Leave blank if not applicable"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Enter only the business details you want
        displayed on customer-facing paperwork.
      </div>
    </div>
  );
}

function InvoicesTab({
  settings,
  nextInvoiceNumber,
  updateSettings,
  onIncreaseInvoiceNumber,
}: {
  settings: InvoiceSettings;
  nextInvoiceNumber: string;
  updateSettings: (
    updates: Partial<InvoiceSettings>,
  ) => void;
  onIncreaseInvoiceNumber: () => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Invoice settings"
        description="Control invoice numbering, payment instructions and the customer-facing footer."
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Invoice prefix">
            <input
              value={settings.invoicePrefix}
              onChange={(event) =>
                updateSettings({
                  invoicePrefix:
                    event.target.value.toUpperCase(),
                })
              }
              placeholder="INV"
              className={inputClass}
            />
          </Field>

          <Field label="Next invoice number">
            <input
              type="number"
              min="1"
              value={
                settings.nextInvoiceNumber
              }
              onChange={(event) =>
                updateSettings({
                  nextInvoiceNumber:
                    Number(
                      event.target.value,
                    ) || 1,
                })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Number padding">
            <select
              value={
                settings.invoiceNumberPadding
              }
              onChange={(event) =>
                updateSettings({
                  invoiceNumberPadding:
                    Number(
                      event.target.value,
                    ),
                })
              }
              className={inputClass}
            >
              <option value={3}>
                3 digits - 001
              </option>

              <option value={4}>
                4 digits - 0001
              </option>

              <option value={5}>
                5 digits - 00001
              </option>

              <option value={6}>
                6 digits - 000001
              </option>
            </select>
          </Field>

          <Field label="VAT display">
            <select
              value={
                settings.showAmountIncludingVat
                  ? "including"
                  : "excluding"
              }
              onChange={(event) =>
                updateSettings({
                  showAmountIncludingVat:
                    event.target.value ===
                    "including",
                })
              }
              className={inputClass}
            >
              <option value="including">
                Show amount including VAT
              </option>

              <option value="excluding">
                Do not add including-VAT wording
              </option>
            </select>
          </Field>

          <div className="md:col-span-2">
            <Field label="Payment instructions">
              <textarea
                rows={4}
                value={
                  settings.paymentInstructions
                }
                onChange={(event) =>
                  updateSettings({
                    paymentInstructions:
                      event.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="VAT wording">
              <textarea
                rows={3}
                value={settings.vatWording}
                onChange={(event) =>
                  updateSettings({
                    vatWording:
                      event.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Invoice footer message">
              <textarea
                rows={4}
                value={
                  settings.footerMessage
                }
                onChange={(event) =>
                  updateSettings({
                    footerMessage:
                      event.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Email copy message">
              <textarea
                rows={4}
                value={
                  settings.emailCopyMessage
                }
                onChange={(event) =>
                  updateSettings({
                    emailCopyMessage:
                      event.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="text-sm font-bold uppercase tracking-wide text-green-800">
              Next invoice number
            </div>

            <div className="mt-3 break-all text-3xl font-bold text-green-950">
              {nextInvoiceNumber}
            </div>

            <p className="mt-3 text-sm leading-6 text-green-800">
              This is a preview only. GreenFlow is
              not yet reserving or permanently
              assigning invoice numbers to individual
              documents.
            </p>

            <button
              type="button"
              onClick={onIncreaseInvoiceNumber}
              className="mt-4 w-full rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
            >
              Test next number
            </button>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Sequential invoice numbering needs to be
            finalised when GreenFlow is connected to
            its permanent database. Until then,
            QuickBooks remains the official invoice
            and VAT record.
          </div>
        </aside>
      </div>
    </div>
  );
}

function TreatmentWordingTab({
  settings,
  updateSettings,
}: {
  settings: TreatmentWordingSettings;
  updateSettings: (
    updates: Partial<TreatmentWordingSettings>,
  ) => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Treatment wording"
        description="These messages can be used on customer treatment reports without displaying your internal product records."
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <TextSetting
          label="Seasonal fertiliser visit"
          value={
            settings.seasonalFertiliserVisit
          }
          onChange={(value) =>
            updateSettings({
              seasonalFertiliserVisit:
                value,
            })
          }
        />

        <TextSetting
          label="Selective herbicide visit"
          value={settings.herbicideVisit}
          onChange={(value) =>
            updateSettings({
              herbicideVisit: value,
            })
          }
        />

        <TextSetting
          label="Combined fertiliser and herbicide"
          value={
            settings.combinedFertiliserAndHerbicideVisit
          }
          onChange={(value) =>
            updateSettings({
              combinedFertiliserAndHerbicideVisit:
                value,
            })
          }
        />

        <TextSetting
          label="Moss-control visit"
          value={
            settings.mossControlVisit
          }
          onChange={(value) =>
            updateSettings({
              mossControlVisit: value,
            })
          }
        />

        <TextSetting
          label="Aeration"
          value={settings.aerationVisit}
          onChange={(value) =>
            updateSettings({
              aerationVisit: value,
            })
          }
        />

        <TextSetting
          label="Scarification"
          value={
            settings.scarificationVisit
          }
          onChange={(value) =>
            updateSettings({
              scarificationVisit: value,
            })
          }
        />

        <TextSetting
          label="Overseeding"
          value={
            settings.overseedingVisit
          }
          onChange={(value) =>
            updateSettings({
              overseedingVisit: value,
            })
          }
        />

        <TextSetting
          label="Cancelled visit"
          value={
            settings.cancelledVisit
          }
          onChange={(value) =>
            updateSettings({
              cancelledVisit: value,
            })
          }
        />

        <TextSetting
          label="Rescheduled visit"
          value={
            settings.rescheduledVisit
          }
          onChange={(value) =>
            updateSettings({
              rescheduledVisit: value,
            })
          }
        />

        <TextSetting
          label="Preparing for the next visit"
          value={
            settings.nextVisitPreparation
          }
          onChange={(value) =>
            updateSettings({
              nextVisitPreparation:
                value,
            })
          }
          large
        />
      </div>
    </div>
  );
}

function AdvisoriesTab({
  advisories,
  updateAdvisory,
  addAdvisory,
  deleteAdvisory,
}: {
  advisories: Array<{
    id: string;
    title: string;
    wording: string;
    type: AdvisoryType;
    active: boolean;
  }>;
  updateAdvisory: (
    advisoryId: string,
    updates: {
      title?: string;
      wording?: string;
      type?: AdvisoryType;
      active?: boolean;
    },
  ) => void;
  addAdvisory: () => void;
  deleteAdvisory: (
    advisoryId: string,
  ) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          title="Customer advisories"
          description="Control the prominent warning and advice boxes shown on treatment paperwork."
        />

        <button
          type="button"
          onClick={addAdvisory}
          className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
        >
          + Add advisory
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {advisories.map((advisory) => (
          <article
            key={advisory.id}
            className={`rounded-2xl border p-5 ${
              advisory.type === "danger"
                ? "border-red-200 bg-red-50/40"
                : advisory.type ===
                    "warning"
                  ? "border-amber-200 bg-amber-50/40"
                  : "border-blue-200 bg-blue-50/40"
            }`}
          >
            <div className="grid gap-5 lg:grid-cols-[1fr_190px_150px]">
              <div className="space-y-4">
                <Field label="Heading">
                  <input
                    value={advisory.title}
                    onChange={(event) =>
                      updateAdvisory(
                        advisory.id,
                        {
                          title:
                            event.target.value,
                        },
                      )
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Customer-facing wording">
                  <textarea
                    rows={4}
                    value={
                      advisory.wording
                    }
                    onChange={(event) =>
                      updateAdvisory(
                        advisory.id,
                        {
                          wording:
                            event.target.value,
                        },
                      )
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Advisory type">
                <select
                  value={advisory.type}
                  onChange={(event) =>
                    updateAdvisory(
                      advisory.id,
                      {
                        type: event.target
                          .value as AdvisoryType,
                      },
                    )
                  }
                  className={inputClass}
                >
                  <option value="danger">
                    Red warning
                  </option>

                  <option value="warning">
                    Amber caution
                  </option>

                  <option value="information">
                    Blue information
                  </option>
                </select>
              </Field>

              <div className="space-y-3">
                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                  <span className="text-sm font-semibold">
                    Active
                  </span>

                  <input
                    type="checkbox"
                    checked={
                      advisory.active
                    }
                    onChange={(event) =>
                      updateAdvisory(
                        advisory.id,
                        {
                          active:
                            event.target
                              .checked,
                        },
                      )
                    }
                    className="h-5 w-5"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    const confirmed =
                      window.confirm(
                        `Delete "${advisory.title}"?`,
                      );

                    if (confirmed) {
                      deleteAdvisory(
                        advisory.id,
                      );
                    }
                  }}
                  className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  Delete advisory
                </button>
              </div>
            </div>

            <AdvisoryPreview
              title={advisory.title}
              wording={advisory.wording}
              type={advisory.type}
              active={advisory.active}
            />
          </article>
        ))}
      </div>
    </div>
  );
}

function BrandingTab({
  settings,
  businessName,
  applicationName,
  updateSettings,
}: {
  settings: BrandingSettings;
  businessName: string;
  applicationName: string;
  updateSettings: (
    updates: Partial<BrandingSettings>,
  ) => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Branding and appearance"
        description="Store GreenFlow's identity in one place so the application can later be rebranded for other companies."
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_480px]">
        <div className="grid gap-5 md:grid-cols-2">
          <ColourField
            label="Primary dark green"
            value={settings.primaryColour}
            onChange={(value) =>
              updateSettings({
                primaryColour: value,
              })
            }
          />

          <ColourField
            label="Secondary green"
            value={
              settings.secondaryColour
            }
            onChange={(value) =>
              updateSettings({
                secondaryColour: value,
              })
            }
          />

          <ColourField
            label="Warning colour"
            value={settings.warningColour}
            onChange={(value) =>
              updateSettings({
                warningColour: value,
              })
            }
          />

          <Field label="Application subtitle">
            <input
              value={
                settings.applicationSubtitle
              }
              onChange={(event) =>
                updateSettings({
                  applicationSubtitle:
                    event.target.value,
                })
              }
              className={inputClass}
            />
          </Field>

          <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4 md:col-span-2">
            <div>
              <div className="font-semibold">
                Show business name in the sidebar
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Useful now for Sharpes Lawn Care and
                later for other GreenFlow companies.
              </div>
            </div>

            <input
              type="checkbox"
              checked={
                settings.showBusinessNameInSidebar
              }
              onChange={(event) =>
                updateSettings({
                  showBusinessNameInSidebar:
                    event.target.checked,
                })
              }
              className="h-5 w-5"
            />
          </label>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Branding preview
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div
              className="p-5 text-white"
              style={{
                backgroundColor:
                  settings.primaryColour,
              }}
            >
              <div className="text-2xl font-bold">
                {applicationName}
              </div>

              <div className="mt-1 text-sm opacity-80">
                {settings.applicationSubtitle}
              </div>

              {settings.showBusinessNameInSidebar && (
                <div className="mt-5 rounded-xl bg-white/10 p-3 text-sm font-semibold">
                  {businessName}
                </div>
              )}
            </div>

            <div className="p-5">
              <div className="text-xl font-bold">
                Operations Dashboard
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Example of how the selected colours
                and identity could appear throughout
                the application.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  style={{
                    backgroundColor:
                      settings.primaryColour,
                  }}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                >
                  Primary action
                </button>

                <button
                  type="button"
                  style={{
                    borderColor:
                      settings.secondaryColour,
                    color:
                      settings.secondaryColour,
                  }}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  Secondary action
                </button>

                <span
                  style={{
                    backgroundColor:
                      `${settings.warningColour}18`,
                    color:
                      settings.warningColour,
                  }}
                  className="rounded-full px-3 py-2 text-sm font-bold"
                >
                  Warning
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            The colour values are saved now. We will
            connect them to the full application
            shell in a later step.
          </p>
        </aside>
      </div>
    </div>
  );
}

function FleetTab({
  vehicles,
  activeVehicles,
  addVehicle,
  updateVehicle,
  restoreDefaultFleet,
  showMessage,
}: {
  vehicles: FleetVehicle[];
  activeVehicles: FleetVehicle[];
  addVehicle: (
    name?: string,
  ) => FleetVehicle;
  updateVehicle: (
    vehicleId: string,
    updates: Partial<
      Pick<
        FleetVehicle,
        "name" | "active"
      >
    >,
  ) => void;
  restoreDefaultFleet: () => void;
  showMessage: (
    text: string,
  ) => void;
}) {
  const [newVehicleName, setNewVehicleName] =
    useState("");

  function handleAddVehicle() {
    const vehicle =
      addVehicle(
        newVehicleName.trim() ||
          undefined,
      );

    setNewVehicleName("");

    showMessage(
      `${vehicle.name} added to the fleet.`,
    );
  }

  function handleToggleVehicle(
    vehicle: FleetVehicle,
  ) {
    if (
      vehicle.active &&
      activeVehicles.length === 1
    ) {
      showMessage(
        "At least one vehicle must remain active.",
      );
      return;
    }

    updateVehicle(
      vehicle.id,
      {
        active:
          !vehicle.active,
      },
    );

    showMessage(
      vehicle.active
        ? `${vehicle.name} deactivated.`
        : `${vehicle.name} activated.`,
    );
  }

  function handleRestoreDefaultFleet() {
    const confirmed =
      window.confirm(
        "Restore the fleet to Van 1 only? Existing customer history will not be deleted.",
      );

    if (!confirmed) {
      return;
    }

    restoreDefaultFleet();

    showMessage(
      "Fleet restored to Van 1 only.",
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          title="Fleet settings"
          description="Start with Van 1 only, then add more vehicles when the business grows. Active vehicles appear automatically in Groups & Routes."
        />

        <button
          type="button"
          onClick={
            handleRestoreDefaultFleet
          }
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          Restore Van 1 only
        </button>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <section className="space-y-3">
          {vehicles.map(
            (vehicle) => (
              <article
                key={vehicle.id}
                className={`rounded-2xl border p-5 ${
                  vehicle.active
                    ? "border-green-200 bg-green-50/40"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="grid gap-4 md:grid-cols-[1fr_170px] md:items-end">
                  <Field label="Vehicle name">
                    <input
                      value={
                        vehicle.name
                      }
                      onChange={(event) =>
                        updateVehicle(
                          vehicle.id,
                          {
                            name:
                              event.target.value,
                          },
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <button
                    type="button"
                    onClick={() =>
                      handleToggleVehicle(
                        vehicle,
                      )
                    }
                    className={`h-11 rounded-xl border px-4 text-sm font-semibold ${
                      vehicle.active
                        ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                        : "border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
                    }`}
                  >
                    {vehicle.active
                      ? "Deactivate"
                      : "Activate"}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-white px-3 py-1 font-bold text-slate-700">
                    Vehicle number{" "}
                    {vehicle.number}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 font-bold ${
                      vehicle.active
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {vehicle.active
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>
              </article>
            ),
          )}
        </section>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Add another vehicle
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            The next available vehicle number will be assigned automatically.
          </p>

          <div className="mt-4">
            <Field label="Vehicle name">
              <input
                value={newVehicleName}
                onChange={(event) =>
                  setNewVehicleName(
                    event.target.value,
                  )
                }
                placeholder={`Van ${
                  vehicles.reduce(
                    (
                      highest,
                      vehicle,
                    ) =>
                      Math.max(
                        highest,
                        vehicle.number,
                      ),
                    0,
                  ) + 1
                }`}
                className={inputClass}
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={handleAddVehicle}
            className="mt-4 w-full rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
          >
            + Add vehicle
          </button>

          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Deactivating a vehicle hides it from new assignments but does not remove historic customer or route records.
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold">
        {title}
      </h2>

      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

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

function TextSetting({
  label,
  value,
  onChange,
  large = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  large?: boolean;
}) {
  return (
    <div
      className={
        large ? "lg:col-span-2" : ""
      }
    >
      <Field label={label}>
        <textarea
          rows={large ? 5 : 4}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className={inputClass}
        />
      </Field>

      <div className="mt-1 text-right text-xs text-slate-400">
        {value.length} characters
      </div>
    </div>
  );
}

function AdvisoryPreview({
  title,
  wording,
  type,
  active,
}: {
  title: string;
  wording: string;
  type: AdvisoryType;
  active: boolean;
}) {
  const styles =
    type === "danger"
      ? "border-red-400 bg-red-50 text-red-950"
      : type === "warning"
        ? "border-amber-400 bg-amber-50 text-amber-950"
        : "border-blue-400 bg-blue-50 text-blue-950";

  return (
    <div className="mt-5">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        Paperwork preview
      </div>

      <div
        className={`rounded-xl border-2 p-4 text-center ${styles} ${
          active ? "" : "opacity-40"
        }`}
      >
        <div className="text-sm font-extrabold uppercase tracking-wide">
          {title || "Advisory heading"}
        </div>

        <p className="mt-2 text-xs font-medium leading-5">
          {wording ||
            "Customer advisory wording"}
        </p>
      </div>
    </div>
  );
}

function ColourField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-[46px] w-16 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
        />

        <input
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className={inputClass}
        />
      </div>
    </Field>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-[#338b45] focus:ring-4 focus:ring-green-100";