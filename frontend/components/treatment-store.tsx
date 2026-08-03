"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type TreatmentStatus =
  | "Completed"
  | "Needs Rescheduling"
  | "Cancelled";

export type TreatmentRecord = {
  id: string;

  invoiceNumber: string;

  customerNumber: string;

  scheduledDate: string;
  recordedDate: string;
  completedDate: string;

  status: TreatmentStatus;
  treatmentName: string;

  fertiliser: string;
  herbicide: string;
  otherMaterials: string;

  notes: string;
  nextVisitDate: string;
};

type TreatmentStoreValue = {
  treatments: TreatmentRecord[];

  ready: boolean;

  addTreatments: (
    newTreatments: TreatmentRecord[],
  ) => void;

  updateTreatment: (
    updatedTreatment: TreatmentRecord,
  ) => void;

  assignInvoiceNumber: (
    treatmentId: string,
    invoiceNumber: string,
  ) => void;

  getTreatmentById: (
    treatmentId: string,
  ) => TreatmentRecord | undefined;

  getTreatmentsForCustomer: (
    customerNumber: string,
  ) => TreatmentRecord[];

  clearTreatmentHistory: () => void;
};

const STORAGE_KEY =
  "greenflow-treatment-history-v1";

const TreatmentStoreContext =
  createContext<TreatmentStoreValue | null>(
    null,
  );

export function TreatmentStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [treatments, setTreatments] =
    useState<TreatmentRecord[]>([]);

  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    const savedTreatments =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (savedTreatments) {
      try {
        const parsedTreatments =
          JSON.parse(
            savedTreatments,
          ) as Array<
            Partial<TreatmentRecord>
          >;

        if (
          Array.isArray(
            parsedTreatments,
          )
        ) {
          setTreatments(
            parsedTreatments.map(
              normaliseTreatmentRecord,
            ),
          );
        }
      } catch {
        window.localStorage.removeItem(
          STORAGE_KEY,
        );
      }
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(treatments),
    );
  }, [treatments, ready]);

  function addTreatments(
    newTreatments: TreatmentRecord[],
  ) {
    const normalisedTreatments =
      newTreatments.map(
        normaliseTreatmentRecord,
      );

    setTreatments((current) => [
      ...normalisedTreatments,
      ...current,
    ]);
  }

  function updateTreatment(
    updatedTreatment: TreatmentRecord,
  ) {
    setTreatments((current) =>
      current.map((treatment) =>
        treatment.id ===
        updatedTreatment.id
          ? normaliseTreatmentRecord(
              updatedTreatment,
            )
          : treatment,
      ),
    );
  }

  function assignInvoiceNumber(
    treatmentId: string,
    invoiceNumber: string,
  ) {
    setTreatments((current) =>
      current.map((treatment) =>
        treatment.id === treatmentId
          ? {
              ...treatment,
              invoiceNumber:
                invoiceNumber.trim(),
            }
          : treatment,
      ),
    );
  }

  function getTreatmentById(
    treatmentId: string,
  ) {
    return treatments.find(
      (treatment) =>
        treatment.id === treatmentId,
    );
  }

  function getTreatmentsForCustomer(
    customerNumber: string,
  ) {
    return treatments
      .filter(
        (treatment) =>
          treatment.customerNumber ===
          customerNumber,
      )
      .sort(
        (first, second) =>
          new Date(
            second.recordedDate,
          ).getTime() -
          new Date(
            first.recordedDate,
          ).getTime(),
      );
  }

  function clearTreatmentHistory() {
    setTreatments([]);

    window.localStorage.removeItem(
      STORAGE_KEY,
    );
  }

  const value =
    useMemo<TreatmentStoreValue>(
      () => ({
        treatments,
        ready,
        addTreatments,
        updateTreatment,
        assignInvoiceNumber,
        getTreatmentById,
        getTreatmentsForCustomer,
        clearTreatmentHistory,
      }),
      [treatments, ready],
    );

  return (
    <TreatmentStoreContext.Provider
      value={value}
    >
      {children}
    </TreatmentStoreContext.Provider>
  );
}

export function useTreatmentStore() {
  const context = useContext(
    TreatmentStoreContext,
  );

  if (!context) {
    throw new Error(
      "useTreatmentStore must be used inside TreatmentStoreProvider.",
    );
  }

  return context;
}

function normaliseTreatmentRecord(
  treatment: Partial<TreatmentRecord>,
): TreatmentRecord {
  return {
    id:
      treatment.id ??
      `treatment-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,

    invoiceNumber:
      treatment.invoiceNumber ?? "",

    customerNumber:
      treatment.customerNumber ?? "",

    scheduledDate:
      treatment.scheduledDate ?? "",

    recordedDate:
      treatment.recordedDate ??
      new Date().toISOString(),

    completedDate:
      treatment.completedDate ?? "",

    status:
      treatment.status ??
      "Completed",

    treatmentName:
      treatment.treatmentName ??
      "Seasonal lawn treatment",

    fertiliser:
      treatment.fertiliser ?? "None",

    herbicide:
      treatment.herbicide ?? "None",

    otherMaterials:
      treatment.otherMaterials ?? "",

    notes:
      treatment.notes ?? "",

    nextVisitDate:
      treatment.nextVisitDate ??
      "Not yet scheduled",
  };
}