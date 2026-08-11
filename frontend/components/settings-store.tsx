"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

  const invoiceSequenceRef =
    useRef(
      defaultSettings.invoices
        .nextInvoiceNumber,
    );

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

        const mergedSettings =
          mergeSettingsWithDefaults(
            parsedSettings,
          );

        invoiceSequenceRef.current =
          mergedSettings.invoices
            .nextInvoiceNumber;

        setSettings(
          mergedSettings,
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
    invoiceSequenceRef.current =
      settings.invoices
        .nextInvoiceNumber;
  }, [
    settings.invoices
      .nextInvoiceNumber,
  ]);

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
    setSettings((current) => {
      const normalisedUpdates =
        normaliseInvoiceSettings({
          ...current.invoices,
          ...updates,
        });

      const nextInvoiceNumber =
        Math.max(
          current.invoices
            .nextInvoiceNumber,
          normalisedUpdates
            .nextInvoiceNumber,
          invoiceSequenceRef.current,
        );

      invoiceSequenceRef.current =
        nextInvoiceNumber;

      return {
        ...current,

        invoices: {
          ...normalisedUpdates,
          nextInvoiceNumber,
        },
      };
    });
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
              ? normaliseAdvisory({
                  ...advisory,
                  ...updates,
                })
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
    const nextNumber =
      Math.max(
        1,
        Math.floor(
          invoiceSequenceRef.current,
        ),
      ) + 1;

    invoiceSequenceRef.current =
      nextNumber;

    setSettings((current) => ({
      ...current,

      invoices: {
        ...current.invoices,

        nextInvoiceNumber:
          nextNumber,
      },
    }));
  }

  function reserveInvoiceNumbers(
    quantity: number,
  ) {
    const safeQuantity =
      safePositiveIntegerOrZero(
        quantity,
      );

    if (safeQuantity === 0) {
      return [];
    }

    const {
      invoicePrefix,
      invoiceNumberPadding,
    } =
      normaliseInvoiceSettings(
        settings.invoices,
      );

    const startNumber =
      Math.max(
        1,
        Math.floor(
          invoiceSequenceRef.current,
        ),
      );

    const invoiceNumbers =
      Array.from(
        {
          length: safeQuantity,
        },
        (_, index) =>
          formatInvoiceNumber(
            invoicePrefix,
            startNumber + index,
            invoiceNumberPadding,
          ),
      );

    const nextNumber =
      startNumber +
      safeQuantity;

    invoiceSequenceRef.current =
      nextNumber;

    setSettings((current) => ({
      ...current,

      invoices: {
        ...current.invoices,
        nextInvoiceNumber:
          nextNumber,
      },
    }));

    return invoiceNumbers;
  }

  function restoreDefaultSettings() {
    setSettings((current) => {
      const nextInvoiceNumber =
        Math.max(
          current.invoices
            .nextInvoiceNumber,
          invoiceSequenceRef.current,
          1,
        );

      invoiceSequenceRef.current =
        nextInvoiceNumber;

      return {
        ...defaultSettings,
        invoices: {
          ...defaultSettings.invoices,
          nextInvoiceNumber,
        },
      };
    });
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
    business:
      normaliseBusinessSettings({
        ...defaultSettings.business,
        ...savedSettings.business,
      }),

    invoices:
      normaliseInvoiceSettings({
        ...defaultSettings.invoices,
        ...savedSettings.invoices,
      }),

    treatmentWording: {
      ...defaultSettings.treatmentWording,
      ...savedSettings.treatmentWording,
    },

    advisories:
      normaliseAdvisories(
        Array.isArray(
          savedSettings.advisories,
        ) &&
        savedSettings.advisories.length > 0
          ? savedSettings.advisories
          : defaultSettings.advisories,
      ),

    branding: {
      ...defaultSettings.branding,
      ...savedSettings.branding,
    },
  };
}

