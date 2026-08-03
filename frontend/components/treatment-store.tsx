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
  getTreatmentsForCustomer: (
    customerNumber: string,
  ) => TreatmentRecord[];
  clearTreatmentHistory: () => void;
};

const TreatmentStoreContext =
  createContext<TreatmentStoreValue | null>(null);

const STORAGE_KEY =
  "greenflow-treatment-history-v1";

export function TreatmentStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [treatments, setTreatments] = useState<
    TreatmentRecord[]
  >([]);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved =
      window.localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(
          saved,
        ) as TreatmentRecord[];

        if (Array.isArray(parsed)) {
          setTreatments(parsed);
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
    setTreatments((current) => [
      ...newTreatments,
      ...current,
    ]);
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

  const value = useMemo<TreatmentStoreValue>(
    () => ({
      treatments,
      ready,
      addTreatments,
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