"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
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

type EnquiryStoreValue = {
  enquiries: EnquiryRecord[];
  ready: boolean;

  addEnquiry: (
    input?: NewEnquiryInput,
  ) => EnquiryRecord;

  updateEnquiry: (
    updatedEnquiry: EnquiryRecord,
  ) => void;

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
  ) => void;

  restoreDemoEnquiries: () => void;
};

const STORAGE_KEY =
  "greenflow-enquiries-v1";

const EnquiryStoreContext =
  createContext<EnquiryStoreValue | null>(
    null,
  );

const defaultDemoEnquiries: EnquiryRecord[] = [
  {
    id: "enquiry-demo-1",
    enquiryNumber: "ENQ-0001",

    createdAt: "2028-04-15T09:30:00.000Z",
    updatedAt: "2028-04-15T09:30:00.000Z",

    status: "Visit Arranged",
    source: "Recommendation",
    referredBy: "John Smith",

    firstName: "Emily",
    surname: "Carter",
    fullName: "Emily Carter",

    address: "24 Meadow Close",
    postcode: "DEMO 4GF",

    emailAddress: "emily.carter@example.com",
    homePhone: "",
    mobilePhone: "07700 900456",

    initialMessage:
      "Recommended by an existing customer. Would like a quotation for regular seasonal lawn treatments.",
    internalNotes:
      "Front and rear lawns. Access appears straightforward.",

    siteVisitDate: "2028-04-18",
    siteVisitTime: "10:30",

    lawnMeasured: false,
    lawnSizeSquareMetres: 0,

    minimumPriceApplied: false,
    pricePerSquareMetre: 0.18,
    calculatedTreatmentPrice: 0,
    quotedTreatmentPrice: 0,

    quoteStatus: "Not Prepared",
    quoteDate: "",
    quoteExpiryDate: "",
    quoteNotes: "",

    treatmentStartedImmediately: false,

    suggestedGroupNumber: 7,
    suggestedVanNumber: 1,

    extraWorkRequired: false,
    extraWorkDescription: "",
    preferredExtraWorkSeason: "",

    convertedCustomerNumber: "",
    convertedAt: "",
  },

  {
    id: "enquiry-demo-2",
    enquiryNumber: "ENQ-0002",

    createdAt: "2028-04-16T13:10:00.000Z",
    updatedAt: "2028-04-16T15:45:00.000Z",

    status: "Quote Prepared",
    source: "Website",
    referredBy: "",

    firstName: "Michael",
    surname: "Turner",
    fullName: "Michael Turner",

    address: "8 Orchard View",
    postcode: "DEMO 8LT",

    emailAddress: "michael.turner@example.com",
    homePhone: "",
    mobilePhone: "07700 900789",

    initialMessage:
      "Website enquiry requesting help with a lawn containing moss and broad-leaved weeds.",
    internalNotes:
      "Measured during site visit. Customer interested in beginning immediately.",

    siteVisitDate: "2028-04-17",
    siteVisitTime: "14:00",

    lawnMeasured: true,
    lawnSizeSquareMetres: 165,

    minimumPriceApplied: false,
    pricePerSquareMetre: 0.18,
    calculatedTreatmentPrice: 29.7,
    quotedTreatmentPrice: 30,

    quoteStatus: "Presented",
    quoteDate: "2028-04-17",
    quoteExpiryDate: "2028-05-17",
    quoteNotes:
      "Regular seasonal treatment quoted at £30.00 including VAT.",

    treatmentStartedImmediately: false,

    suggestedGroupNumber: 9,
    suggestedVanNumber: 1,

    extraWorkRequired: true,
    extraWorkDescription:
      "Possible autumn scarification followed by overseeding.",
    preferredExtraWorkSeason: "Autumn",

    convertedCustomerNumber: "",
    convertedAt: "",
  },
];

