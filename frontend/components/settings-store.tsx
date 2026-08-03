"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AdvisoryType =
  | "danger"
  | "warning"
  | "information";

export type AdvisorySetting = {
  id: string;
  title: string;
  wording: string;
  type: AdvisoryType;
  active: boolean;
};

export type BusinessSettings = {
  applicationName: string;
  businessName: string;
  proprietorName: string;
  addressLine1: string;
  addressLine2: string;
  town: string;
  county: string;
  postcode: string;
  telephone: string;
  mobile: string;
  email: string;
  website: string;
  vatNumber: string;
  companyNumber: string;
};

export type InvoiceSettings = {
  invoicePrefix: string;
  nextInvoiceNumber: number;
  invoiceNumberPadding: number;
  paymentInstructions: string;
  vatWording: string;
  footerMessage: string;
  emailCopyMessage: string;
  showAmountIncludingVat: boolean;
};

export type TreatmentWordingSettings = {
  seasonalFertiliserVisit: string;
  herbicideVisit: string;
  combinedFertiliserAndHerbicideVisit: string;
  mossControlVisit: string;
  aerationVisit: string;
  scarificationVisit: string;
  overseedingVisit: string;
  cancelledVisit: string;
  rescheduledVisit: string;
  nextVisitPreparation: string;
};

export type BrandingSettings = {
  primaryColour: string;
  secondaryColour: string;
  warningColour: string;
  applicationSubtitle: string;
  showBusinessNameInSidebar: boolean;
};

export type GreenFlowSettings = {
  business: BusinessSettings;
  invoices: InvoiceSettings;
  treatmentWording: TreatmentWordingSettings;
  advisories: AdvisorySetting[];
  branding: BrandingSettings;
};

type SettingsStoreValue = {
  settings: GreenFlowSettings;
  ready: boolean;

  updateBusinessSettings: (
    updates: Partial<BusinessSettings>,
  ) => void;

  updateInvoiceSettings: (
    updates: Partial<InvoiceSettings>,
  ) => void;

  updateTreatmentWording: (
    updates: Partial<TreatmentWordingSettings>,
  ) => void;

  updateBrandingSettings: (
    updates: Partial<BrandingSettings>,
  ) => void;

  updateAdvisory: (
    advisoryId: string,
    updates: Partial<AdvisorySetting>,
  ) => void;

  addAdvisory: () => void;

  deleteAdvisory: (
    advisoryId: string,
  ) => void;

  getNextInvoiceNumber: () => string;

  incrementInvoiceNumber: () => void;

  reserveInvoiceNumbers: (
    quantity: number,
  ) => string[];

  restoreDefaultSettings: () => void;
};

const STORAGE_KEY =
  "greenflow-business-settings-v1";

