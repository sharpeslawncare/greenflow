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

export type ActionPriority =
  | "Normal"
  | "High"
  | "Urgent";

export type ActionStatus =
  | "Open"
  | "Completed"
  | "Cancelled";

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
  addAction: (
    action: Omit<
      CustomerAction,
      "id" | "createdAt" | "completedAt"
    >,
  ) => string;
  updateAction: (
    id: string,
    updates: Partial<CustomerAction>,
  ) => void;
  completeAction: (id: string) => void;
  cancelAction: (id: string) => void;
  deleteAction: (id: string) => void;
};

const STORAGE_KEY =
  "greenflow-actions-v1";

const ActionStoreContext =
  createContext<ActionStoreValue | null>(
    null,
  );

export function ActionStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [actions, setActions] =
    useState<CustomerAction[]>([]);
  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    try {
      const raw =
        window.localStorage.getItem(
          STORAGE_KEY,
        );

      if (raw) {
        const parsed = JSON.parse(raw);
        const records = Array.isArray(
          parsed,
        )
          ? parsed
          : Array.isArray(parsed?.actions)
            ? parsed.actions
            : [];

        setActions(
          records
            .map(normaliseAction)
            .filter(Boolean) as CustomerAction[],
        );
      }
    } catch {
      window.localStorage.removeItem(
        STORAGE_KEY,
      );
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        actions,
      }),
    );
  }, [actions, ready]);

  function addAction(
    action: Omit<
      CustomerAction,
      "id" | "createdAt" | "completedAt"
    >,
  ) {
    const id = createId();

    setActions((current) => [
      {
        ...action,
        id,
        createdAt:
          new Date().toISOString(),
        completedAt: "",
      },
      ...current,
    ]);

    return id;
  }

  function updateAction(
    id: string,
    updates: Partial<CustomerAction>,
  ) {
    setActions((current) =>
      current.map((action) =>
        action.id === id
          ? {
              ...action,
              ...updates,
            }
          : action,
      ),
    );
  }

  function completeAction(id: string) {
    updateAction(id, {
      status: "Completed",
      completedAt:
        new Date().toISOString(),
    });
  }

  function cancelAction(id: string) {
    updateAction(id, {
      status: "Cancelled",
      completedAt: "",
    });
  }

  function deleteAction(id: string) {
    setActions((current) =>
      current.filter(
        (action) => action.id !== id,
      ),
    );
  }

  const value = useMemo(
    () => ({
      actions,
      ready,
      addAction,
      updateAction,
      completeAction,
      cancelAction,
      deleteAction,
    }),
    [actions, ready],
  );

  return (
    <ActionStoreContext.Provider
      value={value}
    >
      {children}
    </ActionStoreContext.Provider>
  );
}

export function useActionStore() {
  const context = useContext(
    ActionStoreContext,
  );

  if (!context) {
    throw new Error(
      "useActionStore must be used inside ActionStoreProvider",
    );
  }

  return context;
}

function normaliseAction(
  value: unknown,
): CustomerAction | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const record = value as Partial<CustomerAction>;

  const status: ActionStatus =
    record.status === "Completed" ||
    record.status === "Cancelled"
      ? record.status
      : "Open";

  const priority: ActionPriority =
    record.priority === "High" ||
    record.priority === "Urgent"
      ? record.priority
      : "Normal";

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
    id:
      typeof record.id === "string"
        ? record.id
        : createId(),
    customerNumber:
      typeof record.customerNumber ===
      "string"
        ? record.customerNumber
        : "",
    customerName:
      typeof record.customerName ===
      "string"
        ? record.customerName
        : "",
    type: allowedTypes.includes(
      record.type as ActionType,
    )
      ? (record.type as ActionType)
      : "Other",
    priority,
    status,
    dueDate:
      typeof record.dueDate === "string"
        ? record.dueDate
        : "",
    note:
      typeof record.note === "string"
        ? record.note
        : "",
    createdAt:
      typeof record.createdAt === "string"
        ? record.createdAt
        : "",
    completedAt:
      typeof record.completedAt ===
      "string"
        ? record.completedAt
        : "",
  };
}

function createId() {
  return `action-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}
