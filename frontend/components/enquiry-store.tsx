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

export type EnquirySource =
  | "Recommendation"
  | "Website"
  | "Telephone"
  | "Email"
  | "Social Media"
  | "Other";

export type EnquiryStatus =
  | "New Enquiry"
  | "Visit Arranged"
  | "Quote Prepared"
  | "Quote Accepted"
  | "Quote Declined"
  | "Converted to Customer"
  | "Closed";

export type QuoteStatus =
  | "Not Prepared"
  | "Draft"
  | "Presented"
  | "Accepted"
  | "Declined";

export type EnquiryRecord = {
  id: string;
  enquiryNumber: string;

  createdAt: string;
  updatedAt: string;

  status: EnquiryStatus;
  source: EnquirySource;
  referredBy: string;

  firstName: string;
  surname: string;
  fullName: string;

  address: string;
  postcode: string;

  emailAddress: string;
  homePhone: string;
  mobilePhone: string;

  initialMessage: string;
  internalNotes: string;

  siteVisitDate: string;
  siteVisitTime: string;

  lawnMeasured: boolean;
  lawnSizeSquareMetres: number;

  minimumPriceApplied: boolean;
  pricePerSquareMetre: number;
  calculatedTreatmentPrice: number;
  quotedTreatmentPrice: number;

  quoteStatus: QuoteStatus;
  quoteDate: string;
  quoteExpiryDate: string;
  quoteNotes: string;

  treatmentStartedImmediately: boolean;

  suggestedGroupNumber: number;
  suggestedVanNumber: number;

  extraWorkRequired: boolean;
  extraWorkDescription: string;
  preferredExtraWorkSeason: string;

  convertedCustomerNumber: string;
  convertedAt: string;
};

type NewEnquiryInput = {
  source?: EnquirySource;
  firstName?: string;
  surname?: string;
  address?: string;
  postcode?: string;
  emailAddress?: string;
  homePhone?: string;
  mobilePhone?: string;
  initialMessage?: string;
};

export type EnquiryMutationResult = {
  success: boolean;
  message: string;
};

type EnquiryStoreValue = {
  enquiries: EnquiryRecord[];
  ready: boolean;

  addEnquiry: (
    input?: NewEnquiryInput,
  ) => EnquiryRecord;

  updateEnquiry: (
    updatedEnquiry: EnquiryRecord,
  ) => EnquiryMutationResult;

  deleteEnquiry: (
    enquiryId: string,
  ) => void;

  getEnquiryById: (
    enquiryId: string,
  ) => EnquiryRecord | undefined;

  calculateQuote: (
    lawnSizeSquareMetres: number,
    pricePerSquareMetre: number,
    minimumPrice: number,
  ) => {
    calculatedPrice: number;
    finalPrice: number;
    minimumPriceApplied: boolean;
  };

  markConverted: (
    enquiryId: string,
    customerNumber: string,
  ) => EnquiryMutationResult;

  restoreDemoEnquiries: () => void;
  clearEnquiries: () => void;
};

const EnquiryStoreContext =
  createContext<EnquiryStoreValue | null>(
    null,
  );

const defaultDemoEnquiries: EnquiryRecord[] = [];

