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

export type TreatmentLibraryItem = {
  id: string;
  name: string;
  wording: string;
  active: boolean;
  builtIn: boolean;
  category:
    | "Annual programme"
    | "Specialist"
    | "Additional";
};

export type TreatmentWordingSettings = {
  /*
   * Named annual programme treatments.
   * These mirror the treatment names used throughout GreenFlow.
   */
  earlyWinterMossTreatment: string;
  springWeedAndFeed: string;
  summerWeedAndFeed: string;
  autumnWeedAndFeed: string;
  winterMossTreatment: string;

  /*
   * Generic/fallback wording retained for compatibility
   * with existing customer-document logic.
   */
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
  treatmentLibrary: TreatmentLibraryItem[];
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

  addTreatmentLibraryItem: () => string;

  updateTreatmentLibraryItem: (
    treatmentId: string,
    updates: Partial<
      Pick<
        TreatmentLibraryItem,
        "name" | "wording" | "active"
      >
    >,
  ) => void;

  deleteTreatmentLibraryItem: (
    treatmentId: string,
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

  reconcileInvoiceSequence: (
    issuedInvoiceNumbers: string[],
  ) => void;

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
    earlyWinterMossTreatment:
      "Your Early Winter Moss Treatment has been completed. This treatment helps suppress moss as cooler, damper conditions arrive and supports the lawn through the winter period. Moss may darken after treatment before gradually breaking down. Continue mowing when conditions allow, but avoid cutting the lawn too short during cold or wet weather.",

    springWeedAndFeed:
      "Your Spring Weed and Feed treatment has been completed. The feed supports fresh spring growth, improved colour and recovery after winter, while selective weed control helps reduce broad-leaved lawn weeds where required. Treated weeds usually respond gradually rather than disappearing immediately. Where weed control has been applied, avoid mowing for around 4–5 days.",

    summerWeedAndFeed:
      "Your Summer Weed and Feed treatment has been completed. This treatment helps maintain lawn colour, density and healthy growth during the main growing season while controlling broad-leaved weeds where required. During prolonged hot or dry weather, the lawn may respond more slowly until moisture returns. Watering can be beneficial once the treatment is fully dry if useful rainfall is not expected.",

    autumnWeedAndFeed:
      "Your Autumn Weed and Feed treatment has been completed. The seasonal feed helps strengthen the turf as growth begins to slow, while selective weed control may be used to reduce broad-leaved weeds before winter. Continue mowing while the grass is actively growing, gradually raising the cutting height as conditions become cooler.",

    winterMossTreatment:
      "Your Winter Moss Treatment has been completed. Winter conditions often favour moss because grass growth is slower and lawns remain wet for longer. This treatment helps suppress moss activity and prepares the lawn for stronger recovery when growth resumes. No additional watering is normally required during typical winter conditions.",

    seasonalFertiliserVisit:
      "A seasonal lawn treatment was completed to support healthy grass growth, colour and overall lawn condition.",

    herbicideVisit:
      "A selective lawn treatment was completed to help control broad-leaved weeds. Results will develop gradually as the treatment is absorbed.",

    combinedFertiliserAndHerbicideVisit:
      "A seasonal lawn treatment was completed to feed the grass and help control broad-leaved weeds. The lawn should gradually respond as growing and weather conditions allow.",

    mossControlVisit:
      "A seasonal moss-control treatment was completed to help reduce moss and improve the condition of the lawn.",

    aerationVisit:
      "Your lawn has been aerated to relieve soil compaction and improve the movement of air, water and nutrients into the root zone. The small holes created by aeration encourage healthier rooting and can improve drainage and the lawn's ability to cope with wear and dry conditions. Normal mowing can resume once the surface is suitable.",

    scarificationVisit:
      "Your lawn has been scarified to remove excess thatch, dead material and moss from around the base of the grass plants. The lawn can look untidy immediately afterwards, but opening the turf in this way creates better conditions for healthy recovery. Allow the grass to recover before mowing and keep the lawn adequately moist if conditions are dry.",

    overseedingVisit:
      "Your lawn has been overseeded to introduce fresh grass seed into thin, worn or damaged areas. Successful establishment will improve turf density and resilience. Keep the seeded surface consistently moist during germination and minimise foot traffic until the young grass is established. Delay mowing until the new grass is tall enough to cut safely.",

    cancelledVisit:
      "The scheduled lawn treatment was cancelled and no treatment was applied during this visit.",

    rescheduledVisit:
      "The planned lawn treatment could not be completed and will need to be rescheduled. Sharpes Lawn Care will arrange a suitable replacement date.",

    nextVisitPreparation:
      "Please keep the lawn accessible for the next scheduled visit. If you have a locked gate, leave it unlocked after receiving your reminder. Where possible, avoid mowing immediately before the visit and remove toys, furniture or other items from the lawn.",
  },

  treatmentLibrary: [
    {
      id: "treatment-early-winter-moss",
      name: "Early Winter Moss Treatment",
      wording:
        "Your Early Winter Moss Treatment has been completed. This treatment helps suppress moss as cooler, damper conditions arrive and supports the lawn through the winter period. Moss may darken after treatment before gradually breaking down. Continue mowing when conditions allow, but avoid cutting the lawn too short during cold or wet weather.",
      active: true,
      builtIn: true,
      category: "Annual programme",
    },
    {
      id: "treatment-spring-weed-feed",
      name: "Spring Weed and Feed",
      wording:
        "Your Spring Weed and Feed treatment has been completed. The feed supports fresh spring growth, improved colour and recovery after winter, while selective weed control helps reduce broad-leaved lawn weeds where required. Treated weeds usually respond gradually rather than disappearing immediately. Where weed control has been applied, avoid mowing for around 4–5 days.",
      active: true,
      builtIn: true,
      category: "Annual programme",
    },
    {
      id: "treatment-summer-weed-feed",
      name: "Summer Weed and Feed",
      wording:
        "Your Summer Weed and Feed treatment has been completed. This treatment helps maintain lawn colour, density and healthy growth during the main growing season while controlling broad-leaved weeds where required. During prolonged hot or dry weather, the lawn may respond more slowly until moisture returns. Watering can be beneficial once the treatment is fully dry if useful rainfall is not expected.",
      active: true,
      builtIn: true,
      category: "Annual programme",
    },
    {
      id: "treatment-autumn-weed-feed",
      name: "Autumn Weed and Feed",
      wording:
        "Your Autumn Weed and Feed treatment has been completed. The seasonal feed helps strengthen the turf as growth begins to slow, while selective weed control may be used to reduce broad-leaved weeds before winter. Continue mowing while the grass is actively growing, gradually raising the cutting height as conditions become cooler.",
      active: true,
      builtIn: true,
      category: "Annual programme",
    },
    {
      id: "treatment-winter-moss",
      name: "Winter Moss Treatment",
      wording:
        "Your Winter Moss Treatment has been completed. Winter conditions often favour moss because grass growth is slower and lawns remain wet for longer. This treatment helps suppress moss activity and prepares the lawn for stronger recovery when growth resumes. No additional watering is normally required during typical winter conditions.",
      active: true,
      builtIn: true,
      category: "Annual programme",
    },
    {
      id: "treatment-aeration",
      name: "Aeration",
      wording:
        "Your lawn has been aerated to relieve soil compaction and improve the movement of air, water and nutrients into the root zone. The small holes created by aeration encourage healthier rooting and can improve drainage and the lawn's ability to cope with wear and dry conditions. Normal mowing can resume once the surface is suitable.",
      active: true,
      builtIn: true,
      category: "Specialist",
    },
    {
      id: "treatment-scarification",
      name: "Scarification",
      wording:
        "Your lawn has been scarified to remove excess thatch, dead material and moss from around the base of the grass plants. The lawn can look untidy immediately afterwards, but opening the turf in this way creates better conditions for healthy recovery. Allow the grass to recover before mowing and keep the lawn adequately moist if conditions are dry.",
      active: true,
      builtIn: true,
      category: "Specialist",
    },
    {
      id: "treatment-overseeding",
      name: "Overseeding",
      wording:
        "Your lawn has been overseeded to introduce fresh grass seed into thin, worn or damaged areas. Successful establishment will improve turf density and resilience. Keep the seeded surface consistently moist during germination and minimise foot traffic until the young grass is established. Delay mowing until the new grass is tall enough to cut safely.",
      active: true,
      builtIn: true,
      category: "Specialist",
    },
  ],


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

  const invoiceSettingsRef =
    useRef<InvoiceSettings>({
      ...defaultSettings.invoices,
    });

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

        invoiceSettingsRef.current = {
          ...mergedSettings.invoices,
        };

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

    invoiceSettingsRef.current = {
      ...settings.invoices,
    };
  }, [settings.invoices]);

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

      const nextInvoiceSettings = {
        ...normalisedUpdates,
        nextInvoiceNumber,
      };

      invoiceSequenceRef.current =
        nextInvoiceNumber;

      invoiceSettingsRef.current = {
        ...nextInvoiceSettings,
      };

      return {
        ...current,
        invoices:
          nextInvoiceSettings,
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

  function addTreatmentLibraryItem() {
    const id =
      `treatment-custom-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    setSettings((current) => ({
      ...current,
      treatmentLibrary: [
        ...current.treatmentLibrary,
        {
          id,
          name: "New treatment",
          wording: "",
          active: true,
          builtIn: false,
          category: "Additional",
        },
      ],
    }));

    return id;
  }

  function updateTreatmentLibraryItem(
    treatmentId: string,
    updates: Partial<
      Pick<
        TreatmentLibraryItem,
        "name" | "wording" | "active"
      >
    >,
  ) {
    setSettings((current) => ({
      ...current,
      treatmentLibrary:
        current.treatmentLibrary.map(
          (treatment) =>
            treatment.id === treatmentId
              ? {
                  ...treatment,
                  ...updates,
                }
              : treatment,
        ),
    }));
  }

  function deleteTreatmentLibraryItem(
    treatmentId: string,
  ) {
    setSettings((current) => ({
      ...current,
      treatmentLibrary:
        current.treatmentLibrary.filter(
          (treatment) =>
            treatment.id !== treatmentId ||
            treatment.builtIn,
        ),
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
    } =
      invoiceSettingsRef.current;

    return formatInvoiceNumber(
      invoicePrefix,
      Math.max(
        nextInvoiceNumber,
        invoiceSequenceRef.current,
      ),
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

    const nextInvoiceSettings = {
      ...invoiceSettingsRef.current,
      nextInvoiceNumber:
        nextNumber,
    };

    invoiceSequenceRef.current =
      nextNumber;

    invoiceSettingsRef.current = {
      ...nextInvoiceSettings,
    };

    setSettings((current) => ({
      ...current,
      invoices: {
        ...current.invoices,
        ...nextInvoiceSettings,
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

    const currentInvoiceSettings =
      normaliseInvoiceSettings(
        invoiceSettingsRef.current,
      );

    const {
      invoicePrefix,
      invoiceNumberPadding,
    } =
      currentInvoiceSettings;

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

    const nextInvoiceSettings = {
      ...currentInvoiceSettings,
      nextInvoiceNumber:
        nextNumber,
    };

    /*
     * Reservations permanently consume sequence numbers.
     * If a later workflow step fails, GreenFlow keeps the
     * resulting gap rather than reusing an allocated number.
     */
    invoiceSequenceRef.current =
      nextNumber;

    invoiceSettingsRef.current = {
      ...nextInvoiceSettings,
    };

    setSettings((current) => ({
      ...current,
      invoices: {
        ...current.invoices,
        ...nextInvoiceSettings,
      },
    }));

    return invoiceNumbers;
  }

  function reconcileInvoiceSequence(
    issuedInvoiceNumbers: string[],
  ) {
    const currentInvoiceSettings =
      normaliseInvoiceSettings(
        invoiceSettingsRef.current,
      );

    const highestIssued =
      issuedInvoiceNumbers.reduce(
        (
          highest,
          invoiceNumber,
        ) => {
          const numericSequence =
            parseCompatibleInvoiceSequence(
              invoiceNumber,
              currentInvoiceSettings
                .invoicePrefix,
            );

          return numericSequence ===
            null
            ? highest
            : Math.max(
                highest,
                numericSequence,
              );
        },
        0,
      );

    if (highestIssued <= 0) {
      return;
    }

    const reconciledNextNumber =
      Math.max(
        invoiceSequenceRef.current,
        currentInvoiceSettings
          .nextInvoiceNumber,
        highestIssued + 1,
      );

    if (
      reconciledNextNumber <=
      invoiceSequenceRef.current
    ) {
      return;
    }

    const nextInvoiceSettings = {
      ...currentInvoiceSettings,
      nextInvoiceNumber:
        reconciledNextNumber,
    };

    invoiceSequenceRef.current =
      reconciledNextNumber;

    invoiceSettingsRef.current = {
      ...nextInvoiceSettings,
    };

    setSettings((current) => {
      if (
        current.invoices
          .nextInvoiceNumber >=
        reconciledNextNumber
      ) {
        return current;
      }

      return {
        ...current,
        invoices: {
          ...current.invoices,
          nextInvoiceNumber:
            reconciledNextNumber,
        },
      };
    });
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

      const nextInvoiceSettings = {
        ...defaultSettings.invoices,
        nextInvoiceNumber,
      };

      invoiceSequenceRef.current =
        nextInvoiceNumber;

      invoiceSettingsRef.current = {
        ...nextInvoiceSettings,
      };

      return {
        ...defaultSettings,
        invoices:
          nextInvoiceSettings,
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
        addTreatmentLibraryItem,
        updateTreatmentLibraryItem,
        deleteTreatmentLibraryItem,
        updateBrandingSettings,
        updateAdvisory,
        addAdvisory,
        deleteAdvisory,
        getNextInvoiceNumber,
        incrementInvoiceNumber,
        reserveInvoiceNumbers,
        reconcileInvoiceSequence,
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

    treatmentLibrary:
      Array.isArray(
        savedSettings.treatmentLibrary,
      )
        ? mergeTreatmentLibrary(
            savedSettings.treatmentLibrary,
          )
        : defaultSettings.treatmentLibrary.map(
            (treatment) => ({
              ...treatment,
            }),
          ),

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

function escapeRegExp(
  value: string,
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function parseCompatibleInvoiceSequence(
  invoiceNumber: string,
  prefix: string,
) {
  const cleanInvoiceNumber =
    invoiceNumber
      .trim()
      .toUpperCase();

  if (!cleanInvoiceNumber) {
    return null;
  }

  const cleanPrefix =
    prefix
      .trim()
      .toUpperCase();

  const pattern =
    cleanPrefix
      ? new RegExp(
          `^${escapeRegExp(
            cleanPrefix,
          )}-(\\d+)$`,
        )
      : /^\d+$/;

  const match =
    cleanInvoiceNumber.match(
      pattern,
    );

  if (!match) {
    return null;
  }

  const numericPart =
    cleanPrefix
      ? match[1]
      : match[0];

  const numericSequence =
    Number(numericPart);

  if (
    !Number.isSafeInteger(
      numericSequence,
    ) ||
    numericSequence <= 0
  ) {
    return null;
  }

  return numericSequence;
}

function mergeTreatmentLibrary(
  saved: unknown[],
): TreatmentLibraryItem[] {
  const builtIns =
    defaultSettings.treatmentLibrary
      .filter(
        (treatment) =>
          treatment.builtIn,
      )
      .map((treatment) => {
        const savedTreatment =
          saved.find(
            (item) =>
              Boolean(
                item &&
                  typeof item ===
                    "object" &&
                  "id" in item &&
                  item.id ===
                    treatment.id,
              ),
          ) as
          | Partial<TreatmentLibraryItem>
          | undefined;

        return {
          ...treatment,
          ...(savedTreatment ?? {}),
          id: treatment.id,
          builtIn: true,
          category:
            treatment.category,
        };
      });

  const custom =
    saved
      .filter(
        (
          item,
        ): item is Partial<TreatmentLibraryItem> =>
          Boolean(
            item &&
              typeof item === "object" &&
              "id" in item &&
              typeof item.id ===
                "string" &&
              !defaultSettings.treatmentLibrary.some(
                (defaultTreatment) =>
                  defaultTreatment.id ===
                  item.id,
              ),
          ),
      )
      .map((item) => ({
        id:
          item.id ??
          `treatment-custom-${Date.now()}`,
        name:
          typeof item.name === "string"
            ? item.name
            : "New treatment",
        wording:
          typeof item.wording ===
          "string"
            ? item.wording
            : "",
        active:
          item.active !== false,
        builtIn: false,
        category: "Additional" as const,
      }));

  return [
    ...builtIns,
    ...custom,
  ];
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