function normaliseBusinessSettings(
  settings: BusinessSettings,
): BusinessSettings {
  return {
    ...settings,
    applicationName:
      settings.applicationName.trim(),
    businessName:
      settings.businessName.trim(),
    proprietorName:
      settings.proprietorName.trim(),
    addressLine1:
      settings.addressLine1.trim(),
    addressLine2:
      settings.addressLine2.trim(),
    town:
      settings.town.trim(),
    county:
      settings.county.trim(),
    postcode:
      settings.postcode
        .trim()
        .toUpperCase(),
    telephone:
      settings.telephone.trim(),
    mobile:
      settings.mobile.trim(),
    email:
      settings.email.trim(),
    website:
      settings.website.trim(),
    vatNumber:
      settings.vatNumber.trim(),
    companyNumber:
      settings.companyNumber.trim(),
  };
}

function normaliseInvoiceSettings(
  settings: InvoiceSettings,
): InvoiceSettings {
  return {
    ...settings,
    invoicePrefix:
      settings.invoicePrefix
        .trim()
        .toUpperCase(),
    nextInvoiceNumber:
      safePositiveInteger(
        settings.nextInvoiceNumber,
        defaultSettings.invoices
          .nextInvoiceNumber,
      ),
    invoiceNumberPadding:
      Math.min(
        12,
        safePositiveInteger(
          settings.invoiceNumberPadding,
          defaultSettings.invoices
            .invoiceNumberPadding,
        ),
      ),
    paymentInstructions:
      settings.paymentInstructions.trim(),
    vatWording:
      settings.vatWording.trim(),
    footerMessage:
      settings.footerMessage.trim(),
    emailCopyMessage:
      settings.emailCopyMessage.trim(),
    showAmountIncludingVat:
      settings.showAmountIncludingVat !==
      false,
  };
}

function normaliseAdvisoryType(
  value:
    | AdvisoryType
    | string
    | undefined,
): AdvisoryType {
  if (
    value === "danger" ||
    value === "warning" ||
    value === "information"
  ) {
    return value;
  }

  return "information";
}

function normaliseAdvisory(
  advisory: Partial<AdvisorySetting>,
  fallbackId?: string,
): AdvisorySetting {
  return {
    id:
      advisory.id?.trim() ||
      fallbackId ||
      `advisory-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    title:
      advisory.title?.trim() ||
      "Advisory",
    wording:
      advisory.wording?.trim() ?? "",
    type:
      normaliseAdvisoryType(
        advisory.type,
      ),
    active:
      advisory.active !== false,
  };
}

function normaliseAdvisories(
  advisories:
    Array<Partial<AdvisorySetting>>,
) {
  const usedIds =
    new Set<string>();

  return advisories.map(
    (advisory, index) => {
      const normalised =
        normaliseAdvisory(
          advisory,
          `advisory-${index + 1}`,
        );

      let id =
        normalised.id;

      if (
        usedIds.has(id)
      ) {
        let suffix = 2;
        let candidate =
          `${id}-${suffix}`;

        while (
          usedIds.has(candidate)
        ) {
          suffix += 1;
          candidate =
            `${id}-${suffix}`;
        }

        id = candidate;
      }

      usedIds.add(id);

      return {
        ...normalised,
        id,
      };
    },
  );
}

function safePositiveInteger(
  value: number | undefined,
  fallback: number,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    1,
    Math.floor(value),
  );
}

function safePositiveIntegerOrZero(
  value: number,
) {
  if (
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(value),
  );
}

function formatInvoiceNumber(
  prefix: string,
  number: number,
  padding: number,
) {
  const safePadding =
    Math.min(
      12,
      safePositiveInteger(
        padding,
        1,
      ),
    );

  const safeNumber =
    safePositiveInteger(
      number,
      1,
    );

  const paddedNumber = String(
    safeNumber,
  ).padStart(
    safePadding,
    "0",
  );

  const cleanedPrefix =
    prefix
      .trim()
      .toUpperCase();

  return cleanedPrefix
    ? `${cleanedPrefix}-${paddedNumber}`
    : paddedNumber;
}