export function EnquiryStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [enquiries, setEnquiries] =
    useState<EnquiryRecord[]>([]);

  const enquiriesRef =
    useRef<EnquiryRecord[]>([]);

  const [ready, setReady] =
    useState(false);

  async function reloadEnquiries() {
    try {
      const response = await fetch(
        "/api/enquiries",
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load enquiries (${response.status}).`,
        );
      }

      const body = (await response.json()) as {
        enquiries?: Array<Partial<EnquiryRecord>>;
      };

      const loadedEnquiries =
        deduplicateEnquiries(
          Array.isArray(body.enquiries)
            ? body.enquiries.map(
                normaliseEnquiryRecord,
              )
            : [],
        );

      enquiriesRef.current =
        loadedEnquiries;

      setEnquiries(loadedEnquiries);
    } catch (error) {
      console.error(
        "Failed to load GreenFlow enquiries from PostgreSQL:",
        error,
      );
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const response = await fetch(
          "/api/enquiries",
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(
            `Unable to load enquiries (${response.status}).`,
          );
        }

        const body =
          (await response.json()) as {
            enquiries?: Array<
              Partial<EnquiryRecord>
            >;
          };

        if (cancelled) return;

        const loadedEnquiries =
          deduplicateEnquiries(
            Array.isArray(body.enquiries)
              ? body.enquiries.map(
                  normaliseEnquiryRecord,
                )
              : [],
          );

        enquiriesRef.current =
          loadedEnquiries;

        setEnquiries(loadedEnquiries);
      } catch (error) {
        console.error(
          "Failed to hydrate GreenFlow enquiries from PostgreSQL:",
          error,
        );
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    enquiriesRef.current =
      enquiries;
  }, [enquiries]);

  function addEnquiry(
    input: NewEnquiryInput = {},
  ) {
    const now =
      new Date().toISOString();

    const firstName =
      input.firstName?.trim() ?? "";

    const surname =
      input.surname?.trim() ?? "";

    const newEnquiry: EnquiryRecord = {
      id: `enquiry-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

      enquiryNumber:
        createNextEnquiryNumber(
          enquiriesRef.current,
        ),

      createdAt: now,
      updatedAt: now,

      status: "New Enquiry",
      source:
        input.source ??
        "Recommendation",
      referredBy: "",

      firstName,
      surname,
      fullName: createFullName(
        firstName,
        surname,
      ),

      address:
        input.address?.trim() ?? "",

      postcode:
        input.postcode
          ?.trim()
          .toUpperCase() ?? "",

      emailAddress:
        input.emailAddress?.trim() ??
        "",

      homePhone:
        input.homePhone?.trim() ?? "",

      mobilePhone:
        input.mobilePhone?.trim() ??
        "",

      initialMessage:
        input.initialMessage?.trim() ??
        "",

      internalNotes: "",

      siteVisitDate: "",
      siteVisitTime: "",

      lawnMeasured: false,
      lawnSizeSquareMetres: 0,

      minimumPriceApplied: false,
      pricePerSquareMetre: 0.20,
      calculatedTreatmentPrice: 0,
      quotedTreatmentPrice: 0,

      quoteStatus: "Not Prepared",
      quoteDate: "",
      quoteExpiryDate: "",
      quoteNotes: "",

      treatmentStartedImmediately: false,

      suggestedGroupNumber: 1,
      suggestedVanNumber: 1,

      extraWorkRequired: false,
      extraWorkDescription: "",
      preferredExtraWorkSeason: "",

      convertedCustomerNumber: "",
      convertedAt: "",
    };

    const current =
      enquiriesRef.current;

    const duplicateNumber =
      current.some(
        (enquiry) =>
          enquiry.enquiryNumber ===
          newEnquiry.enquiryNumber,
      );

    if (duplicateNumber) {
      newEnquiry.enquiryNumber =
        createNextEnquiryNumber(
          current,
        );
    }

    const next = [
      newEnquiry,
      ...current,
    ];

    enquiriesRef.current = next;
    setEnquiries(next);

    void fetch("/api/enquiries", {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(newEnquiry),
    })
      .then(async (response) => {
        if (!response.ok) {
          const body =
            (await response.json().catch(
              () => ({}),
            )) as { error?: string };

          throw new Error(
            body.error ||
              `Unable to create enquiry (${response.status}).`,
          );
        }
      })
      .catch(async (error) => {
        console.error(
          "Failed to persist GreenFlow enquiry:",
          error,
        );
        await reloadEnquiries();
      });

    return newEnquiry;
  }

  function updateEnquiry(
    updatedEnquiry: EnquiryRecord,
  ): EnquiryMutationResult {
    const current =
      enquiriesRef.current;

    const existingIndex =
      current.findIndex(
        (enquiry) =>
          enquiry.id ===
          updatedEnquiry.id,
      );

    if (existingIndex < 0) {
      return {
        success: false,
        message:
          "The enquiry could not be found, so no changes were saved.",
      };
    }

    const normalised =
      normaliseEnquiryRecord({
        ...updatedEnquiry,
        fullName:
          createFullName(
            updatedEnquiry.firstName,
            updatedEnquiry.surname,
          ),
        updatedAt:
          new Date().toISOString(),
      });

    const numberCollision =
      current.some(
        (enquiry) =>
          enquiry.id !==
            normalised.id &&
          enquiry.enquiryNumber ===
            normalised.enquiryNumber,
      );

    if (numberCollision) {
      return {
        success: false,
        message:
          `Enquiry number ${normalised.enquiryNumber} is already in use.`,
      };
    }

    const next =
      current.map(
        (enquiry, index) =>
          index === existingIndex
            ? normalised
            : enquiry,
      );

    enquiriesRef.current = next;
    setEnquiries(next);

    void fetch(
      `/api/enquiries/${encodeURIComponent(
        normalised.id,
      )}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(normalised),
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          const body =
            (await response.json().catch(
              () => ({}),
            )) as { error?: string };

          throw new Error(
            body.error ||
              `Unable to update enquiry (${response.status}).`,
          );
        }
      })
      .catch(async (error) => {
        console.error(
          "Failed to persist GreenFlow enquiry update:",
          error,
        );
        await reloadEnquiries();
      });

    return {
      success: true,
      message:
        "Enquiry updated successfully.",
    };
  }

  function deleteEnquiry(
    enquiryId: string,
  ) {
    const current =
      enquiriesRef.current;

    const next = current.filter(
      (enquiry) =>
        enquiry.id !== enquiryId,
    );

    enquiriesRef.current = next;
    setEnquiries(next);

    void fetch(
      `/api/enquiries/${encodeURIComponent(
        enquiryId,
      )}`,
      { method: "DELETE" },
    )
      .then(async (response) => {
        if (!response.ok) {
          const body =
            (await response.json().catch(
              () => ({}),
            )) as { error?: string };

          throw new Error(
            body.error ||
              `Unable to delete enquiry (${response.status}).`,
          );
        }
      })
      .catch(async (error) => {
        console.error(
          "Failed to delete GreenFlow enquiry:",
          error,
        );
        await reloadEnquiries();
      });
  }

  function getEnquiryById(
    enquiryId: string,
  ) {
    return enquiriesRef.current.find(
      (enquiry) =>
        enquiry.id === enquiryId,
    );
  }

  function calculateQuote(
    lawnSizeSquareMetres: number,
    pricePerSquareMetre: number,
    minimumPrice: number,
  ) {
    const safeArea =
      Number.isFinite(
        lawnSizeSquareMetres,
      )
        ? Math.max(
            0,
            lawnSizeSquareMetres,
          )
        : 0;

    const safeRate =
      Number.isFinite(
        pricePerSquareMetre,
      )
        ? Math.max(
            0,
            pricePerSquareMetre,
          )
        : 0;

    const safeMinimum =
      Number.isFinite(minimumPrice)
        ? Math.max(0, minimumPrice)
        : 0;

    const calculatedPrice =
      safeArea * safeRate;

    const finalPrice = Math.max(
      calculatedPrice,
      safeMinimum,
    );

    return {
      calculatedPrice:
        roundCurrency(calculatedPrice),

      finalPrice:
        roundCurrency(finalPrice),

      minimumPriceApplied:
        calculatedPrice < safeMinimum,
    };
  }

  function markConverted(
    enquiryId: string,
    customerNumber: string,
  ): EnquiryMutationResult {
    const trimmedCustomerNumber =
      customerNumber.trim();

    if (!trimmedCustomerNumber) {
      return {
        success: false,
        message:
          "A customer number is required before an enquiry can be marked as converted.",
      };
    }

    const current =
      enquiriesRef.current;

    const existingIndex =
      current.findIndex(
        (enquiry) =>
          enquiry.id === enquiryId,
      );

    if (existingIndex < 0) {
      return {
        success: false,
        message:
          "The enquiry could not be found, so it was not marked as converted.",
      };
    }

    const now =
      new Date().toISOString();

    const updated: EnquiryRecord = {
      ...current[existingIndex],
      status: "Converted to Customer",
      quoteStatus: "Accepted",
      convertedCustomerNumber:
        trimmedCustomerNumber,
      convertedAt: now,
      updatedAt: now,
    };

    const next =
      current.map(
        (enquiry, index) =>
          index === existingIndex
            ? updated
            : enquiry,
      );

    enquiriesRef.current = next;
    setEnquiries(next);

    void fetch(
      `/api/enquiries/${encodeURIComponent(
        enquiryId,
      )}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(updated),
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          const body =
            (await response.json().catch(
              () => ({}),
            )) as { error?: string };

          throw new Error(
            body.error ||
              `Unable to mark enquiry as converted (${response.status}).`,
          );
        }
      })
      .catch(async (error) => {
        console.error(
          "Failed to persist GreenFlow enquiry conversion:",
          error,
        );
        await reloadEnquiries();
      });

    return {
      success: true,
      message:
        "Enquiry marked as converted.",
    };
  }

  function restoreDemoEnquiries() {
    const demo =
      defaultDemoEnquiries.map(
        (enquiry) => ({ ...enquiry }),
      );

    enquiriesRef.current = demo;
    setEnquiries(demo);

    void fetch("/api/enquiries", {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        enquiries: demo,
      }),
    }).catch(async (error) => {
      console.error(
        "Failed to restore GreenFlow demo enquiries:",
        error,
      );
      await reloadEnquiries();
    });
  }

  function clearEnquiries() {
    const current =
      enquiriesRef.current;

    enquiriesRef.current = [];
    setEnquiries([]);

    void Promise.all(
      current.map(async (enquiry) => {
        const response = await fetch(
          `/api/enquiries/${encodeURIComponent(
            enquiry.id,
          )}`,
          { method: "DELETE" },
        );

        if (!response.ok) {
          throw new Error(
            `Unable to delete enquiry ${enquiry.enquiryNumber} (${response.status}).`,
          );
        }
      }),
    ).catch(async (error) => {
      console.error(
        "Failed to clear GreenFlow enquiries:",
        error,
      );
      await reloadEnquiries();
    });
  }

  const value =
    useMemo<EnquiryStoreValue>(
      () => ({
        enquiries,
        ready,
        addEnquiry,
        updateEnquiry,
        deleteEnquiry,
        getEnquiryById,
        calculateQuote,
        markConverted,
        restoreDemoEnquiries,
        clearEnquiries,
      }),
      [enquiries, ready],
    );

  return (
    <EnquiryStoreContext.Provider
      value={value}
    >
      {children}
    </EnquiryStoreContext.Provider>
  );
}

