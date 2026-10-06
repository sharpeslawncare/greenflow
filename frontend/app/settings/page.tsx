"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import {
  type AdvisoryType,
  type BrandingSettings,
  type BusinessSettings,
  type CommunicationSettings,
  type InvoiceSettings,
  type TreatmentLibraryItem,
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
import {
  type AuditAction,
  type AuditArea,
  type AuditEntry,
  loadCentralAuditTrail,
} from "@/components/audit-store";
type SettingsTab =
  | "health"
  | "backups"
  | "audit"
  | "business"
  | "invoices"
  | "wording"
  | "communications"
  | "advisories"
  | "branding"
  | "fleet";

const tabs: Array<{
  id: SettingsTab;
  label: string;
}> = [
  {
    id: "business",
    label: "Business",
  },
  {
    id: "invoices",
    label: "Invoices",
  },
  {
    id: "wording",
    label: "Treatments",
  },
  {
    id: "communications",
    label: "Communications",
  },
  {
    id: "branding",
    label: "Branding",
  },
  {
    id: "backups",
    label: "Backup & Restore",
  },
  {
    id: "audit",
    label: "Audit Trail",
  },
  {
    id: "health",
    label: "System Health",
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
    updateCommunicationSettings,
    addTreatmentLibraryItem,
    updateTreatmentLibraryItem,
    deleteTreatmentLibraryItem,
    updateBrandingSettings,
    updateAdvisory,
    addAdvisory,
    deleteAdvisory,
    getNextInvoiceNumber,
    incrementInvoiceNumber,
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
  } = useChemicalStore();

  const [activeTab, setActiveTab] =
    useState<SettingsTab>("business");

  const [message, setMessage] =
    useState("");

  const [healthCheckRun, setHealthCheckRun] =
    useState(false);

  const [lastBackupAt, setLastBackupAt] =
    useState("");

  const [backupBusy, setBackupBusy] =
    useState(false);

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

  async function createBackup() {
    if (backupBusy) return;

    setBackupBusy(true);

    try {
      const response = await fetch(
        "/api/backup",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Backup request failed with status ${response.status}.`,
        );
      }

      const blob = await response.blob();
      const disposition =
        response.headers.get(
          "Content-Disposition",
        ) ?? "";

      const filenameMatch =
        disposition.match(
          /filename="([^"]+)"/,
        );

      const createdAt =
        new Date().toISOString();

      const filename =
        filenameMatch?.[1] ??
        `greenflow-central-backup-${createdAt
          .slice(0, 19)
          .replaceAll(":", "-")}.json`;

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;
      link.download = filename;

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
        "Central PostgreSQL backup downloaded.",
      );
    } catch (error) {
      console.error(
        "GreenFlow central backup could not be downloaded.",
        error,
      );

      showMessage(
        "The central backup could not be downloaded.",
      );
    } finally {
      setBackupBusy(false);
    }
  }

  async function testInvoiceNumber() {
    const confirmed = window.confirm(
      `The next invoice number is ${getNextInvoiceNumber()}. Increase it to the following number?`,
    );

    if (!confirmed) return;

    const increased =
      await incrementInvoiceNumber();

    showMessage(
      increased
        ? "The central next invoice number was increased."
        : "The invoice number could not be increased. No number was changed.",
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
        <main
          className="gf-page"
          style={
            {
              "--gf-page-accent": "#475569",
            } as CSSProperties
          }
        >
          <div className="gf-page-inner">
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
              Loading business settings...
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main
        className="gf-page"
        style={
          {
            "--gf-page-accent": "#475569",
          } as CSSProperties
        }
      >
        <div className="gf-page-inner">
          <header className="gf-page-header">
            <div className="gf-page-header-copy">
              <div className="gf-eyebrow">
                GreenFlow setup
              </div>
              <h1 className="gf-h1">
                Settings
              </h1>
              <p className="gf-page-description">
                Manage the business details and wording used every day. Central backup and diagnostics are available alongside normal setup.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← Dashboard
            </Link>
          </header>

          <section className="mb-4 grid gap-3 md:grid-cols-3">
            <SettingsOverviewCard
              label="Business setup"
              title={settings.business.businessName || "Business details"}
              detail="Contact details, invoices and customer-facing branding"
            />
            <SettingsOverviewCard
              label="Treatment setup"
              title={`${settings.treatmentLibrary.length} treatment types`}
              detail="Treatment wording, advice and customer communications"
            />
            <SettingsOverviewCard
              label="Data protection"
              title={lastBackupAt ? "Backup recorded" : "Backup recommended"}
              detail={
                lastBackupAt
                  ? `Last backup ${formatBackupDate(lastBackupAt)}`
                  : "Create a backup before major changes"
              }
              warning={!lastBackupAt}
            />
          </section>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#176b37]">
                Settings area
              </div>
              <h2 className="gf-h2 mt-1">
                Choose what you want to change
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Everyday business settings come first. Central backup, audit and system health tools are grouped later in the navigation.
              </p>
            </div>

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

              {activeTab === "audit" && (
                <AuditTrailTab />
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
                  backupBusy={
                    backupBusy
                  }
                  onCreateBackup={
                    createBackup
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
                  treatmentLibrary={
                    settings.treatmentLibrary
                  }
                  advisories={
                    settings.advisories
                  }
                  updateSettings={
                    updateTreatmentWording
                  }
                  addTreatment={
                    addTreatmentLibraryItem
                  }
                  updateTreatment={
                    updateTreatmentLibraryItem
                  }
                  deleteTreatment={
                    deleteTreatmentLibraryItem
                  }
                  updateAdvisory={
                    updateAdvisory
                  }
                  addAdvisory={
                    addAdvisory
                  }
                  deleteAdvisory={
                    deleteAdvisory
                  }
                />
              )}

              {activeTab === "communications" && (
                <CustomerCommunicationsTab
                  settings={settings.communications}
                  updateSettings={
                    updateCommunicationSettings
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
                Centralised settings are saved automatically.
              </span>

              <span className="font-semibold text-green-700">
                Settings saved automatically
              </span>
            </footer>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function SettingsOverviewCard({
  label,
  title,
  detail,
  warning = false,
}: {
  label: string;
  title: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        warning
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`text-xs font-bold uppercase tracking-[0.12em] ${
          warning ? "text-amber-700" : "text-slate-500"
        }`}
      >
        {label}
      </div>
      <div className="mt-2 text-lg font-bold text-slate-950">
        {title}
      </div>
      <div
        className={`mt-1 text-xs leading-5 ${
          warning ? "text-amber-800" : "text-slate-500"
        }`}
      >
        {detail}
      </div>
    </div>
  );
}

function BackupRestoreTab({
  lastBackupAt,
  backupBusy,
  onCreateBackup,
}: {
  lastBackupAt: string;
  backupBusy: boolean;
  onCreateBackup: () => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Central backup"
        description="Download an organisation-scoped export of GreenFlow data stored centrally in PostgreSQL."
      />

      <section className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
              PostgreSQL export
            </div>

            <h3 className="mt-2 text-2xl font-bold text-green-950">
              Download central GreenFlow data
            </h3>

            <p className="mt-2 text-sm leading-6 text-green-800">
              Creates a JSON export directly from the central PostgreSQL data for this organisation. It includes customers and additional jobs, enquiries, seasons, programmes, route orders, treatments, chemicals and stock movements, working days, communications, customer actions, the audit trail, organisation settings and the invoice sequence.
            </p>
          </div>

          <button
            type="button"
            onClick={onCreateBackup}
            disabled={backupBusy}
            className="rounded-xl bg-[#176b37] px-5 py-3 text-sm font-bold text-white hover:bg-[#125b2f] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {backupBusy
              ? "Creating Backup..."
              : "Create Central Backup"}
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-green-200 bg-white p-4 text-sm leading-6 text-green-900">
            <strong>Last central backup downloaded in this browser:</strong>{" "}
            {lastBackupAt
              ? formatBackupDate(
                  lastBackupAt,
                )
              : "No central backup recorded yet."}
          </div>

          <div className="rounded-xl border border-green-200 bg-white p-4 text-sm leading-6 text-green-900">
            <strong>Keep copies separately:</strong>{" "}
            downloaded backups are ordinary JSON files. Store important copies somewhere separate from GreenFlow, such as your backup folder or OneDrive.
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">
          Restore protection
        </div>

        <h3 className="mt-2 text-xl font-bold text-amber-950">
          Automatic restore is not currently supported
        </h3>

        <p className="mt-2 text-sm leading-6 text-amber-900">
          This backup is an independent export for safekeeping. GreenFlow does not currently offer an in-app PostgreSQL restore because restoring linked operational records, audit history and invoice numbering requires additional safeguards. The previous browser-data restore controls have been removed so they cannot overwrite local caches while PostgreSQL remains authoritative.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
          Browser-only data
        </div>

        <h3 className="mt-2 text-xl font-bold text-blue-950">
          Fleet is not included yet
        </h3>

        <p className="mt-2 text-sm leading-6 text-blue-900">
          Fleet is intentionally still stored only in this browser and is outside the central PostgreSQL backup. Fleet centralisation is deferred until after Live. The old browser recovery-point system is no longer exposed here because it was not a backup of the authoritative PostgreSQL data.
        </p>
      </section>
    </div>
  );
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

function AuditTrailTab() {
  const [entries, setEntries] =
    useState<AuditEntry[]>([]);
  const [areaFilter, setAreaFilter] =
    useState<AuditArea | "All">("All");
  const [actionFilter, setActionFilter] =
    useState<AuditAction | "All">("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function refreshAuditTrail() {
      const centralEntries =
        await loadCentralAuditTrail();

      if (!cancelled) {
        setEntries(centralEntries);
      }
    }

    void refreshAuditTrail();

    function handleAuditUpdated() {
      void refreshAuditTrail();
    }

    window.addEventListener(
      "greenflow-audit-updated",
      handleAuditUpdated,
    );
    window.addEventListener(
      "storage",
      handleAuditUpdated,
    );

    return () => {
      cancelled = true;

      window.removeEventListener(
        "greenflow-audit-updated",
        handleAuditUpdated,
      );
      window.removeEventListener(
        "storage",
        handleAuditUpdated,
      );
    };
  }, []);

  const areas = useMemo(
    () =>
      Array.from(
        new Set(entries.map((entry) => entry.area)),
      ).sort((first, second) =>
        first.localeCompare(second),
      ),
    [entries],
  );

  const actions = useMemo(
    () =>
      Array.from(
        new Set(entries.map((entry) => entry.action)),
      ).sort((first, second) =>
        first.localeCompare(second),
      ),
    [entries],
  );

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (
        areaFilter !== "All" &&
        entry.area !== areaFilter
      ) {
        return false;
      }

      if (
        actionFilter !== "All" &&
        entry.action !== actionFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        entry.user,
        entry.area,
        entry.action,
        entry.reference,
        entry.description,
        ...entry.changedFields,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [
    entries,
    areaFilter,
    actionFilter,
    search,
  ]);

  return (
    <div>
      <SectionHeading
        title="Audit trail"
        description="Review important GreenFlow changes recorded centrally for your organisation. The audit trail is read-only here and records who made a change, what area was affected and which fields changed."
      />

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Recorded events
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-950">
            {entries.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Stored audit entries for this organisation
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Showing
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-950">
            {filteredEntries.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Events matching the current filters
          </div>
        </div>

        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-green-700">
            Protection
          </div>
          <div className="mt-2 text-lg font-bold text-green-950">
            Read-only history
          </div>
          <div className="mt-1 text-xs leading-5 text-green-800">
            There is no clear or delete control on this screen.
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
          <Field label="Search audit trail">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Customer, reference, description, field..."
              className={inputClass}
            />
          </Field>

          <Field label="Area">
            <select
              value={areaFilter}
              onChange={(event) =>
                setAreaFilter(
                  event.target.value as AuditArea | "All",
                )
              }
              className={inputClass}
            >
              <option value="All">All areas</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Action">
            <select
              value={actionFilter}
              onChange={(event) =>
                setActionFilter(
                  event.target.value as AuditAction | "All",
                )
              }
              className={inputClass}
            >
              <option value="All">All actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {entries.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="text-lg font-bold text-slate-900">
            No audit events recorded yet
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            GreenFlow will show recorded application changes here as audit-enabled areas are used.
          </p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="text-lg font-bold text-slate-900">
            No matching audit events
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Change the search text or filters to see more activity.
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[170px_130px_130px_150px_1fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 xl:grid">
            <span>Date & time</span>
            <span>User</span>
            <span>Area</span>
            <span>Action / reference</span>
            <span>Details</span>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredEntries.map((entry) => (
              <article
                key={entry.id}
                className="grid gap-3 px-4 py-4 xl:grid-cols-[170px_130px_130px_150px_1fr] xl:items-start"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-700">
                    {formatAuditDate(entry.createdAt)}
                  </div>
                </div>

                <div className="text-sm font-semibold text-slate-900">
                  {entry.user}
                </div>

                <div>
                  <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                    {entry.area}
                  </span>
                </div>

                <div>
                  <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800">
                    {entry.action}
                  </span>
                  <div className="mt-2 break-words text-xs font-semibold text-slate-600">
                    {entry.reference || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-sm leading-6 text-slate-900">
                    {entry.description || "No description recorded."}
                  </div>

                  {entry.changedFields.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.changedFields.map((field) => (
                        <span
                          key={field}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        <strong>Audit trail:</strong>{" "}
        this view records metadata about changes rather than displaying old and new sensitive field values. Downloadable central GreenFlow backups include the organisation audit trail.
      </div>
    </div>
  );
}

function formatAuditDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
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
              GreenFlow reserves invoice numbers centrally
              in PostgreSQL before completed visits are
              recorded. Reserved numbers are never reused.
            </p>

            <button
              type="button"
              onClick={onIncreaseInvoiceNumber}
              className="mt-4 w-full rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
            >
              Increase next number
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

function CustomerCommunicationsTab({
  settings,
  updateSettings,
}: {
  settings: CommunicationSettings;
  updateSettings: (
    updates: Partial<CommunicationSettings>,
  ) => void;
}) {
  const defaultTemplate =
    "Hi {firstName}, just a reminder that Sharpes Lawn Care is due to visit on {date} for {treatment}. Please make sure we can access the lawn. Many thanks, Rob - Sharpes Lawn Care";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <SectionHeading
          title="Customer communications"
          description="Control the wording GreenFlow uses when preparing upcoming-visit reminders. Changes are saved automatically."
        />

        <div className="mt-6">
          <Field label="Visit reminder template">
            <textarea
              value={settings.visitReminderTemplate}
              onChange={(event) =>
                updateSettings({
                  visitReminderTemplate:
                    event.target.value,
                })
              }
              rows={7}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-[#338b45] focus:ring-2 focus:ring-green-100"
            />
          </Field>

          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <div className="font-bold">
              Available placeholders
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                "{firstName}",
                "{date}",
                "{treatment}",
              ].map((placeholder) => (
                <code
                  key={placeholder}
                  className="rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold"
                >
                  {placeholder}
                </code>
              ))}
            </div>
            <p className="mt-3 leading-6">
              GreenFlow replaces these automatically for each customer. Programme visits use “your scheduled lawn treatment”; Additional Jobs use the actual service name.
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Example preview
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
              {renderCommunicationTemplate(
                settings.visitReminderTemplate,
                {
                  firstName: "John",
                  date: "Monday 14 September 2026",
                  treatment:
                    "your scheduled lawn treatment",
                },
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              updateSettings({
                visitReminderTemplate:
                  defaultTemplate,
              })
            }
            className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Restore default reminder
          </button>
        </div>
      </section>
    </div>
  );
}

function renderCommunicationTemplate(
  template: string,
  values: {
    firstName: string;
    date: string;
    treatment: string;
  },
) {
  return (template || "")
    .replaceAll(
      "{firstName}",
      values.firstName,
    )
    .replaceAll("{date}", values.date)
    .replaceAll(
      "{treatment}",
      values.treatment,
    );
}

function TreatmentWordingTab({
  settings,
  treatmentLibrary,
  advisories,
  updateSettings,
  addTreatment,
  updateTreatment,
  deleteTreatment,
  updateAdvisory,
  addAdvisory,
  deleteAdvisory,
}: {
  settings: TreatmentWordingSettings;
  treatmentLibrary: TreatmentLibraryItem[];
  advisories: Array<{
    id: string;
    title: string;
    wording: string;
    type: AdvisoryType;
    active: boolean;
  }>;
  updateSettings: (
    updates: Partial<TreatmentWordingSettings>,
  ) => void;
  addTreatment: () => string;
  updateTreatment: (
    treatmentId: string,
    updates: Partial<
      Pick<
        TreatmentLibraryItem,
        "code" | "name" | "wording" | "advisoryIds" | "active"
      >
    >,
  ) => void;
  deleteTreatment: (treatmentId: string) => void;
  updateAdvisory: (
    advisoryId: string,
    updates: Partial<{
      title: string;
      wording: string;
      type: AdvisoryType;
      active: boolean;
    }>,
  ) => void;
  addAdvisory: () => string;
  deleteAdvisory: (advisoryId: string) => void;
}) {
  const [newTreatmentId, setNewTreatmentId] = useState("");
  const [editingAdvisory, setEditingAdvisory] = useState<{
    treatmentId: string;
    advisoryId: string;
  } | null>(null);
  const [addingAdvisoryToTreatmentId, setAddingAdvisoryToTreatmentId] =
    useState<string | null>(null);
  const [expandedTreatmentIds, setExpandedTreatmentIds] = useState<Set<string>>(
    () => new Set(),
  );

  function handleAddTreatment() {
    const treatmentId = addTreatment();
    setNewTreatmentId(treatmentId);
    setExpandedTreatmentIds((current) => {
      const next = new Set(current);
      next.add(treatmentId);
      return next;
    });

    window.setTimeout(() => {
      document
        .getElementById(`treatment-library-${treatmentId}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 0);
  }

  function handleCreateAdvisory(treatment: TreatmentLibraryItem) {
    const advisoryId = addAdvisory();

    updateTreatment(treatment.id, {
      advisoryIds: [
        ...new Set([
          ...treatment.advisoryIds,
          advisoryId,
        ]),
      ],
    });

    setAddingAdvisoryToTreatmentId(null);
    setEditingAdvisory({
      treatmentId: treatment.id,
      advisoryId,
    });
  }

  function toggleTreatment(treatmentId: string) {
    setExpandedTreatmentIds((current) => {
      const next = new Set(current);

      if (next.has(treatmentId)) {
        next.delete(treatmentId);
      } else {
        next.add(treatmentId);
      }

      return next;
    });
  }

  function expandAllTreatments() {
    setExpandedTreatmentIds(
      new Set(treatmentLibrary.map((treatment) => treatment.id)),
    );
  }

  function collapseAllTreatments() {
    setExpandedTreatmentIds(new Set());
    setEditingAdvisory(null);
    setAddingAdvisoryToTreatmentId(null);
  }

  function treatmentCodeNumber(code: string) {
    const match = code.trim().match(/^T(\d+)$/i);
    return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
  }

  function sortByTreatmentCode(
    treatments: TreatmentLibraryItem[],
  ) {
    return [...treatments].sort((a, b) => {
      const codeDifference =
        treatmentCodeNumber(a.code) - treatmentCodeNumber(b.code);

      if (codeDifference !== 0) {
        return codeDifference;
      }

      return a.code.localeCompare(b.code, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }

  const annualTreatments = sortByTreatmentCode(
    treatmentLibrary.filter(
      (treatment) => treatment.category === "Annual programme",
    ),
  );
  const additionalJobs = sortByTreatmentCode(
    treatmentLibrary.filter(
      (treatment) => treatment.category !== "Annual programme",
    ),
  );

  const sectionProps = {
    advisories,
    updateTreatment,
    deleteTreatment,
    updateAdvisory,
    deleteAdvisory,
    onCreateAdvisory: handleCreateAdvisory,
    editingAdvisory,
    setEditingAdvisory,
    addingAdvisoryToTreatmentId,
    setAddingAdvisoryToTreatmentId,
    expandedTreatmentIds,
    toggleTreatment,
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          title="Treatment Codes"
          description="Set the Treatment Code and Customer Wording, then add only the Advisories that should go with that Treatment."
        />

        <button
          type="button"
          onClick={handleAddTreatment}
          className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#125b2f]"
        >
          + Add Treatment Code
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-green-200 bg-green-50/60 p-4 text-sm leading-6 text-green-900">
        <strong>Advisories Belong to Each Treatment Separately.</strong>{" "}
        Each Treatment shows only the Advisories assigned to it. Use Add Advisory to reuse an existing Advisory or create a new one just for that Treatment.
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={expandAllTreatments}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Expand All
        </button>
        <button
          type="button"
          onClick={collapseAllTreatments}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Collapse All
        </button>
      </div>

      <TreatmentLibrarySection
        title="Annual Programme"
        description="Your Regular Seasonal Treatments."
        treatments={annualTreatments}
        {...sectionProps}
        highlightId={newTreatmentId}
      />

      <TreatmentLibrarySection
        title="Additional Jobs"
        description="Aeration, Scarification, Overseeding and Any Other Work Outside the Annual Programme."
        treatments={additionalJobs}
        {...sectionProps}
        emptyMessage="No Additional Jobs Yet. Use “Add Treatment Code” When You Need One."
        highlightId={newTreatmentId}
      />

      <details className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <summary className="cursor-pointer font-bold text-slate-800">
          Existing compatibility wording
        </summary>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          These older wording fields are retained while the Treatment Code Library is connected across the rest of GreenFlow.
        </p>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <TextSetting label="Seasonal fertiliser visit" value={settings.seasonalFertiliserVisit} onChange={(value) => updateSettings({ seasonalFertiliserVisit: value })} />
          <TextSetting label="Selective herbicide visit" value={settings.herbicideVisit} onChange={(value) => updateSettings({ herbicideVisit: value })} />
          <TextSetting label="Combined fertiliser and herbicide" value={settings.combinedFertiliserAndHerbicideVisit} onChange={(value) => updateSettings({ combinedFertiliserAndHerbicideVisit: value })} />
          <TextSetting label="Generic moss-control visit" value={settings.mossControlVisit} onChange={(value) => updateSettings({ mossControlVisit: value })} />
          <TextSetting label="Cancelled visit" value={settings.cancelledVisit} onChange={(value) => updateSettings({ cancelledVisit: value })} />
          <TextSetting label="Rescheduled visit" value={settings.rescheduledVisit} onChange={(value) => updateSettings({ rescheduledVisit: value })} />
          <TextSetting label="Preparing for the next visit" value={settings.nextVisitPreparation} onChange={(value) => updateSettings({ nextVisitPreparation: value })} large />
        </div>
      </details>
    </div>
  );
}

function TreatmentLibrarySection({
  title,
  description,
  treatments,
  advisories,
  updateTreatment,
  deleteTreatment,
  updateAdvisory,
  deleteAdvisory,
  onCreateAdvisory,
  editingAdvisory,
  setEditingAdvisory,
  addingAdvisoryToTreatmentId,
  setAddingAdvisoryToTreatmentId,
  expandedTreatmentIds,
  toggleTreatment,
  emptyMessage = "",
  highlightId = "",
}: {
  title: string;
  description: string;
  treatments: TreatmentLibraryItem[];
  advisories: Array<{
    id: string;
    title: string;
    wording: string;
    type: AdvisoryType;
    active: boolean;
  }>;
  updateTreatment: (
    treatmentId: string,
    updates: Partial<
      Pick<
        TreatmentLibraryItem,
        "code" | "name" | "wording" | "advisoryIds" | "active"
      >
    >,
  ) => void;
  deleteTreatment: (treatmentId: string) => void;
  updateAdvisory: (
    advisoryId: string,
    updates: Partial<{
      title: string;
      wording: string;
      type: AdvisoryType;
      active: boolean;
    }>,
  ) => void;
  deleteAdvisory: (advisoryId: string) => void;
  onCreateAdvisory: (treatment: TreatmentLibraryItem) => void;
  editingAdvisory: {
    treatmentId: string;
    advisoryId: string;
  } | null;
  setEditingAdvisory: (
    value: {
      treatmentId: string;
      advisoryId: string;
    } | null,
  ) => void;
  addingAdvisoryToTreatmentId: string | null;
  setAddingAdvisoryToTreatmentId: (value: string | null) => void;
  expandedTreatmentIds: Set<string>;
  toggleTreatment: (treatmentId: string) => void;
  emptyMessage?: string;
  highlightId?: string;
}) {
  return (
    <section className="mt-7">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>

      {treatments.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-sm text-slate-500">
          {emptyMessage || "No treatments in this section."}
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          {treatments.map((treatment) => {
            const selectedAdvisories = advisories.filter((advisory) =>
              treatment.advisoryIds.includes(advisory.id),
            );
            const availableAdvisories = advisories.filter(
              (advisory) =>
                advisory.active && !treatment.advisoryIds.includes(advisory.id),
            );
            const isAddingAdvisory =
              addingAdvisoryToTreatmentId === treatment.id;
            const isExpanded = expandedTreatmentIds.has(treatment.id);
            const advisoryBeingEdited =
              editingAdvisory?.treatmentId === treatment.id
                ? advisories.find(
                    (advisory) => advisory.id === editingAdvisory.advisoryId,
                  )
                : undefined;

            return (
              <article
                id={`treatment-library-${treatment.id}`}
                key={treatment.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                  highlightId === treatment.id
                    ? "border-green-400 ring-4 ring-green-100"
                    : treatment.active
                      ? "border-slate-200"
                      : "border-slate-200 bg-slate-50 opacity-75"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleTreatment(treatment.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left"
                  aria-expanded={isExpanded}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#176b37] text-base font-extrabold text-white shadow-sm">
                    {treatment.code}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">
                    {treatment.name}
                  </span>
                  <span className="hidden shrink-0 text-xs font-semibold text-slate-500 sm:inline">
                    {selectedAdvisories.length}{" "}
                    {selectedAdvisories.length === 1 ? "Advisory" : "Advisories"}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                      treatment.active
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {treatment.active ? "Active" : "Inactive"}
                  </span>
                  <span className="w-5 shrink-0 text-center text-sm font-black text-slate-500">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="grid min-w-0 flex-1 gap-4 md:grid-cols-[120px_minmax(240px,1fr)]">
                        <Field label="Treatment Code">
                          <input
                            value={treatment.code}
                            onChange={(event) =>
                              updateTreatment(treatment.id, {
                                code: event.target.value,
                              })
                            }
                            className={`${inputClass} font-bold`}
                            placeholder="T1"
                          />
                        </Field>
                        <Field label="Treatment Name">
                          <input
                            value={treatment.name}
                            onChange={(event) =>
                              updateTreatment(treatment.id, {
                                name: event.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        </Field>
                      </div>

                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={treatment.active}
                          onChange={(event) =>
                            updateTreatment(treatment.id, {
                              active: event.target.checked,
                            })
                          }
                          className="h-4 w-4"
                        />
                        <span className="text-sm font-semibold text-slate-700">
                          Active
                        </span>
                      </label>
                    </div>

                <div className="mt-4">
                  <Field label="Customer Wording">
                    <textarea
                      rows={5}
                      value={treatment.wording}
                      onChange={(event) => updateTreatment(treatment.id, { wording: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3">
                    <div className="text-sm font-bold text-slate-900">Advisories</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      Only Advisories added to this Treatment are shown here.
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {selectedAdvisories.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-xs font-medium text-slate-500">
                        No Advisories have been added to this Treatment.
                      </div>
                    ) : (
                      selectedAdvisories.map((advisory) => {
                        const advisoryTone =
                          advisory.type === "danger"
                            ? "border-red-400 bg-red-100 text-red-950"
                            : advisory.type === "warning"
                              ? "border-amber-400 bg-amber-100 text-amber-950"
                              : advisory.type === "information"
                                ? "border-blue-400 bg-blue-100 text-blue-950"
                                : advisory.type === "orange"
                                  ? "border-orange-400 bg-orange-100 text-orange-950"
                                  : advisory.type === "purple"
                                    ? "border-purple-400 bg-purple-100 text-purple-950"
                                    : "border-slate-400 bg-slate-100 text-slate-950";

                        return (
                          <div
                            key={advisory.id}
                            className={`flex items-start gap-3 rounded-xl border-2 p-3 ${advisoryTone}`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-extrabold">{advisory.title}</div>
                              <div className="mt-0.5 text-xs font-medium leading-5 opacity-80">
                                {advisory.wording}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingAdvisory({
                                    treatmentId: treatment.id,
                                    advisoryId: advisory.id,
                                  })
                                }
                                className="text-xs font-semibold text-[#176b37] hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateTreatment(treatment.id, {
                                    advisoryIds: treatment.advisoryIds.filter(
                                      (id) => id !== advisory.id,
                                    ),
                                  })
                                }
                                className="text-xs font-semibold text-slate-600 hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setAddingAdvisoryToTreatmentId(
                        isAddingAdvisory ? null : treatment.id,
                      )
                    }
                    className="mt-3 rounded-xl border border-[#176b37] bg-white px-3 py-2 text-sm font-bold text-[#176b37] hover:bg-green-50"
                  >
                    {isAddingAdvisory ? "Close Advisory Choices" : "+ Add Advisory"}
                  </button>

                  {isAddingAdvisory && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Available Advisories
                      </div>

                      {availableAdvisories.length > 0 ? (
                        <div className="mt-2 grid gap-2">
                          {availableAdvisories.map((advisory) => (
                            <button
                              key={advisory.id}
                              type="button"
                              onClick={() => {
                                updateTreatment(treatment.id, {
                                  advisoryIds: [
                                    ...new Set([
                                      ...treatment.advisoryIds,
                                      advisory.id,
                                    ]),
                                  ],
                                });
                                setAddingAdvisoryToTreatmentId(null);
                              }}
                              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-green-300 hover:bg-green-50"
                            >
                              <span>
                                <span className="block text-sm font-bold text-slate-800">
                                  {advisory.title}
                                </span>
                                <span className="mt-0.5 block text-xs text-slate-500">
                                  {advisory.wording}
                                </span>
                              </span>
                              <span className="shrink-0 text-xs font-bold text-[#176b37]">
                                Add
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-slate-500">
                          All Available Advisories are already assigned to this Treatment.
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => onCreateAdvisory(treatment)}
                        className="mt-3 rounded-lg bg-[#176b37] px-3 py-2 text-sm font-bold text-white hover:bg-[#125b2f]"
                      >
                        + Create New Advisory
                      </button>
                    </div>
                  )}

                  {advisoryBeingEdited && (
                    <div className="mt-4 rounded-xl border border-green-200 bg-green-50/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-bold text-green-900">
                          {advisoryBeingEdited.title.startsWith("Advisory ")
                            ? "New Advisory"
                            : "Edit Advisory"}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingAdvisory(null)}
                          className="text-xs font-semibold text-slate-600 hover:underline"
                        >
                          Done
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3">
                        <Field label="Advisory Name">
                          <input
                            value={advisoryBeingEdited.title}
                            onChange={(event) => updateAdvisory(advisoryBeingEdited.id, { title: event.target.value })}
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Advisory Wording">
                          <textarea
                            rows={3}
                            value={advisoryBeingEdited.wording}
                            onChange={(event) => updateAdvisory(advisoryBeingEdited.id, { wording: event.target.value })}
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Advisory Colour">
                          <select
                            value={advisoryBeingEdited.type}
                            onChange={(event) =>
                              updateAdvisory(advisoryBeingEdited.id, {
                                type: event.target.value as AdvisoryType,
                              })
                            }
                            className={inputClass}
                          >
                            <option value="danger">Red - Safety / Keep Off</option>
                            <option value="warning">Amber - Mowing / Caution</option>
                            <option value="information">Blue - Watering / Information</option>
                            <option value="neutral">Slate - General Advice</option>
                            <option value="orange">Orange - Specialist Advice</option>
                            <option value="purple">Purple - Specialist Advice</option>
                          </select>
                        </Field>

                        { !["keep-off-lawn", "delay-mowing", "water-if-required"].includes(
                          advisoryBeingEdited.id,
                        ) ? (
                          <div className="flex justify-end border-t border-green-200 pt-3">
                            <button
                              type="button"
                              onClick={() => {
                                const confirmed = window.confirm(
                                  `Delete "${advisoryBeingEdited.title}"? It will no longer appear as an advisory choice.`,
                                );
                                if (confirmed) {
                                  deleteAdvisory(advisoryBeingEdited.id);
                                  setEditingAdvisory(null);
                                }
                              }}
                              className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                            >
                              Delete advisory
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-slate-500">
                            This is one of GreenFlow&apos;s three Standard Advisories. It can be edited or made inactive, but it is protected from deletion.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                    {!treatment.builtIn && (
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Delete "${treatment.name}" from the Treatment Library? This is safe only before the treatment is used on completed jobs.`,
                            );
                            if (confirmed) deleteTreatment(treatment.id);
                          }}
                          className="text-xs font-semibold text-red-700 hover:underline"
                        >
                          Delete treatment
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
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