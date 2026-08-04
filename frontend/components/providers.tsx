"use client";

import type { ReactNode } from "react";

import { ChemicalStoreProvider } from "@/components/chemical-store";
import { CustomerStoreProvider } from "@/components/customer-store";
import { EnquiryStoreProvider } from "@/components/enquiry-store";
import { ProgrammeStoreProvider } from "@/components/programme-store";
import { SeasonStoreProvider } from "@/components/season-store";
import { SettingsStoreProvider } from "@/components/settings-store";
import { TreatmentStoreProvider } from "@/components/treatment-store";

export function Providers({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SettingsStoreProvider>
      <CustomerStoreProvider>
        <EnquiryStoreProvider>
          <SeasonStoreProvider>
            <ProgrammeStoreProvider>
              <ChemicalStoreProvider>
                <TreatmentStoreProvider>
                  {children}
                </TreatmentStoreProvider>
              </ChemicalStoreProvider>
            </ProgrammeStoreProvider>
          </SeasonStoreProvider>
        </EnquiryStoreProvider>
      </CustomerStoreProvider>
    </SettingsStoreProvider>
  );
}