export function useEnquiryStore() {
  const context = useContext(
    EnquiryStoreContext,
  );

  if (!context) {
    throw new Error(
      "useEnquiryStore must be used inside EnquiryStoreProvider.",
    );
  }

  return context;
}

function normaliseEnquiryRecord(
  enquiry: Partial<EnquiryRecord>,
): EnquiryRecord {
  const firstName =
    enquiry.firstName?.trim() ?? "";

  const surname =
    enquiry.surname?.trim() ?? "";

  return {
    id:
      enquiry.id ??
      `enquiry-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    enquiryNumber:
      normaliseEnquiryNumber(
        enquiry.enquiryNumber,
      ),

    createdAt:
      enquiry.createdAt ??
      new Date().toISOString(),

    updatedAt:
      enquiry.updatedAt ??
      new Date().toISOString(),

    status:
      normaliseEnquiryStatus(
        enquiry.status,
      ),

    source:
      normaliseEnquirySource(
        enquiry.source,
      ),

    referredBy:
      enquiry.referredBy?.trim() ?? "",

    firstName,
    surname,

    fullName:
      enquiry.fullName?.trim() ||
      createFullName(
        firstName,
        surname,
      ),

    address:
      enquiry.address?.trim() ?? "",

    postcode:
      enquiry.postcode
        ?.trim()
        .toUpperCase() ?? "",

    emailAddress:
      enquiry.emailAddress?.trim() ?? "",

    homePhone:
      enquiry.homePhone?.trim() ?? "",

    mobilePhone:
      enquiry.mobilePhone?.trim() ?? "",

    initialMessage:
      enquiry.initialMessage?.trim() ?? "",

    internalNotes:
      enquiry.internalNotes?.trim() ?? "",

    siteVisitDate:
      enquiry.siteVisitDate ?? "",

    siteVisitTime:
      enquiry.siteVisitTime ?? "",

    lawnMeasured:
      enquiry.lawnMeasured ?? false,

    lawnSizeSquareMetres:
      safeNonNegativeNumber(
        enquiry.lawnSizeSquareMetres,
      ),

    minimumPriceApplied:
      enquiry.minimumPriceApplied ??
      false,

    pricePerSquareMetre:
      safeNonNegativeNumber(
        enquiry.pricePerSquareMetre,
        0.20,
      ),

    calculatedTreatmentPrice:
      safeNonNegativeNumber(
        enquiry.calculatedTreatmentPrice,
      ),

    quotedTreatmentPrice:
      safeNonNegativeNumber(
        enquiry.quotedTreatmentPrice,
      ),

    quoteStatus:
      normaliseQuoteStatus(
        enquiry.quoteStatus,
      ),

    quoteDate:
      enquiry.quoteDate ?? "",

    quoteExpiryDate:
      enquiry.quoteExpiryDate ?? "",

    quoteNotes:
      enquiry.quoteNotes?.trim() ?? "",

    treatmentStartedImmediately:
      enquiry.treatmentStartedImmediately ??
      false,

    suggestedGroupNumber:
      safePositiveInteger(
        enquiry.suggestedGroupNumber,
        1,
      ),

    suggestedVanNumber:
      safePositiveInteger(
        enquiry.suggestedVanNumber,
        1,
      ),

    extraWorkRequired:
      enquiry.extraWorkRequired ??
      false,

    extraWorkDescription:
      enquiry.extraWorkDescription?.trim() ?? "",

    preferredExtraWorkSeason:
      enquiry.preferredExtraWorkSeason?.trim() ?? "",

    convertedCustomerNumber:
      enquiry.convertedCustomerNumber?.trim() ?? "",

    convertedAt:
      enquiry.convertedAt ?? "",
  };
}

function normaliseEnquiryNumber(
  value: string | undefined,
) {
  const trimmed =
    value?.trim().toUpperCase() ?? "";

  return trimmed || "ENQ-0000";
}

function normaliseEnquiryStatus(
  value:
    | EnquiryStatus
    | string
    | undefined,
): EnquiryStatus {
  if (
    value === "New Enquiry" ||
    value === "Visit Arranged" ||
    value === "Quote Prepared" ||
    value === "Quote Accepted" ||
    value === "Quote Declined" ||
    value === "Converted to Customer" ||
    value === "Closed"
  ) {
    return value;
  }

  return "New Enquiry";
}

function normaliseEnquirySource(
  value:
    | EnquirySource
    | string
    | undefined,
): EnquirySource {
  if (
    value === "Recommendation" ||
    value === "Website" ||
    value === "Telephone" ||
    value === "Email" ||
    value === "Social Media" ||
    value === "Other"
  ) {
    return value;
  }

  return "Recommendation";
}

function normaliseQuoteStatus(
  value:
    | QuoteStatus
    | string
    | undefined,
): QuoteStatus {
  if (
    value === "Not Prepared" ||
    value === "Draft" ||
    value === "Presented" ||
    value === "Accepted" ||
    value === "Declined"
  ) {
    return value;
  }

  return "Not Prepared";
}

function safeNonNegativeNumber(
  value: number | undefined,
  fallback = 0,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    0,
    value,
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

function enquiryPriority(
  enquiry: EnquiryRecord,
) {
  return (
    Number(
      Boolean(enquiry.fullName),
    ) *
      100 +
    Number(
      Boolean(enquiry.address),
    ) *
      50 +
    Number(
      Boolean(enquiry.postcode),
    ) *
      25 +
    Number(
      Boolean(
        enquiry.emailAddress ||
        enquiry.mobilePhone ||
        enquiry.homePhone,
      ),
    ) *
      20 +
    Number(
      enquiry.lawnSizeSquareMetres > 0,
    ) *
      10 +
    Number(
      enquiry.quotedTreatmentPrice > 0,
    ) *
      10 +
    Number(
      Boolean(
        enquiry.convertedCustomerNumber,
      ),
    ) *
      10 +
    Number(
      Boolean(enquiry.internalNotes),
    )
  );
}

function mergeDuplicateEnquiries(
  preferred: EnquiryRecord,
  secondary: EnquiryRecord,
): EnquiryRecord {
  return normaliseEnquiryRecord({
    ...secondary,
    ...preferred,
    id:
      preferred.id ||
      secondary.id,
    enquiryNumber:
      preferred.enquiryNumber !==
      "ENQ-0000"
        ? preferred.enquiryNumber
        : secondary.enquiryNumber,
    firstName:
      preferred.firstName ||
      secondary.firstName,
    surname:
      preferred.surname ||
      secondary.surname,
    fullName:
      preferred.fullName ||
      secondary.fullName,
    address:
      preferred.address ||
      secondary.address,
    postcode:
      preferred.postcode ||
      secondary.postcode,
    emailAddress:
      preferred.emailAddress ||
      secondary.emailAddress,
    homePhone:
      preferred.homePhone ||
      secondary.homePhone,
    mobilePhone:
      preferred.mobilePhone ||
      secondary.mobilePhone,
    initialMessage:
      preferred.initialMessage ||
      secondary.initialMessage,
    internalNotes:
      preferred.internalNotes ||
      secondary.internalNotes,
    lawnSizeSquareMetres:
      preferred.lawnSizeSquareMetres > 0
        ? preferred.lawnSizeSquareMetres
        : secondary.lawnSizeSquareMetres,
    pricePerSquareMetre:
      preferred.pricePerSquareMetre > 0
        ? preferred.pricePerSquareMetre
        : secondary.pricePerSquareMetre,
    calculatedTreatmentPrice:
      preferred.calculatedTreatmentPrice > 0
        ? preferred.calculatedTreatmentPrice
        : secondary.calculatedTreatmentPrice,
    quotedTreatmentPrice:
      preferred.quotedTreatmentPrice > 0
        ? preferred.quotedTreatmentPrice
        : secondary.quotedTreatmentPrice,
    convertedCustomerNumber:
      preferred.convertedCustomerNumber ||
      secondary.convertedCustomerNumber,
    convertedAt:
      preferred.convertedAt ||
      secondary.convertedAt,
  });
}

function deduplicateEnquiries(
  enquiries: EnquiryRecord[],
) {
  const byId =
    new Map<
      string,
      EnquiryRecord
    >();

  for (
    const enquiry of enquiries
  ) {
    const existing =
      byId.get(
        enquiry.id,
      );

    if (!existing) {
      byId.set(
        enquiry.id,
        enquiry,
      );
      continue;
    }

    const preferred =
      enquiryPriority(
        enquiry,
      ) >
      enquiryPriority(
        existing,
      )
        ? enquiry
        : existing;

    const secondary =
      preferred === enquiry
        ? existing
        : enquiry;

    byId.set(
      enquiry.id,
      mergeDuplicateEnquiries(
        preferred,
        secondary,
      ),
    );
  }

  const byNumber =
    new Map<
      string,
      EnquiryRecord
    >();

  for (
    const enquiry of byId.values()
  ) {
    const number =
      normaliseEnquiryNumber(
        enquiry.enquiryNumber,
      );

    const existing =
      byNumber.get(number);

    if (
      !existing ||
      number === "ENQ-0000"
    ) {
      byNumber.set(
        number === "ENQ-0000"
          ? `${number}-${enquiry.id}`
          : number,
        enquiry,
      );
      continue;
    }

    const preferred =
      enquiryPriority(
        enquiry,
      ) >
      enquiryPriority(
        existing,
      )
        ? enquiry
        : existing;

    const secondary =
      preferred === enquiry
        ? existing
        : enquiry;

    byNumber.set(
      number,
      mergeDuplicateEnquiries(
        preferred,
        secondary,
      ),
    );
  }

  return Array.from(
    byNumber.values(),
  );
}

function createNextEnquiryNumber(
  enquiries: EnquiryRecord[],
) {
  const highestNumber =
    enquiries.reduce(
      (highest, enquiry) => {
        const numericPart = Number(
          enquiry.enquiryNumber.replace(
            /\D/g,
            "",
          ),
        );

        if (
          !Number.isFinite(
            numericPart,
          )
        ) {
          return highest;
        }

        return Math.max(
          highest,
          numericPart,
        );
      },
      0,
    );

  return `ENQ-${String(
    highestNumber + 1,
  ).padStart(4, "0")}`;
}

function createFullName(
  firstName: string,
  surname: string,
) {
  return [firstName, surname]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
}

function roundCurrency(
  value: number,
) {
  return Math.round(
    (value + Number.EPSILON) * 100,
  ) / 100;
}