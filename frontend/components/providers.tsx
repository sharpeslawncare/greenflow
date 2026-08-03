"use client";

import type { ReactNode } from "react";

import { CustomerStoreProvider } from "@/components/customer-store";
import { EnquiryStoreProvider } from "@/components/enquiry-store";
import { ProgrammeStoreProvider } from "@/components/programme-store";
import { SettingsStoreProvider } from "@/components/settings-store";
import { TreatmentStoreProvider } from "@/components/treatment-store";
import { ChemicalStoreProvider } from "@/components/chemical-store";

export function Providers({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SettingsStoreProvider>
  <ChemicalStoreProvider>
    <CustomerStoreProvider>
      <EnquiryStoreProvider>
        <ProgrammeStoreProvider>
          <TreatmentStoreProvider>
            {children}
          </TreatmentStoreProvider>
        </ProgrammeStoreProvider>
      </EnquiryStoreProvider>
    </CustomerStoreProvider>
  </ChemicalStoreProvider>
</SettingsStoreProvider>
  );
}