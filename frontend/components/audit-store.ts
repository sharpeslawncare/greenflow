"use client";

export type AuditArea =
  | "Customers"
  | "Programmes"
  | "Treatments"
  | "Chemicals"
  | "Stock"
  | "Additional Jobs"
  | "Settings"
  | "Backup & Recovery"
  | "System";

export type AuditAction =
  | "Created"
  | "Updated"
  | "Deleted"
  | "Replaced"
  | "Restored"
  | "Imported"
  | "Exported"
  | "Completed"
  | "Scheduled"
  | "Cancelled"
  | "Adjusted";

export type AuditEntry = {
  id: string;
  createdAt: string;
  user: string;
  area: AuditArea;
  action: AuditAction;
  reference: string;
  description: string;
  changedFields: string[];
};

type AuditInput = Omit<
  AuditEntry,
  "id" | "createdAt" | "user"
> & {
  user?: string;
};

const STORAGE_KEY = "greenflow-audit-trail-v1";
const DEFAULT_USER = "Rob Sharpe";
const MAX_ENTRIES = 5000;

export function recordAuditEvent(
  input: AuditInput,
): AuditEntry | null {
  if (typeof window === "undefined") {
    return null;
  }

  const entry: AuditEntry = {
    id: createAuditId(),
    createdAt: new Date().toISOString(),
    user: input.user?.trim() || DEFAULT_USER,
    area: input.area,
    action: input.action,
    reference: input.reference.trim(),
    description: input.description.trim(),
    changedFields: normaliseChangedFields(
      input.changedFields,
    ),
  };

  const existing = readAuditTrail();
  const next = [entry, ...existing].slice(
    0,
    MAX_ENTRIES,
  );

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(next),
    );

    window.dispatchEvent(
      new CustomEvent("greenflow-audit-updated"),
    );

    return entry;
  } catch (error) {
    console.error(
      "GreenFlow audit event could not be saved.",
      error,
    );

    return null;
  }
}

export function readAuditTrail(): AuditEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  const saved =
    window.localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isAuditEntry)
      .sort(
        (first, second) =>
          second.createdAt.localeCompare(
            first.createdAt,
          ),
      );
  } catch {
    return [];
  }
}

export function clearAuditTrail() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);

  window.dispatchEvent(
    new CustomEvent("greenflow-audit-updated"),
  );
}

export function getAuditStorageKey() {
  return STORAGE_KEY;
}

function normaliseChangedFields(
  fields: string[],
) {
  return Array.from(
    new Set(
      fields
        .map((field) => field.trim())
        .filter(Boolean),
    ),
  ).sort((first, second) =>
    first.localeCompare(second),
  );
}

function isAuditEntry(
  value: unknown,
): value is AuditEntry {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const candidate =
    value as Partial<AuditEntry>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.user === "string" &&
    typeof candidate.area === "string" &&
    typeof candidate.action === "string" &&
    typeof candidate.reference === "string" &&
    typeof candidate.description === "string" &&
    Array.isArray(candidate.changedFields) &&
    candidate.changedFields.every(
      (field) => typeof field === "string",
    )
  );
}

function createAuditId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `audit-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