export const defaultSettings: GreenFlowSettings = {
  business: {
    applicationName: "GreenFlow",
    businessName: "Sharpes Lawn Care",
    proprietorName: "Rob Sharpe",
    addressLine1: "",
    addressLine2: "",
    town: "",
    county: "",
    postcode: "",
    telephone: "",
    mobile: "",
    email: "",
    website: "www.sharpeslawncare.co.uk",
    vatNumber: "",
    companyNumber: "",
  },

  invoices: {
    invoicePrefix: "INV",
    nextInvoiceNumber: 1001,
    invoiceNumberPadding: 5,

    paymentInstructions:
      "Please pay using your usual agreed payment method. Please use your customer number or invoice number as the payment reference.",

    vatWording:
      "The amount shown includes VAT where applicable.",

    footerMessage:
      "Thank you for choosing Sharpes Lawn Care. Please retain this invoice and treatment report with your lawn-care records.",

    emailCopyMessage:
      "Please find attached your invoice and lawn treatment information following today’s visit.",

    showAmountIncludingVat: true,
  },

  treatmentWording: {
    seasonalFertiliserVisit:
      "A seasonal lawn treatment was completed to support healthy grass growth, colour and overall lawn condition.",

    herbicideVisit:
      "A selective lawn treatment was completed to help control broad-leaved weeds. Results will develop gradually as the treatment is absorbed.",

    combinedFertiliserAndHerbicideVisit:
      "A seasonal lawn treatment was completed to feed the grass and help control broad-leaved weeds. The lawn should gradually respond as growing and weather conditions allow.",

    mossControlVisit:
      "A seasonal moss-control treatment was completed to help reduce moss and improve the condition of the lawn.",

    aerationVisit:
      "The lawn was aerated to relieve soil compaction and improve the movement of air, water and nutrients into the root zone.",

    scarificationVisit:
      "The lawn was scarified to remove excess thatch, moss and organic material from the surface of the lawn.",

    overseedingVisit:
      "The lawn was overseeded to introduce new grass plants and help improve density, appearance and recovery.",

    cancelledVisit:
      "The scheduled lawn treatment was cancelled and no treatment was applied during this visit.",

    rescheduledVisit:
      "The planned lawn treatment could not be completed and will need to be rescheduled. Sharpes Lawn Care will arrange a suitable replacement date.",

    nextVisitPreparation:
      "Please keep the lawn accessible for the next scheduled visit. If you have a locked gate, leave it unlocked after receiving your reminder. Where possible, avoid mowing immediately before the visit and remove toys, furniture or other items from the lawn.",
  },

  advisories: [
    {
      id: "keep-off-lawn",
      title: "Keep off the lawn",
      wording:
        "Keep children and pets away from the treated lawn until the application is completely dry.",
      type: "danger",
      active: true,
    },

    {
      id: "delay-mowing",
      title: "Delay mowing",
      wording:
        "Avoid mowing immediately after treatment so the application has time to work effectively.",
      type: "warning",
      active: true,
    },

    {
      id: "water-if-required",
      title: "Water if required",
      wording:
        "Watering may be beneficial when suitable rainfall is not expected. Follow the advice provided for this visit.",
      type: "information",
      active: true,
    },
  ],

  branding: {
    primaryColour: "#176b37",
    secondaryColour: "#338b45",
    warningColour: "#dc2626",
    applicationSubtitle:
      "Professional lawn care operations",
    showBusinessNameInSidebar: true,
  },
};

const SettingsStoreContext =
  createContext<SettingsStoreValue | null>(
    null,
  );