export function EnquiryStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [enquiries, setEnquiries] =
    useState<EnquiryRecord[]>([]);

  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    const saved =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (saved) {
      try {
        const parsed = JSON.parse(
          saved,
        ) as Array<
          Partial<EnquiryRecord>
        >;

        if (Array.isArray(parsed)) {
          setEnquiries(
            parsed.map(
              normaliseEnquiryRecord,
            ),
          );
        }
      } catch {
        window.localStorage.removeItem(
          STORAGE_KEY,
        );
      }
    } else {
      setEnquiries(
        defaultDemoEnquiries.map(
          (enquiry) => ({
            ...enquiry,
          }),
        ),
      );
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(enquiries),
    );
  }, [enquiries, ready]);

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
          enquiries,
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
      pricePerSquareMetre: 0.18,
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

    setEnquiries((current) => [
      newEnquiry,
      ...current,
    ]);

    return newEnquiry;
  }

  function updateEnquiry(
    updatedEnquiry: EnquiryRecord,
  ) {
    const normalised =
      normaliseEnquiryRecord({
        ...updatedEnquiry,

        fullName: createFullName(
          updatedEnquiry.firstName,
          updatedEnquiry.surname,
        ),

        updatedAt:
          new Date().toISOString(),
      });

    setEnquiries((current) =>
      current.map((enquiry) =>
        enquiry.id === normalised.id
          ? normalised
          : enquiry,
      ),
    );
  }

  function deleteEnquiry(
    enquiryId: string,
  ) {
    setEnquiries((current) =>
      current.filter(
        (enquiry) =>
          enquiry.id !== enquiryId,
      ),
    );
  }

  function getEnquiryById(
    enquiryId: string,
  ) {
    return enquiries.find(
      (enquiry) =>
        enquiry.id === enquiryId,
    );
  }

  function calculateQuote(
    lawnSizeSquareMetres: number,
    pricePerSquareMetre: number,
    minimumPrice: number,
  ) {
    const safeArea = Math.max(
      0,
      lawnSizeSquareMetres,
    );

    const safeRate = Math.max(
      0,
      pricePerSquareMetre,
    );

    const safeMinimum = Math.max(
      0,
      minimumPrice,
    );

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
  ) {
    setEnquiries((current) =>
      current.map((enquiry) =>
        enquiry.id === enquiryId
          ? {
              ...enquiry,
              status:
                "Converted to Customer",
              quoteStatus: "Accepted",
              convertedCustomerNumber:
                customerNumber,
              convertedAt:
                new Date().toISOString(),
              updatedAt:
                new Date().toISOString(),
            }
          : enquiry,
      ),
    );
  }

  function restoreDemoEnquiries() {
    setEnquiries(
      defaultDemoEnquiries.map(
        (enquiry) => ({
          ...enquiry,
        }),
      ),
    );

    window.localStorage.removeItem(
      STORAGE_KEY,
    );
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
    enquiry.firstName ?? "";

  const surname =
    enquiry.surname ?? "";

  return {
    id:
      enquiry.id ??
      `enquiry-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    enquiryNumber:
      enquiry.enquiryNumber ??
      "ENQ-0000",

    createdAt:
      enquiry.createdAt ??
      new Date().toISOString(),

    updatedAt:
      enquiry.updatedAt ??
      new Date().toISOString(),

    status:
      enquiry.status ??
      "New Enquiry",

    source:
      enquiry.source ??
      "Recommendation",

    referredBy:
      enquiry.referredBy ?? "",

    firstName,
    surname,

    fullName:
      enquiry.fullName ||
      createFullName(
        firstName,
        surname,
      ),

    address:
      enquiry.address ?? "",

    postcode:
      enquiry.postcode ?? "",

    emailAddress:
      enquiry.emailAddress ?? "",

    homePhone:
      enquiry.homePhone ?? "",

    mobilePhone:
      enquiry.mobilePhone ?? "",

    initialMessage:
      enquiry.initialMessage ?? "",

    internalNotes:
      enquiry.internalNotes ?? "",

    siteVisitDate:
      enquiry.siteVisitDate ?? "",

    siteVisitTime:
      enquiry.siteVisitTime ?? "",

    lawnMeasured:
      enquiry.lawnMeasured ?? false,

    lawnSizeSquareMetres:
      enquiry.lawnSizeSquareMetres ??
      0,

    minimumPriceApplied:
      enquiry.minimumPriceApplied ??
      false,

    pricePerSquareMetre:
      enquiry.pricePerSquareMetre ??
      0.18,

    calculatedTreatmentPrice:
      enquiry.calculatedTreatmentPrice ??
      0,

    quotedTreatmentPrice:
      enquiry.quotedTreatmentPrice ??
      0,

    quoteStatus:
      enquiry.quoteStatus ??
      "Not Prepared",

    quoteDate:
      enquiry.quoteDate ?? "",

    quoteExpiryDate:
      enquiry.quoteExpiryDate ?? "",

    quoteNotes:
      enquiry.quoteNotes ?? "",

    treatmentStartedImmediately:
      enquiry.treatmentStartedImmediately ??
      false,

    suggestedGroupNumber:
      enquiry.suggestedGroupNumber ??
      1,

    suggestedVanNumber:
      enquiry.suggestedVanNumber ??
      1,

    extraWorkRequired:
      enquiry.extraWorkRequired ??
      false,

    extraWorkDescription:
      enquiry.extraWorkDescription ??
      "",

    preferredExtraWorkSeason:
      enquiry.preferredExtraWorkSeason ??
      "",

    convertedCustomerNumber:
      enquiry.convertedCustomerNumber ??
      "",

    convertedAt:
      enquiry.convertedAt ?? "",
  };
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
          Number.isNaN(numericPart)
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