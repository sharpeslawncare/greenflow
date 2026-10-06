"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ActionType =
  | "Call back"
  | "Quote follow-up"
  | "Payment"
  | "Access issue"
  | "Programme change"
  | "Customer request"
  | "Other";

export type ActionPriority = "Normal" | "High" | "Urgent";
export type ActionStatus = "Open" | "Completed" | "Cancelled";

export type CustomerAction = {
  id: string;
  customerNumber: string;
  customerName: string;
  type: ActionType;
  priority: ActionPriority;
  status: ActionStatus;
  dueDate: string;
  note: string;
  createdAt: string;
  completedAt: string;
};

type ActionStoreValue = {
  actions: CustomerAction[];
  ready: boolean;
  loadError: string;
  addAction: (
    action: Omit<CustomerAction, "id" | "createdAt" | "completedAt">,
  ) => Promise<string>;
  updateAction: (id: string, updates: Partial<CustomerAction>) => Promise<void>;
  completeAction: (id: string) => Promise<void>;
  cancelAction: (id: string) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
};

const STORAGE_KEY = "greenflow-actions-v1";
const ActionStoreContext = createContext<ActionStoreValue | null>(null);

export function ActionStoreProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<CustomerAction[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadActions() {
      try {
        const response = await fetch("/api/actions", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load actions from PostgreSQL.");

        const payload = (await response.json()) as { records?: unknown[] };
        let centralRecords = Array.isArray(payload.records)
          ? (payload.records.map(normaliseAction).filter(Boolean) as CustomerAction[])
          : [];

        const legacyRecords = readLegacyActions();
        if (legacyRecords.length > 0) {
          const centralIds = new Set(centralRecords.map((record) => record.id));
          const recordsToMigrate = legacyRecords.filter((record) => !centralIds.has(record.id));

          if (recordsToMigrate.length > 0) {
            const migrationResponse = await fetch("/api/actions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ records: recordsToMigrate }),
            });

            if (!migrationResponse.ok) {
              throw new Error("Unable to migrate existing browser actions to PostgreSQL.");
            }

            const migratedPayload = (await migrationResponse.json()) as { records?: unknown[] };
            centralRecords = Array.isArray(migratedPayload.records)
              ? (migratedPayload.records.map(normaliseAction).filter(Boolean) as CustomerAction[])
              : centralRecords;
          }

          window.localStorage.removeItem(STORAGE_KEY);
        }

        if (!cancelled) {
          setActions(centralRecords);
          setLoadError("");
        }
      } catch (error) {
        console.error("Failed to load GreenFlow actions:", error);
        if (!cancelled) {
          setActions([]);
          setLoadError(
            "GreenFlow could not load Actions from PostgreSQL. Actions are unavailable until the central database connection is restored.",
          );
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void loadActions();
    return () => {
      cancelled = true;
    };
  }, []);

  async function addAction(
    action: Omit<CustomerAction, "id" | "createdAt" | "completedAt">,
  ) {
    const record: CustomerAction = {
      ...action,
      id: createId(),
      createdAt: new Date().toISOString(),
      completedAt: "",
    };

    const response = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });

    if (!response.ok) throw new Error("GreenFlow could not save this action to PostgreSQL.");

    const payload = (await response.json()) as { records?: unknown[] };
    const saved = Array.isArray(payload.records)
      ? (payload.records.map(normaliseAction).filter(Boolean) as CustomerAction[])
      : null;

    setActions(saved ?? [record, ...actions]);
    return record.id;
  }

  async function updateAction(id: string, updates: Partial<CustomerAction>) {
    const existing = actions.find((action) => action.id === id);
    if (!existing) throw new Error("Action record not found.");

    const updated = { ...existing, ...updates };
    const response = await fetch("/api/actions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });

    if (!response.ok) throw new Error("GreenFlow could not update this action in PostgreSQL.");

    const payload = (await response.json()) as { record?: unknown };
    const saved = normaliseAction(payload.record) ?? updated;
    setActions((current) => current.map((action) => (action.id === id ? saved : action)));
  }

  async function completeAction(id: string) {
    await updateAction(id, {
      status: "Completed",
      completedAt: new Date().toISOString(),
    });
  }

  async function cancelAction(id: string) {
    await updateAction(id, { status: "Cancelled", completedAt: "" });
  }

  async function deleteAction(id: string) {
    const response = await fetch("/api/actions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) throw new Error("GreenFlow could not delete this action from PostgreSQL.");
    setActions((current) => current.filter((action) => action.id !== id));
  }

  const value = useMemo(
    () => ({
      actions,
      ready,
      loadError,
      addAction,
      updateAction,
      completeAction,
      cancelAction,
      deleteAction,
    }),
    [actions, ready, loadError],
  );

  return <ActionStoreContext.Provider value={value}>{children}</ActionStoreContext.Provider>;
}

export function useActionStore() {
  const context = useContext(ActionStoreContext);
  if (!context) throw new Error("useActionStore must be used inside ActionStoreProvider");
  return context;
}

function readLegacyActions() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.actions)
        ? parsed.actions
        : [];
    return records.map(normaliseAction).filter(Boolean) as CustomerAction[];
  } catch {
    return [];
  }
}

function normaliseAction(value: unknown): CustomerAction | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<CustomerAction>;

  const status: ActionStatus =
    record.status === "Completed" || record.status === "Cancelled" ? record.status : "Open";
  const priority: ActionPriority =
    record.priority === "High" || record.priority === "Urgent" ? record.priority : "Normal";
  const allowedTypes: ActionType[] = [
    "Call back",
    "Quote follow-up",
    "Payment",
    "Access issue",
    "Programme change",
    "Customer request",
    "Other",
  ];

  return {
    id: typeof record.id === "string" ? record.id : createId(),
    customerNumber: typeof record.customerNumber === "string" ? record.customerNumber : "",
    customerName: typeof record.customerName === "string" ? record.customerName : "",
    type: allowedTypes.includes(record.type as ActionType) ? (record.type as ActionType) : "Other",
    priority,
    status,
    dueDate: typeof record.dueDate === "string" ? record.dueDate : "",
    note: typeof record.note === "string" ? record.note : "",
    createdAt: typeof record.createdAt === "string" ? record.createdAt : "",
    completedAt: typeof record.completedAt === "string" ? record.completedAt : "",
  };
}

function createId() {
  return `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}