export function SettingsStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [settings, setSettings] =
    useState<GreenFlowSettings>(
      defaultSettings,
    );

  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    const savedSettings =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (savedSettings) {
      try {
        const parsedSettings =
          JSON.parse(
            savedSettings,
          ) as Partial<GreenFlowSettings>;

        setSettings(
          mergeSettingsWithDefaults(
            parsedSettings,
          ),
        );
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
      JSON.stringify(settings),
    );
  }, [settings, ready]);

  function updateBusinessSettings(
    updates: Partial<BusinessSettings>,
  ) {
    setSettings((current) => ({
      ...current,

      business: {
        ...current.business,
        ...updates,
      },
    }));
  }

  function updateInvoiceSettings(
    updates: Partial<InvoiceSettings>,
  ) {
    setSettings((current) => ({
      ...current,

      invoices: {
        ...current.invoices,
        ...updates,
      },
    }));
  }

  function updateTreatmentWording(
    updates: Partial<TreatmentWordingSettings>,
  ) {
    setSettings((current) => ({
      ...current,

      treatmentWording: {
        ...current.treatmentWording,
        ...updates,
      },
    }));
  }

  function updateBrandingSettings(
    updates: Partial<BrandingSettings>,
  ) {
    setSettings((current) => ({
      ...current,

      branding: {
        ...current.branding,
        ...updates,
      },
    }));
  }

  function updateAdvisory(
    advisoryId: string,
    updates: Partial<AdvisorySetting>,
  ) {
    setSettings((current) => ({
      ...current,

      advisories:
        current.advisories.map(
          (advisory) =>
            advisory.id === advisoryId
              ? {
                  ...advisory,
                  ...updates,
                }
              : advisory,
        ),
    }));
  }

  function addAdvisory() {
    const advisoryNumber =
      settings.advisories.length + 1;

    const newAdvisory: AdvisorySetting = {
      id: `advisory-${Date.now()}`,
      title: `Advisory ${advisoryNumber}`,
      wording:
        "Enter the customer-facing advisory wording.",
      type: "information",
      active: true,
    };

    setSettings((current) => ({
      ...current,

      advisories: [
        ...current.advisories,
        newAdvisory,
      ],
    }));
  }

  function deleteAdvisory(
    advisoryId: string,
  ) {
    setSettings((current) => ({
      ...current,

      advisories:
        current.advisories.filter(
          (advisory) =>
            advisory.id !== advisoryId,
        ),
    }));
  }

  function getNextInvoiceNumber() {
    const {
      invoicePrefix,
      nextInvoiceNumber,
      invoiceNumberPadding,
    } = settings.invoices;

    return formatInvoiceNumber(
      invoicePrefix,
      nextInvoiceNumber,
      invoiceNumberPadding,
    );
  }

  function incrementInvoiceNumber() {
    setSettings((current) => ({
      ...current,

      invoices: {
        ...current.invoices,

        nextInvoiceNumber:
          current.invoices
            .nextInvoiceNumber + 1,
      },
    }));
  }

  function reserveInvoiceNumbers(
    quantity: number,
  ) {
    const safeQuantity = Math.max(
      0,
      Math.floor(quantity),
    );

    if (safeQuantity === 0) {
      return [];
    }

    const {
      invoicePrefix,
      nextInvoiceNumber,
      invoiceNumberPadding,
    } = settings.invoices;

    const invoiceNumbers =
      Array.from(
        {
          length: safeQuantity,
        },
        (_, index) =>
          formatInvoiceNumber(
            invoicePrefix,
            nextInvoiceNumber + index,
            invoiceNumberPadding,
          ),
      );

    setSettings((current) => ({
      ...current,

      invoices: {
        ...current.invoices,

        nextInvoiceNumber:
          current.invoices
            .nextInvoiceNumber +
          safeQuantity,
      },
    }));

    return invoiceNumbers;
  }

  function restoreDefaultSettings() {
    setSettings(defaultSettings);

    window.localStorage.removeItem(
      STORAGE_KEY,
    );
  }

  const value =
    useMemo<SettingsStoreValue>(
      () => ({
        settings,
        ready,
        updateBusinessSettings,
        updateInvoiceSettings,
        updateTreatmentWording,
        updateBrandingSettings,
        updateAdvisory,
        addAdvisory,
        deleteAdvisory,
        getNextInvoiceNumber,
        incrementInvoiceNumber,
        reserveInvoiceNumbers,
        restoreDefaultSettings,
      }),
      [settings, ready],
    );

  return (
    <SettingsStoreContext.Provider
      value={value}
    >
      {children}
    </SettingsStoreContext.Provider>
  );
}

export function useSettingsStore() {
  const context = useContext(
    SettingsStoreContext,
  );

  if (!context) {
    throw new Error(
      "useSettingsStore must be used inside SettingsStoreProvider.",
    );
  }

  return context;
}

function mergeSettingsWithDefaults(
  savedSettings: Partial<GreenFlowSettings>,
): GreenFlowSettings {
  return {
    business: {
      ...defaultSettings.business,
      ...savedSettings.business,
    },

    invoices: {
      ...defaultSettings.invoices,
      ...savedSettings.invoices,
    },

    treatmentWording: {
      ...defaultSettings.treatmentWording,
      ...savedSettings.treatmentWording,
    },

    advisories:
      Array.isArray(
        savedSettings.advisories,
      ) &&
      savedSettings.advisories.length > 0
        ? savedSettings.advisories.map(
            (advisory, index) => ({
              id:
                advisory.id ??
                `advisory-${index + 1}`,

              title:
                advisory.title ??
                "Advisory",

              wording:
                advisory.wording ?? "",

              type:
                advisory.type ??
                "information",

              active:
                advisory.active ?? true,
            }),
          )
        : defaultSettings.advisories.map(
            (advisory) => ({
              ...advisory,
            }),
          ),

    branding: {
      ...defaultSettings.branding,
      ...savedSettings.branding,
    },
  };
}

function formatInvoiceNumber(
  prefix: string,
  number: number,
  padding: number,
) {
  const safePadding = Math.max(
    1,
    Math.floor(padding),
  );

  const paddedNumber = String(
    number,
  ).padStart(
    safePadding,
    "0",
  );

  const cleanedPrefix =
    prefix.trim();

  return cleanedPrefix
    ? `${cleanedPrefix}-${paddedNumber}`
    : paddedNumber;
}