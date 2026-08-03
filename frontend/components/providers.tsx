"use client";

import type { ReactNode } from "react";

import { CustomerStoreProvider } from "@/components/customer-store";
import { TreatmentStoreProvider } from "@/components/treatment-store";

export function Providers({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <CustomerStoreProvider>
      <TreatmentStoreProvider>
        {children}
      </TreatmentStoreProvider>
    </CustomerStoreProvider>
  );
}