"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ProgrammeVisitStatus =
  | "Planned"
  | "Scheduled"
  | "Completed"
  | "Skipped";

export type ProgrammeVisit = {
  id: string;
  visitNumber: number;
  treatmentName: string;
  scheduledDate: string;
  gapAfterPreviousDays: number;
  status: ProgrammeVisitStatus;
  notes: string;
};

export type CustomerProgramme = {
  id: string;
  customerNumber: string;
  year: number;
  createdAt: string;
  programmeName: string;
  startDate: string;
  avoidWednesdays: boolean;
  avoidWeekends: boolean;
  visits: ProgrammeVisit[];
};

type ProgrammeStoreValue = {
  programmes: CustomerProgramme[];
  ready: boolean;
  saveProgramme: (
    programme: CustomerProgramme,
  ) => void;
  deleteProgramme: (
    programmeId: string,
  ) => void;
  getProgrammeForCustomer: (
    customerNumber: string,
    year: number,
  ) => CustomerProgramme | undefined;
  getProgrammesForCustomer: (
    customerNumber: string,
  ) => CustomerProgramme[];
};

const ProgrammeStoreContext =
  createContext<ProgrammeStoreValue | null>(
    null,
  );

const STORAGE_KEY =
  "greenflow-customer-programmes-v1";

export function ProgrammeStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [programmes, setProgrammes] =
    useState<CustomerProgramme[]>([]);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (saved) {
      try {
        const parsed = JSON.parse(
          saved,
        ) as CustomerProgramme[];

        if (Array.isArray(parsed)) {
          setProgrammes(parsed);
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
      JSON.stringify(programmes),
    );
  }, [programmes, ready]);

  function saveProgramme(
    programme: CustomerProgramme,
  ) {
    setProgrammes((current) => {
      const existingIndex =
        current.findIndex(
          (item) =>
            item.customerNumber ===
              programme.customerNumber &&
            item.year === programme.year,
        );

      if (existingIndex === -1) {
        return [programme, ...current];
      }

      return current.map((item, index) =>
        index === existingIndex
          ? programme
          : item,
      );
    });
  }

  function deleteProgramme(
    programmeId: string,
  ) {
    setProgrammes((current) =>
      current.filter(
        (programme) =>
          programme.id !== programmeId,
      ),
    );
  }

  function getProgrammeForCustomer(
    customerNumber: string,
    year: number,
  ) {
    return programmes.find(
      (programme) =>
        programme.customerNumber ===
          customerNumber &&
        programme.year === year,
    );
  }

  function getProgrammesForCustomer(
    customerNumber: string,
  ) {
    return programmes
      .filter(
        (programme) =>
          programme.customerNumber ===
          customerNumber,
      )
      .sort(
        (first, second) =>
          second.year - first.year,
      );
  }

  const value =
    useMemo<ProgrammeStoreValue>(
      () => ({
        programmes,
        ready,
        saveProgramme,
        deleteProgramme,
        getProgrammeForCustomer,
        getProgrammesForCustomer,
      }),
      [programmes, ready],
    );

  return (
    <ProgrammeStoreContext.Provider
      value={value}
    >
      {children}
    </ProgrammeStoreContext.Provider>
  );
}

export function useProgrammeStore() {
  const context = useContext(
    ProgrammeStoreContext,
  );

  if (!context) {
    throw new Error(
      "useProgrammeStore must be used inside ProgrammeStoreProvider.",
    );
  }

  return context;
}