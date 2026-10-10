"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { useCustomerStore } from "@/components/customer-store";
import {
  type EnquiryLawnArea,
  type EnquiryRecord,
  type EnquirySource,
  type EnquiryStatus,
  type QuoteStatus,
  useEnquiryStore,
} from "@/components/enquiry-store";
import {
  type CustomerProgramme,
  type ProgrammeVisit,
  useProgrammeStore,
} from "@/components/programme-store";
import { useFleetStore } from "@/components/fleet-store";
import {
  demoCustomers,
} from "@/lib/demo-customers";

type StatusFilter =
  | EnquiryStatus
  | "All";

type MessageTone =
  | "success"
  | "error";

const enquirySources: EnquirySource[] = [
  "Recommendation",
  "Website",
  "Telephone",
  "Email",
  "Social Media",
  "Other",
];

const enquiryStatuses: EnquiryStatus[] = [
  "New Enquiry",
  "Visit Arranged",
  "Quote Prepared",
  "Quote Accepted",
  "Quote Declined",
  "Converted to Customer",
  "Closed",
];

const quoteStatuses: QuoteStatus[] = [
  "Not Prepared",
  "Draft",
  "Presented",
  "Accepted",
  "Declined",
];

const standardTreatmentNames = [
  "Early winter moss control",
  "Spring weed and feed",
  "Summer weed and feed",
  "Autumn weed and feed",
  "Winter moss control",
];

function StatusBadge({
  status,
}: {
  status: EnquiryStatus;
}) {
  const styles =
    status ===
      "Converted to Customer" ||
    status === "Quote Accepted"
      ? "bg-green-100 text-green-800"
      : status ===
            "Quote Declined" ||
          status === "Closed"
        ? "bg-red-100 text-red-700"
        : status ===
            "Quote Prepared"
          ? "bg-blue-100 text-blue-800"
          : status ===
              "Visit Arranged"
            ? "bg-amber-100 text-amber-800"
            : "bg-slate-100 text-slate-700";

  return (
    <span
      className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}
    >
      {status}
    </span>
  );
}

export default function EnquiriesPage() {
  const {
    enquiries,
    ready: enquiriesReady,
    addEnquiry,
    updateEnquiry,
    deleteEnquiry,
    getEnquiryById,
    calculateQuote,
    markConverted,
  } = useEnquiryStore();

  const {
    ready: customersReady,
    addCustomer,
    allocateCustomerNumber,
  } = useCustomerStore();

  const {
    ready: programmesReady,
    saveProgramme,
  } = useProgrammeStore();

  const {
    vehicles,
    activeVehicles,
    ready: fleetReady,
  } = useFleetStore();

  const currentYear =
    new Date().getFullYear();

  const [draft, setDraft] =
    useState<EnquiryRecord | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("All");

  const [message, setMessage] =
    useState("");

  const [messageTone, setMessageTone] =
    useState<MessageTone>("success");

  const [
    generateProgramme,
    setGenerateProgramme,
  ] = useState(true);

  const [
    programmeYear,
    setProgrammeYear,
  ] = useState(currentYear);

  const [
    programmeStartDate,
    setProgrammeStartDate,
  ] = useState(todayDate());

  const filteredEnquiries = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return [...enquiries]
      .filter((enquiry) => {
        const matchesStatus =
          statusFilter === "All"
            ? enquiry.status !== "Converted to Customer"
            : enquiry.status === statusFilter;

        if (!matchesStatus) {
          return false;
        }

        if (!query) {
          return true;
        }

        return [
          enquiry.enquiryNumber,
          enquiry.fullName,
          enquiry.address,
          enquiry.postcode,
          enquiry.emailAddress,
          enquiry.mobilePhone,
          enquiry.source,
          enquiry.referredBy,
        ].some((value) =>
          value
            .toLowerCase()
            .includes(query),
        );
      })
      .sort(
        (first, second) =>
          new Date(
            second.updatedAt,
          ).getTime() -
          new Date(
            first.updatedAt,
          ).getTime(),
      );
  }, [
    enquiries,
    search,
    statusFilter,
  ]);

  useEffect(() => {
    if (
      draft ||
      filteredEnquiries.length === 0
    ) {
      return;
    }

    setDraft({
      ...filteredEnquiries[0],
    });
  }, [draft, filteredEnquiries]);

  const selectedEnquiry = draft;

  const newCount = enquiries.filter(
    (enquiry) =>
      enquiry.status === "New Enquiry",
  ).length;

  const visitsArrangedCount =
    enquiries.filter(
      (enquiry) =>
        enquiry.status ===
        "Visit Arranged",
    ).length;

  const quotesOutstandingCount =
    enquiries.filter(
      (enquiry) =>
        enquiry.quoteStatus === "Draft" ||
        enquiry.quoteStatus ===
          "Presented",
    ).length;

  const acceptedCount = enquiries.filter(
    (enquiry) =>
      enquiry.status !==
        "Converted to Customer" &&
      (enquiry.quoteStatus ===
        "Accepted" ||
        enquiry.status ===
          "Quote Accepted"),
  ).length;

  function selectEnquiry(
    enquiry: EnquiryRecord,
  ) {
    setDraft({
      ...enquiry,
      lawnAreas: enquiry.lawnAreas.map(
        (lawnArea) => ({ ...lawnArea }),
      ),
    });

    setProgrammeYear(currentYear);
    setProgrammeStartDate(todayDate());
    setGenerateProgramme(true);
  }

  async function createNewEnquiry() {
    const result = await addEnquiry();

    if (!result.success || !result.enquiry) {
      showMessage(
        result.message,
        "error",
      );
      return;
    }

    const enquiry = result.enquiry;

    setDraft({
      ...enquiry,
      lawnAreas: enquiry.lawnAreas.map(
        (lawnArea) => ({ ...lawnArea }),
      ),
    });

    setProgrammeYear(currentYear);
    setProgrammeStartDate(todayDate());
    setGenerateProgramme(true);

    showMessage(
      `${enquiry.enquiryNumber} created.`,
    );
  }

  function updateDraft<
    K extends keyof EnquiryRecord,
  >(
    field: K,
    value: EnquiryRecord[K],
  ) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const updated: EnquiryRecord = {
        ...current,
        [field]: value,
      };

      if (
        field === "title" ||
        field === "firstName" ||
        field === "surname"
      ) {
        updated.fullName = [
          updated.title,
          updated.firstName,
          updated.surname,
        ]
          .map((part) => part.trim())
          .filter(Boolean)
          .join(" ");
      }

      return updated;
    });
  }

  function addLawnArea() {
    if (!draft) {
      return;
    }

    const nextOrder = draft.lawnAreas.length;

    const lawnArea: EnquiryLawnArea = {
      id: `lawn-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      name: "",
      areaSquareMetres: 0,
      displayOrder: nextOrder,
    };

    const lawnAreas = [
      ...draft.lawnAreas,
      lawnArea,
    ];

    updateDraftWithLawnAreas(lawnAreas);
  }

  function updateLawnArea(
    lawnAreaId: string,
    field: "name" | "areaSquareMetres",
    value: string | number,
  ) {
    if (!draft) {
      return;
    }

    const lawnAreas = draft.lawnAreas.map(
      (lawnArea) =>
        lawnArea.id === lawnAreaId
          ? {
              ...lawnArea,
              [field]: value,
            }
          : lawnArea,
    );

    updateDraftWithLawnAreas(lawnAreas);
  }

  function removeLawnArea(
    lawnAreaId: string,
  ) {
    if (!draft) {
      return;
    }

    const lawnAreas = draft.lawnAreas
      .filter(
        (lawnArea) =>
          lawnArea.id !== lawnAreaId,
      )
      .map((lawnArea, index) => ({
        ...lawnArea,
        displayOrder: index,
      }));

    updateDraftWithLawnAreas(lawnAreas);
  }

  function updateDraftWithLawnAreas(
    lawnAreas: EnquiryLawnArea[],
  ) {
    const normalisedLawnAreas =
      lawnAreas.map((lawnArea, index) => ({
        ...lawnArea,
        displayOrder: index,
      }));

    const totalArea =
      normalisedLawnAreas.reduce(
        (total, lawnArea) =>
          total +
          (Number.isFinite(
            lawnArea.areaSquareMetres,
          )
            ? Math.max(
                0,
                Math.floor(
                  lawnArea.areaSquareMetres,
                ),
              )
            : 0),
        0,
      );

    setDraft((current) =>
      current
        ? {
            ...current,
            lawnAreas: normalisedLawnAreas,
            lawnSizeSquareMetres:
              normalisedLawnAreas.length > 0
                ? totalArea
                : current.lawnSizeSquareMetres,
            lawnMeasured:
              normalisedLawnAreas.length > 0
                ? totalArea > 0
                : current.lawnMeasured,
          }
        : current,
    );
  }

  async function persistEnquiry(
    enquiryToSave: EnquiryRecord,
    successMessage: string,
  ): Promise<boolean> {
    const title = enquiryToSave.title.trim();
    const firstName = enquiryToSave.firstName.trim();
    const surname = enquiryToSave.surname.trim();
    const address = enquiryToSave.address.trim();
    const postcode = enquiryToSave.postcode.trim().toUpperCase();
    const emailAddress = enquiryToSave.emailAddress.trim();
    const homePhone = enquiryToSave.homePhone.trim();
    const mobilePhone = enquiryToSave.mobilePhone.trim();

    if (
      emailAddress &&
      !isValidEmailAddress(emailAddress)
    ) {
      showMessage(
        "Enter a valid email address or leave the email field blank.",
        "error",
      );
      return false;
    }

    if (
      enquiryToSave.quoteDate &&
      enquiryToSave.quoteExpiryDate &&
      enquiryToSave.quoteExpiryDate < enquiryToSave.quoteDate
    ) {
      showMessage(
        "The quote expiry date cannot be earlier than the quote date.",
        "error",
      );
      return false;
    }

    if (enquiryToSave.lawnAreas.length > 0) {
      for (const lawnArea of enquiryToSave.lawnAreas) {
        if (!lawnArea.name.trim()) {
          showMessage(
            "Enter a name for each lawn measurement.",
            "error",
          );
          return false;
        }

        if (
          !Number.isFinite(lawnArea.areaSquareMetres) ||
          !Number.isInteger(lawnArea.areaSquareMetres) ||
          lawnArea.areaSquareMetres <= 0
        ) {
          showMessage(
            "Each lawn measurement must have an area greater than 0 m².",
            "error",
          );
          return false;
        }
      }
    }

    const quoteIsPreparedOrBeyond =
      enquiryToSave.quoteStatus === "Draft" ||
      enquiryToSave.quoteStatus === "Presented" ||
      enquiryToSave.quoteStatus === "Accepted" ||
      enquiryToSave.status === "Quote Prepared" ||
      enquiryToSave.status === "Quote Accepted";

    if (
      quoteIsPreparedOrBeyond &&
      (
        !Number.isFinite(enquiryToSave.lawnSizeSquareMetres) ||
        enquiryToSave.lawnSizeSquareMetres <= 0
      )
    ) {
      showMessage(
        "Enter the measured lawn size before saving a prepared or accepted quote.",
        "error",
      );
      return false;
    }

    if (
      quoteIsPreparedOrBeyond &&
      (
        !Number.isFinite(enquiryToSave.quotedTreatmentPrice) ||
        enquiryToSave.quotedTreatmentPrice <= 0
      )
    ) {
      showMessage(
        "Calculate or enter a treatment price before saving a prepared or accepted quote.",
        "error",
      );
      return false;
    }

    if (
      !Number.isFinite(enquiryToSave.suggestedGroupNumber) ||
      !Number.isInteger(enquiryToSave.suggestedGroupNumber) ||
      enquiryToSave.suggestedGroupNumber < 1
    ) {
      showMessage(
        "Suggested group must be a positive whole number.",
        "error",
      );
      return false;
    }

    const suggestedVehicle = vehicles.find(
      (vehicle) =>
        vehicle.number === enquiryToSave.suggestedVanNumber,
    );

    if (!suggestedVehicle || !suggestedVehicle.active) {
      showMessage(
        "Choose an active fleet vehicle for the suggested van.",
        "error",
      );
      return false;
    }

    if (
      enquiryToSave.status === "Quote Accepted" &&
      enquiryToSave.quoteStatus !== "Accepted"
    ) {
      showMessage(
        "Set the quote status to Accepted before saving an accepted enquiry.",
        "error",
      );
      return false;
    }

    if (
      enquiryToSave.quoteStatus === "Accepted" &&
      enquiryToSave.status !== "Quote Accepted" &&
      enquiryToSave.status !== "Converted to Customer"
    ) {
      showMessage(
        "Set the enquiry status to Quote Accepted before saving an accepted quote.",
        "error",
      );
      return false;
    }

    const savedEnquiry: EnquiryRecord = {
      ...enquiryToSave,
      title,
      firstName,
      surname,
      fullName: [title, firstName, surname]
        .filter(Boolean)
        .join(" "),
      address,
      postcode,
      emailAddress,
      homePhone,
      mobilePhone,
      referredBy: enquiryToSave.referredBy.trim(),
      initialMessage: enquiryToSave.initialMessage.trim(),
      internalNotes: enquiryToSave.internalNotes.trim(),
      quoteNotes: enquiryToSave.quoteNotes.trim(),
      extraWorkDescription:
        enquiryToSave.extraWorkDescription.trim(),
      lawnAreas: enquiryToSave.lawnAreas.map(
        (lawnArea, index) => ({
          ...lawnArea,
          name: lawnArea.name.trim(),
          areaSquareMetres: Math.max(
            0,
            Math.floor(lawnArea.areaSquareMetres),
          ),
          displayOrder: index,
        }),
      ),
      lawnSizeSquareMetres:
        enquiryToSave.lawnAreas.length > 0
          ? enquiryToSave.lawnAreas.reduce(
              (total, lawnArea) =>
                total +
                Math.max(
                  0,
                  Math.floor(lawnArea.areaSquareMetres),
                ),
              0,
            )
          : enquiryToSave.lawnSizeSquareMetres,
    };

    const result = await updateEnquiry(savedEnquiry);

    if (!result.success) {
      showMessage(result.message, "error");
      return false;
    }

    setDraft({
      ...savedEnquiry,
      lawnAreas: savedEnquiry.lawnAreas.map(
        (lawnArea) => ({ ...lawnArea }),
      ),
    });

    showMessage(successMessage);
    return true;
  }

  async function saveEnquiry(
    event?: FormEvent<HTMLFormElement>,
  ) {
    event?.preventDefault();

    if (!draft) {
      showMessage(
        "Select or create an enquiry first.",
        "error",
      );
      return;
    }

    await persistEnquiry(
      draft,
      `${draft.enquiryNumber} saved.`,
    );
  }

  function arrangeVisit() {
    if (!draft) {
      return;
    }

    setDraft({
      ...draft,

      status: "Visit Arranged",

      siteVisitDate:
        draft.siteVisitDate ||
        todayDate(),

      siteVisitTime:
        draft.siteVisitTime ||
        "10:00",
    });

    showMessage(
      "Site visit prepared. Save the enquiry to retain the change.",
    );
  }

  function calculateCurrentQuote() {
    if (!draft) {
      return;
    }

    if (
      !Number.isFinite(
        draft.lawnSizeSquareMetres,
      ) ||
      draft.lawnSizeSquareMetres <= 0
    ) {
      showMessage(
        "Enter the measured lawn size before calculating the quotation.",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(
        draft.pricePerSquareMetre,
      ) ||
      draft.pricePerSquareMetre <= 0
    ) {
      showMessage(
        "Enter a price per square metre greater than £0.00.",
        "error",
      );
      return;
    }

    const result = calculateQuote(
      draft.lawnSizeSquareMetres,
      draft.pricePerSquareMetre,
      18,
    );

    setDraft({
      ...draft,

      lawnMeasured:
        draft.lawnSizeSquareMetres >
        0,

      calculatedTreatmentPrice:
        result.calculatedPrice,

      quotedTreatmentPrice:
        result.finalPrice,

      minimumPriceApplied:
        result.minimumPriceApplied,

      quoteStatus:
        draft.quoteStatus ===
        "Not Prepared"
          ? "Draft"
          : draft.quoteStatus,

      status:
        draft.status ===
          "New Enquiry" ||
        draft.status ===
          "Visit Arranged"
          ? "Quote Prepared"
          : draft.status,

      quoteDate:
        draft.quoteDate ||
        todayDate(),

      quoteExpiryDate:
        draft.quoteExpiryDate ||
        addDaysToDate(
          todayDate(),
          30,
        ),
    });

    showMessage(
      `Quotation calculated at £${result.finalPrice.toFixed(
        2,
      )}.`,
    );
  }

  async function markQuotePresented() {
    if (!draft) {
      return;
    }

    if (
      !Number.isFinite(
        draft.lawnSizeSquareMetres,
      ) ||
      draft.lawnSizeSquareMetres <= 0
    ) {
      showMessage(
        "Enter the measured lawn size before marking the quote as presented.",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(
        draft.quotedTreatmentPrice,
      ) ||
      draft.quotedTreatmentPrice <= 0
    ) {
      showMessage(
        "Calculate or enter a treatment price before marking the quote as presented.",
        "error",
      );
      return;
    }

    const quoteDate =
      draft.quoteDate || todayDate();

    const quoteExpiryDate =
      draft.quoteExpiryDate ||
      addDaysToDate(quoteDate, 30);

    if (quoteExpiryDate < quoteDate) {
      showMessage(
        "The quote expiry date cannot be earlier than the quote date.",
        "error",
      );
      return;
    }

    const updatedEnquiry: EnquiryRecord = {
      ...draft,
      status: "Quote Prepared",
      quoteStatus: "Presented",
      quoteDate,
      quoteExpiryDate,
    };

    await persistEnquiry(
      updatedEnquiry,
      "Quote marked as presented and all enquiry changes saved.",
    );
  }

  async function markQuoteAccepted() {
    if (!draft) {
      return;
    }

    if (
      !Number.isFinite(
        draft.lawnSizeSquareMetres,
      ) ||
      draft.lawnSizeSquareMetres <= 0
    ) {
      showMessage(
        "Enter the measured lawn size before accepting the quote.",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(
        draft.quotedTreatmentPrice,
      ) ||
      draft.quotedTreatmentPrice <= 0
    ) {
      showMessage(
        "Calculate or enter a treatment price before accepting the quote.",
        "error",
      );
      return;
    }

    const quoteDate =
      draft.quoteDate || todayDate();

    const quoteExpiryDate =
      draft.quoteExpiryDate ||
      addDaysToDate(quoteDate, 30);

    if (quoteExpiryDate < quoteDate) {
      showMessage(
        "The quote expiry date cannot be earlier than the quote date.",
        "error",
      );
      return;
    }

    const updatedEnquiry: EnquiryRecord = {
      ...draft,
      status: "Quote Accepted",
      quoteStatus: "Accepted",
      quoteDate,
      quoteExpiryDate,
    };

    await persistEnquiry(
      updatedEnquiry,
      "Quote marked as accepted and all enquiry changes saved. The enquiry is ready for conversion.",
    );
  }

  async function markQuoteDeclined() {
    if (!draft) {
      return;
    }

    const updatedEnquiry: EnquiryRecord = {
      ...draft,
      status: "Quote Declined",
      quoteStatus: "Declined",
    };

    await persistEnquiry(
      updatedEnquiry,
      "Quote marked as declined and all enquiry changes saved.",
    );
  }

  async function convertAcceptedEnquiry() {
    if (!draft) {
      showMessage(
        "Select an enquiry first.",
        "error",
      );
      return;
    }

    if (
      draft.status !==
        "Quote Accepted" ||
      draft.quoteStatus !==
        "Accepted"
    ) {
      showMessage(
        "The quotation must be accepted before conversion.",
        "error",
      );
      return;
    }

    if (
      draft.convertedCustomerNumber
    ) {
      showMessage(
        `This enquiry has already been converted into customer ${draft.convertedCustomerNumber}.`,
        "error",
      );
      return;
    }

    if (!draft.fullName.trim()) {
      showMessage(
        "Enter the customer name before converting.",
        "error",
      );
      return;
    }

    if (!draft.address.trim()) {
      showMessage(
        "Enter the customer address before converting.",
        "error",
      );
      return;
    }

    const postcode =
      draft.postcode
        .trim()
        .toUpperCase();

    const emailAddress =
      draft.emailAddress.trim();

    const mobilePhone =
      draft.mobilePhone.trim();

    const homePhone =
      draft.homePhone.trim();

    if (!postcode) {
      showMessage(
        "Enter the customer postcode before converting.",
        "error",
      );
      return;
    }

    if (
      emailAddress &&
      !isValidEmailAddress(
        emailAddress,
      )
    ) {
      showMessage(
        "Enter a valid email address or leave the email field blank.",
        "error",
      );
      return;
    }

    if (
      !emailAddress &&
      !mobilePhone &&
      !homePhone
    ) {
      showMessage(
        "Enter at least one contact method before converting: email, mobile phone or home phone.",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(
        draft.suggestedGroupNumber,
      ) ||
      !Number.isInteger(
        draft.suggestedGroupNumber,
      ) ||
      draft.suggestedGroupNumber < 1
    ) {
      showMessage(
        "Choose a valid positive whole-number group before converting.",
        "error",
      );
      return;
    }

    const conversionVehicle =
      vehicles.find(
        (vehicle) =>
          vehicle.number ===
          draft.suggestedVanNumber,
      );

    if (
      !conversionVehicle ||
      !conversionVehicle.active
    ) {
      showMessage(
        "Choose an active fleet vehicle before converting the enquiry.",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(
        draft.lawnSizeSquareMetres,
      ) ||
      draft.lawnSizeSquareMetres <= 0
    ) {
      showMessage(
        "Record the measured lawn size before converting.",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(
        draft.quotedTreatmentPrice,
      ) ||
      draft.quotedTreatmentPrice <= 0
    ) {
      showMessage(
        "Calculate or enter the treatment price before converting.",
        "error",
      );
      return;
    }

    if (
      generateProgramme &&
      (
        !Number.isFinite(
          programmeYear,
        ) ||
        !Number.isInteger(
          programmeYear,
        ) ||
        programmeYear < 2020 ||
        programmeYear > 2100
      )
    ) {
      showMessage(
        "Choose a valid programme year between 2020 and 2100.",
        "error",
      );
      return;
    }

    if (
      generateProgramme &&
      !programmeStartDate
    ) {
      showMessage(
        "Choose the first treatment date.",
        "error",
      );
      return;
    }

    if (
      generateProgramme &&
      (
        !isDateInputValue(
          programmeStartDate,
        ) ||
        Number(
          programmeStartDate.slice(
            0,
            4,
          ),
        ) !== programmeYear
      )
    ) {
      showMessage(
        "The first treatment date must fall within the selected programme year.",
        "error",
      );
      return;
    }

    const currentEnquiry =
      getEnquiryById(
        draft.id,
      );

    if (!currentEnquiry) {
      showMessage(
        "This enquiry is no longer available. No customer has been created.",
        "error",
      );
      return;
    }

    if (
      currentEnquiry.convertedCustomerNumber
    ) {
      showMessage(
        `This enquiry has already been converted into customer ${currentEnquiry.convertedCustomerNumber}.`,
        "error",
      );
      return;
    }

    const programmePreviewVisits =
      generateProgramme
        ? buildCustomerProgrammeVisits(
            "pending",
            programmeYear,
            programmeStartDate,
          )
        : [];

    if (
      generateProgramme &&
      programmePreviewVisits.length === 0
    ) {
      showMessage(
        "No treatment visits could be created for the selected programme year and start date.",
        "error",
      );
      return;
    }

    let customerNumber: string;

    try {
      customerNumber =
        await allocateCustomerNumber();
    } catch (error) {
      showMessage(
        error instanceof Error &&
          error.message.trim()
          ? error.message
          : "Unable to allocate a customer number from PostgreSQL.",
        "error",
      );
      return;
    }

    const programmeVisits =
      generateProgramme
        ? buildCustomerProgrammeVisits(
            customerNumber,
            programmeYear,
            programmeStartDate,
          )
        : [];

    const firstProgrammeVisit =
      programmeVisits[0];

    const newCustomer = {
      ...demoCustomers[0],

      customerNumber,

      title:
        draft.title.trim(),

      firstName:
        draft.firstName.trim(),

      surname:
        draft.surname.trim(),

      fullName: [
        draft.title,
        draft.firstName,
        draft.surname,
      ]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(" "),

      address:
        draft.address.trim(),

      postcode,

      email:
        emailAddress,

      homePhone,

      mobilePhone,

      groupNumber:
        draft.suggestedGroupNumber,

      vanNumber:
        draft.suggestedVanNumber,

      lawnSize:
        draft.lawnSizeSquareMetres,

      lawnAreas:
        draft.lawnAreas.map(
          (lawnArea, index) => ({
            id: lawnArea.id,
            name: lawnArea.name.trim(),
            areaSquareMetres:
              lawnArea.areaSquareMetres,
            displayOrder: index,
          }),
        ),

      treatmentPrice:
        draft.quotedTreatmentPrice,

      status: "Active" as const,

      lastVisit:
        draft
          .treatmentStartedImmediately
          ? formatDisplayDate(
              todayDate(),
            )
          : "Not yet visited",

      nextVisit:
        firstProgrammeVisit
          ? formatDisplayDate(
              firstProgrammeVisit
                .scheduledDate,
            )
          : "Not yet scheduled",

      lockedGate: false,

      dogOnProperty: false,

      notes: [
        draft.internalNotes.trim(),

        draft.extraWorkRequired
          ? `Future extra work: ${draft.extraWorkDescription.trim()}${
              draft
                .preferredExtraWorkSeason
                ? ` Preferred season: ${draft.preferredExtraWorkSeason}.`
                : ""
            }`
          : "",

        `Converted from ${draft.enquiryNumber}.`,
      ]
        .filter(Boolean)
        .join("\n"),
    };

    const result =
      await addCustomer(newCustomer);

    if (!result.success) {
      showMessage(
        result.message,
        "error",
      );
      return;
    }

    if (
      generateProgramme &&
      programmeVisits.length > 0
    ) {
      const programme: CustomerProgramme =
        {
          id: `programme-${customerNumber}-${programmeYear}`,

          customerNumber,

          year: programmeYear,

          createdAt:
            new Date().toISOString(),

          programmeName:
            "Standard annual programme",

          startDate:
            programmeStartDate,

          avoidWednesdays: true,

          avoidWeekends: true,

          visits: programmeVisits,
        };

      const programmeResult =
        await saveProgramme(
          programme,
        );

      if (!programmeResult.success) {
        /*
         * The customer already exists at this point.
         * Continue marking the enquiry as converted so
         * the same enquiry cannot create a second customer.
         * Surface the programme problem after conversion.
         */
        showMessage(
          `${programmeResult.message} Customer ${customerNumber} has still been created and the enquiry will be marked as converted.`,
          "error",
        );
      }
    }

    const convertedDraft: EnquiryRecord =
      {
        ...draft,

        title:
          draft.title.trim(),

        firstName:
          draft.firstName.trim(),

        surname:
          draft.surname.trim(),

        fullName: [
          draft.title,
          draft.firstName,
          draft.surname,
        ]
          .map((part) => part.trim())
          .filter(Boolean)
          .join(" "),

        address:
          draft.address.trim(),

        postcode:
          draft.postcode
            .trim()
            .toUpperCase(),

        emailAddress:
          draft.emailAddress.trim(),

        homePhone:
          draft.homePhone.trim(),

        mobilePhone:
          draft.mobilePhone.trim(),

        referredBy:
          draft.referredBy.trim(),

        initialMessage:
          draft.initialMessage.trim(),

        internalNotes:
          draft.internalNotes.trim(),

        quoteNotes:
          draft.quoteNotes.trim(),

        extraWorkDescription:
          draft.extraWorkDescription.trim(),

        status:
          "Converted to Customer",

        quoteStatus: "Accepted",

        convertedCustomerNumber:
          customerNumber,

        convertedAt:
          new Date().toISOString(),
      };

    const conversionSaveResult =
      await updateEnquiry(
        convertedDraft,
      );

    if (!conversionSaveResult.success) {
      const fallbackResult =
        await markConverted(
          draft.id,
          customerNumber,
        );

      /*
       * Keep the local draft converted even if the
       * detailed enquiry update failed. The customer
       * already exists, so presenting the conversion
       * button again could create a duplicate customer.
       */
      setDraft(convertedDraft);

      if (!fallbackResult.success) {
        showMessage(
          `Customer ${customerNumber} was created, but GreenFlow could not save the enquiry conversion status. Do not convert this enquiry again until the record is checked. ${conversionSaveResult.message}`,
          "error",
        );
        return;
      }

      showMessage(
        `Customer ${customerNumber} was created and the enquiry was marked as converted, but some latest enquiry edits could not be saved. ${conversionSaveResult.message}`,
        "error",
      );
      return;
    }

    setDraft(convertedDraft);

    if (
      generateProgramme &&
      programmeVisits.length > 0
    ) {
      showMessage(
        `${draft.fullName} is now customer ${customerNumber}. ${programmeVisits.length} programme visits were created.`,
      );

      return;
    }

    showMessage(
      `${draft.fullName} is now customer ${customerNumber}.`,
    );
  }

  function emailQuote() {
    if (!draft) {
      showMessage(
        "Select an enquiry first.",
        "error",
      );
      return;
    }

    const emailAddress =
      draft.emailAddress.trim();

    if (
      !emailAddress ||
      !isValidEmailAddress(emailAddress)
    ) {
      showMessage(
        "Enter a valid email address before opening the quotation email.",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(
        draft.quotedTreatmentPrice,
      ) ||
      draft.quotedTreatmentPrice <= 0
    ) {
      showMessage(
        "Prepare the quotation before opening the quotation email.",
        "error",
      );
      return;
    }

    const customerName =
      draft.fullName.trim() ||
      "Customer";

    const subject =
      `Lawn Care Quotation - Sharpes Lawn Care - ${draft.enquiryNumber}`;

    const body = [
      `Dear ${customerName},`,
      "",
      "Thank you for the opportunity to provide a quotation for your lawn care.",
      "",
      `Your quotation reference is ${draft.enquiryNumber} and the quoted price is £${draft.quotedTreatmentPrice.toFixed(2)} per standard treatment visit.`,
      "",
      "Please find your quotation attached. You can review the quotation and contact us if you would like to proceed or discuss any aspect of it.",
      "",
      "Kind regards,",
      "Sharpes Lawn Care",
    ].join("\n");

    window.location.href =
      `mailto:${encodeURIComponent(emailAddress)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function removeSelectedEnquiry() {
    if (!draft) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${draft.enquiryNumber} for ${
        draft.fullName ||
        "this enquiry"
      }?`,
    );

    if (!confirmed) {
      return;
    }

    const result =
      await deleteEnquiry(draft.id);

    if (!result.success) {
      showMessage(
        result.message,
        "error",
      );
      return;
    }

    const remaining =
      enquiries.filter(
        (enquiry) =>
          enquiry.id !== draft.id,
      );

    setDraft(
      remaining[0]
        ? {
            ...remaining[0],
          }
        : null,
    );

    showMessage(
      result.message,
    );
  }

  function showMessage(
    text: string,
    tone: MessageTone = "success",
  ) {
    setMessage(text);
    setMessageTone(tone);

    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  const ready =
    enquiriesReady &&
    customersReady &&
    programmesReady &&
    fleetReady;

  if (!ready) {
    return (
      <AppShell>
        <main
          className="gf-page"
          style={
            {
              "--gf-page-accent": "#475569",
            } as CSSProperties
          }
        >
          <div className="gf-page-inner">
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              Loading enquiries...
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main
        className="gf-page"
        style={
          {
            "--gf-page-accent": "#475569",
          } as CSSProperties
        }
      >
        <div className="gf-page-inner">
          <header className="gf-page-header">
            <div className="gf-page-header-copy">
              <div className="gf-eyebrow">
                New Business
              </div>
              <h1 className="gf-h1">
                Enquiries & Quotes
              </h1>
              <p className="gf-page-description">
                Take a new enquiry from first contact through site visit and quotation, then convert accepted work into a customer account.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                ← Dashboard
              </Link>
              <button
                type="button"
                onClick={createNewEnquiry}
                className="inline-flex h-11 items-center rounded-xl bg-[#176b37] px-5 text-sm font-bold text-white hover:bg-[#125b2f]"
              >
                + New Enquiry
              </button>
            </div>
          </header>

          {message && (
            <div
              role={messageTone === "error" ? "alert" : "status"}
              className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                messageTone === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-green-200 bg-green-50 text-green-800"
              }`}
            >
              {message}
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="New Enquiries"
              value={String(newCount)}
              detail="Need first contact or next step"
            />

            <SummaryCard
              label="Visits Arranged"
              value={String(
                visitsArrangedCount,
              )}
              detail="Site visits booked"
            />

            <SummaryCard
              label="Quotes Outstanding"
              value={String(
                quotesOutstandingCount,
              )}
              detail="Draft or awaiting a decision"
              warning={
                quotesOutstandingCount >
                0
              }
            />

            <SummaryCard
              label="Accepted"
              value={String(
                acceptedCount,
              )}
              detail="Accepted and ready to convert"
            />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr]">
            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 border-b border-slate-200 pb-4">
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#176b37]">
                  Enquiry List
                </div>
                <h2 className="gf-h2 mt-1">
                  Find an Enquiry
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search or filter the pipeline, then open an enquiry to continue from its current stage.
                </p>
              </div>
              <Field label="Search Enquiries">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Name, address, postcode or number"
                  className={inputClass}
                />
              </Field>

              <div className="mt-3">
                <Field label="Status">
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target
                          .value as StatusFilter,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="All">
                      All Statuses
                    </option>

                    {enquiryStatuses.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
              </div>

              <div className="mt-4 space-y-2">
                {filteredEnquiries.length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                    No enquiries match
                    the current filter.
                  </div>
                ) : (
                  filteredEnquiries.map(
                    (enquiry) => {
                      const isSelected =
                        draft?.id ===
                        enquiry.id;

                      return (
                        <button
                          key={enquiry.id}
                          type="button"
                          onClick={() =>
                            selectEnquiry(
                              enquiry,
                            )
                          }
                          className={`w-full rounded-xl border p-4 text-left transition ${
                            isSelected
                              ? "border-[#338b45] bg-green-50"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-bold">
                                {enquiry.fullName ||
                                  "Unnamed enquiry"}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {
                                  enquiry.enquiryNumber
                                }{" "}
                                ·{" "}
                                {
                                  enquiry.source
                                }
                              </div>
                            </div>

                            <StatusBadge
                              status={
                                enquiry.status
                              }
                            />
                          </div>

                          <div className="mt-3 text-sm text-slate-600">
                            {enquiry.address ||
                              "Address not recorded"}
                          </div>

                          <div className="mt-3 flex items-end justify-between gap-3">
                            <div className="text-xs text-slate-500">
                              Updated
                              <div className="font-semibold text-slate-700">
                                {formatDateTime(
                                  enquiry.updatedAt,
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs text-slate-500">
                                Quote
                              </div>

                              <div className="font-bold">
                                {enquiry.quotedTreatmentPrice >
                                0
                                  ? `£${enquiry.quotedTreatmentPrice.toFixed(
                                      2,
                                    )}`
                                  : "Not prepared"}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    },
                  )
                )}
              </div>
            </aside>

            <section className="min-w-0">
              {!selectedEnquiry ? (
                <article className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                  <h2 className="text-xl font-bold">
                    Select or create an
                    enquiry
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Choose an enquiry from
                    the left, or create a
                    new one to begin.
                  </p>
                </article>
              ) : (
                <form
                  onSubmit={saveEnquiry}
                  className="space-y-4"
                >
                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-2xl font-bold">
                            {selectedEnquiry.fullName ||
                              "New enquiry"}
                          </h2>

                          <StatusBadge
                            status={
                              selectedEnquiry.status
                            }
                          />
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {
                            selectedEnquiry.enquiryNumber
                          }{" "}
                          · Created{" "}
                          {formatDateTime(
                            selectedEnquiry.createdAt,
                          )}
                        </p>
                      </div>

                     <div className="flex flex-wrap gap-2">
  <button
    type="button"
    onClick={arrangeVisit}
    className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100"
  >
    Arrange Visit
  </button>

  <Link
    href={`/quotes/${selectedEnquiry.id}`}
    className="rounded-xl border border-[#338b45] bg-white px-4 py-2.5 text-sm font-semibold text-[#176b37] hover:bg-green-50"
  >
    View Quotation
  </Link>

  <button
    type="submit"
    className="rounded-xl bg-[#176b37] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
  >
    Save Enquiry
  </button>
</div> 
                    </div>
                  </article>

                  <section>
                    <div className="grid items-start gap-3 xl:grid-cols-2">
                      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <SectionHeading
                          title="1. Contact & Enquiry Details"
                          description="Record the prospective customer's contact details, how they found you and what they require."
                        />

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                          <Field label="Title">
                            <select
                              value={selectedEnquiry.title}
                              onChange={(event) =>
                                updateDraft(
                                  "title",
                                  event.target.value,
                                )
                              }
                              className={inputClass}
                              aria-label="Title"
                            >
                              <option value="">Select Title</option>
                              <option value="Mr">Mr</option>
                              <option value="Mrs">Mrs</option>
                              <option value="Mr & Mrs">Mr & Mrs</option>
                              <option value="Ms">Ms</option>
                              <option value="Dr">Dr</option>
                              <option value="c/o">c/o</option>
                            </select>
                          </Field>

                          <Field label="First Name">
                            <input
                              value={selectedEnquiry.firstName}
                              onChange={(event) =>
                                updateDraft(
                                  "firstName",
                                  event.target.value,
                                )
                              }
                              className={inputClass}
                            />
                          </Field>

                          <Field label="Surname">
                            <input
                              value={selectedEnquiry.surname}
                              onChange={(event) =>
                                updateDraft(
                                  "surname",
                                  event.target.value,
                                )
                              }
                              className={inputClass}
                            />
                          </Field>

                          <div className="sm:col-span-2 2xl:col-span-3">
                            <Field label="Full Name">
                              <input
                                value={selectedEnquiry.fullName}
                                readOnly
                                className={`${inputClass} bg-slate-50 text-slate-700`}
                              />
                            </Field>
                          </div>

                          <div className="sm:col-span-2 2xl:col-span-3">
                            <Field label="Email Address">
                              <input
                                type="email"
                                value={selectedEnquiry.emailAddress}
                                onChange={(event) =>
                                  updateDraft(
                                    "emailAddress",
                                    event.target.value,
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>
                          </div>

                          <div className="sm:col-span-2 2xl:col-span-3">
                            <Field label="Address">
                              <input
                                value={selectedEnquiry.address}
                                onChange={(event) =>
                                  updateDraft(
                                    "address",
                                    event.target.value,
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>
                          </div>

                          <Field label="Postcode">
                            <input
                              value={selectedEnquiry.postcode}
                              onChange={(event) =>
                                updateDraft(
                                  "postcode",
                                  event.target.value.toUpperCase(),
                                )
                              }
                              className={inputClass}
                            />
                          </Field>

                          <Field label="Mobile Phone">
                            <input
                              value={selectedEnquiry.mobilePhone}
                              onChange={(event) =>
                                updateDraft(
                                  "mobilePhone",
                                  event.target.value,
                                )
                              }
                              className={inputClass}
                            />
                          </Field>

                          <Field label="Home Phone">
                            <input
                              value={selectedEnquiry.homePhone}
                              onChange={(event) =>
                                updateDraft(
                                  "homePhone",
                                  event.target.value,
                                )
                              }
                              className={inputClass}
                            />
                          </Field>

                          <div className="sm:col-span-2 2xl:col-span-3 border-t border-slate-200 pt-3">
                            <div className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#176b37]">
                              Enquiry Details
                            </div>
                          </div>

                          <Field label="Enquiry Source">
                            <select
                              value={selectedEnquiry.source}
                              onChange={(event) =>
                                updateDraft(
                                  "source",
                                  event.target.value as EnquirySource,
                                )
                              }
                              className={inputClass}
                            >
                              {enquirySources.map(
                                (source) => (
                                  <option
                                    key={source}
                                    value={source}
                                  >
                                    {source}
                                  </option>
                                ),
                              )}
                            </select>
                          </Field>

                          <Field label="Recommended By">
                            <input
                              value={selectedEnquiry.referredBy}
                              onChange={(event) =>
                                updateDraft(
                                  "referredBy",
                                  event.target.value,
                                )
                              }
                              disabled={
                                selectedEnquiry.source !==
                                "Recommendation"
                              }
                              placeholder="Existing customer name"
                              className={inputClass}
                            />
                          </Field>

                          <div className="sm:col-span-2 2xl:col-span-3">
                            <Field label="Initial Message / What They Require">
                              <textarea
                                rows={3}
                                value={selectedEnquiry.initialMessage}
                                onChange={(event) =>
                                  updateDraft(
                                    "initialMessage",
                                    event.target.value,
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>
                          </div>
                        </div>
                      </article>

                      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <SectionHeading
                          title="2. Quotation"
                          description="Calculate the treatment price, prepare the customer quotation and record the decision."
                        />

                        <div className="mt-4 space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                            <Field label="Quote Date">
                            <input
                              type="date"
                              value={selectedEnquiry.quoteDate}
                              onChange={(event) =>
                                updateDraft(
                                  "quoteDate",
                                  event.target.value,
                                )
                              }
                              className={inputClass}
                            />
                          </Field>

                            <Field label="Quote Expiry">
                            <input
                              type="date"
                              value={selectedEnquiry.quoteExpiryDate}
                              onChange={(event) =>
                                updateDraft(
                                  "quoteExpiryDate",
                                  event.target.value,
                                )
                              }
                              className={inputClass}
                            />
                          </Field>

                            <Field label="Total Area (m²)">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={
                                  selectedEnquiry.lawnSizeSquareMetres
                                }
                                onChange={(event) =>
                                  updateDraft(
                                    "lawnSizeSquareMetres",
                                    Number(
                                      event.target.value,
                                    ),
                                  )
                                }
                                readOnly={
                                  selectedEnquiry.lawnAreas
                                    .length > 0
                                }
                                className={`${inputClass} ${
                                  selectedEnquiry.lawnAreas
                                    .length > 0
                                    ? "bg-slate-50 text-slate-700"
                                    : ""
                                }`}
                              />
                            </Field>

                            <Field label="Price Per m²">
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={selectedEnquiry.pricePerSquareMetre}
                              onChange={(event) =>
                                updateDraft(
                                  "pricePerSquareMetre",
                                  Number(event.target.value),
                                )
                              }
                              className={inputClass}
                            />
                          </Field>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-bold text-slate-900">
                                  Lawn Measurements
                                </div>
                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                  Record individual lawns when useful. Their areas are added together automatically for the quotation.
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={addLawnArea}
                                className="rounded-xl border border-[#338b45] bg-white px-3 py-2 text-sm font-semibold text-[#176b37] hover:bg-green-50"
                              >
                                + Add Lawn
                              </button>
                            </div>

                            {selectedEnquiry.lawnAreas.length >
                            0 ? (
                              <div className="mt-4 space-y-3">
                                {selectedEnquiry.lawnAreas.map(
                                  (lawnArea) => (
                                    <div
                                      key={lawnArea.id}
                                      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_150px_auto]"
                                    >
                                      <Field label="Lawn Name">
                                        <input
                                          value={
                                            lawnArea.name
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            updateLawnArea(
                                              lawnArea.id,
                                              "name",
                                              event.target
                                                .value,
                                            )
                                          }
                                          placeholder="e.g. Front Lawn"
                                          className={
                                            inputClass
                                          }
                                        />
                                      </Field>

                                      <Field label="Area (m²)">
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={
                                            lawnArea.areaSquareMetres
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            updateLawnArea(
                                              lawnArea.id,
                                              "areaSquareMetres",
                                              Number(
                                                event
                                                  .target
                                                  .value,
                                              ),
                                            )
                                          }
                                          className={
                                            inputClass
                                          }
                                        />
                                      </Field>

                                      <div className="flex items-end">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeLawnArea(
                                              lawnArea.id,
                                            )
                                          }
                                          className="h-11 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  ),
                                )}

                                <div className="flex justify-end border-t border-slate-200 pt-3">
                                  <div className="text-right">
                                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                      Total Lawn Area
                                    </div>
                                    <div className="mt-1 text-xl font-bold text-slate-900">
                                      {
                                        selectedEnquiry.lawnSizeSquareMetres
                                      }{" "}
                                      m²
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="mt-3 text-xs leading-5 text-slate-600">
                                No individual lawn breakdown has been recorded. The total lawn area above remains available for existing or historical records.
                              </p>
                            )}
                          </div>

                          <div className="grid items-end gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                            <button
                              type="button"
                              onClick={calculateCurrentQuote}
                              className="flex h-[124px] w-full items-center justify-center rounded-xl bg-[#176b37] px-4 py-4 text-center text-sm font-semibold text-white hover:bg-[#125b2f]"
                            >
                              Calculate Quote
                            </button>

                            <ResultBox
                              label="Calculated Price"
                              className="h-[124px]"
                              value={`£${selectedEnquiry.calculatedTreatmentPrice.toFixed(
                                2,
                              )}`}
                              detail="Lawn area × price per m²"
                            />

                            <ResultBox
                              label="Quoted Price for Customer"
                              className="h-[124px] !border-green-300 !bg-green-50"
                              value={`£${selectedEnquiry.quotedTreatmentPrice.toFixed(
                                2,
                              )}`}
                              detail={
                                selectedEnquiry.minimumPriceApplied
                                  ? "£18 minimum applied"
                                  : "Per standard treatment visit"
                              }
                              warning={
                                selectedEnquiry.minimumPriceApplied
                              }
                            />

                            <Field label="Override Final Quote">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={selectedEnquiry.quotedTreatmentPrice}
                              onChange={(event) =>
                                updateDraft(
                                  "quotedTreatmentPrice",
                                  Number(event.target.value),
                                )
                              }
                              className={inputClass}
                            />
                          </Field>
                          </div>

                          <div className="max-w-[220px]">
                            <Field label="Quote Status">
                            <select
                              value={selectedEnquiry.quoteStatus}
                              onChange={(event) =>
                                updateDraft(
                                  "quoteStatus",
                                  event.target.value as QuoteStatus,
                                )
                              }
                              className={inputClass}
                            >
                              {quoteStatuses.map(
                                (status) => (
                                  <option
                                    key={status}
                                    value={status}
                                  >
                                    {status}
                                  </option>
                                ),
                              )}
                            </select>
                          </Field>
                          </div>

                          <Field label="Quote Notes">
                              <textarea
                                rows={3}
                                value={selectedEnquiry.quoteNotes}
                                onChange={(event) =>
                                  updateDraft(
                                    "quoteNotes",
                                    event.target.value,
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>
                        </div>

                        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
                          <div className="text-sm font-bold text-green-900">
                            Customer Quotation
                          </div>
                          <p className="mt-1 text-xs leading-5 text-green-800">
                            View the finished quotation to print or save it as a PDF. Email Quote opens your email application with the customer's address, subject and message prepared; attach the saved quotation PDF before sending.
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              href={`/quotes/${selectedEnquiry.id}`}
                              className="rounded-xl border border-[#338b45] bg-white px-4 py-2.5 text-sm font-semibold text-[#176b37] hover:bg-green-50"
                            >
                              View Quotation
                            </Link>

                            <button
                              type="button"
                              onClick={emailQuote}
                              className="rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
                            >
                              Email Quote
                            </button>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-5">
                          <button
                            type="button"
                            onClick={markQuotePresented}
                            className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100"
                          >
                            Mark Presented
                          </button>

                          <button
                            type="button"
                            onClick={markQuoteAccepted}
                            className="rounded-xl border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100"
                          >
                            Mark Accepted
                          </button>

                          <button
                            type="button"
                            onClick={markQuoteDeclined}
                            className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                          >
                            Mark Declined
                          </button>
                        </div>
                      
                      </article>

                      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <SectionHeading
                          title="3. Site Visit"
                          description="Arrange the visit, record the lawn measurement and note whether treatment began immediately."
                        />

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                          <Field label="Site Visit Date">
                            <input
                              type="date"
                              value={selectedEnquiry.siteVisitDate}
                              onChange={(event) =>
                                updateDraft(
                                  "siteVisitDate",
                                  event.target.value,
                                )
                              }
                              className={inputClass}
                            />
                          </Field>

                          <Field label="Site Visit Time">
                            <input
                              type="time"
                              value={selectedEnquiry.siteVisitTime}
                              onChange={(event) =>
                                updateDraft(
                                  "siteVisitTime",
                                  event.target.value,
                                )
                              }
                              className={inputClass}
                            />
                          </Field>

                          

                          <Field label="Enquiry Status">
                            <select
                              value={selectedEnquiry.status}
                              onChange={(event) =>
                                updateDraft(
                                  "status",
                                  event.target.value as EnquiryStatus,
                                )
                              }
                              className={inputClass}
                            >
                              {enquiryStatuses.map(
                                (status) => (
                                  <option
                                    key={status}
                                    value={status}
                                  >
                                    {status}
                                  </option>
                                ),
                              )}
                            </select>
                          </Field>

                          <ToggleField
                            label="Lawn Measured"
                            description="Confirm that the lawn measurement is complete."
                            checked={selectedEnquiry.lawnMeasured}
                            onChange={(checked) =>
                              updateDraft(
                                "lawnMeasured",
                                checked,
                              )
                            }
                          />

                          <ToggleField
                            label="Treatment Started Immediately"
                            description="Use when the first treatment was completed during the quotation visit."
                            checked={
                              selectedEnquiry.treatmentStartedImmediately
                            }
                            onChange={(checked) =>
                              updateDraft(
                                "treatmentStartedImmediately",
                                checked,
                              )
                            }
                          />
                        </div>
                      </article>

                      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <SectionHeading
                          title="4. Customer Setup"
                          description="Prepare the route allocation and any future extra work before conversion."
                        />

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <Field label="Suggested Group">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={selectedEnquiry.suggestedGroupNumber}
                              onChange={(event) =>
                                updateDraft(
                                  "suggestedGroupNumber",
                                  Number(event.target.value),
                                )
                              }
                              className={inputClass}
                            />
                          </Field>

                          <Field label="Suggested Van">
                            <select
                              value={selectedEnquiry.suggestedVanNumber}
                              onChange={(event) =>
                                updateDraft(
                                  "suggestedVanNumber",
                                  Number(event.target.value),
                                )
                              }
                              className={inputClass}
                            >
                              {!activeVehicles.some(
                                (vehicle) =>
                                  vehicle.number ===
                                  selectedEnquiry.suggestedVanNumber,
                              ) && (
                                <option
                                  value={
                                    selectedEnquiry.suggestedVanNumber
                                  }
                                  disabled
                                >
                                  Van {selectedEnquiry.suggestedVanNumber} — inactive/missing
                                </option>
                              )}

                              {activeVehicles.map(
                                (vehicle) => (
                                  <option
                                    key={vehicle.id}
                                    value={vehicle.number}
                                  >
                                    {vehicle.name}
                                  </option>
                                ),
                              )}
                            </select>
                          </Field>

                          <Field label="Preferred Season">
                            <select
                              value={
                                selectedEnquiry.preferredExtraWorkSeason
                              }
                              onChange={(event) =>
                                updateDraft(
                                  "preferredExtraWorkSeason",
                                  event.target.value,
                                )
                              }
                              disabled={
                                !selectedEnquiry.extraWorkRequired
                              }
                              className={inputClass}
                            >
                              <option value="">
                                Not selected
                              </option>
                              <option value="Spring">
                                Spring
                              </option>
                              <option value="Summer">
                                Summer
                              </option>
                              <option value="Autumn">
                                Autumn
                              </option>
                              <option value="Winter">
                                Winter
                              </option>
                            </select>
                          </Field>
                        </div>

                        <div className="mt-3 grid gap-3">
                          <div className="sm:col-span-2 2xl:col-span-3">
                            <ToggleField
                              label="Extra Work Required"
                              description="Record scarification, aeration, overseeding or other future work."
                              checked={
                                selectedEnquiry.extraWorkRequired
                              }
                              onChange={(checked) =>
                                updateDraft(
                                  "extraWorkRequired",
                                  checked,
                                )
                              }
                            />
                          </div>

                          <div className="sm:col-span-2 2xl:col-span-3">
                            <Field label="Work Description">
                              <textarea
                                rows={3}
                                value={selectedEnquiry.extraWorkDescription}
                                onChange={(event) =>
                                  updateDraft(
                                    "extraWorkDescription",
                                    event.target.value,
                                  )
                                }
                                disabled={
                                  !selectedEnquiry.extraWorkRequired
                                }
                                className={inputClass}
                              />
                            </Field>
                          </div>
                        </div>
                      </article>

                      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <SectionHeading
                          title="5. Internal Notes"
                          description="Private notes for Sharpes Lawn Care. These do not appear on the customer quotation."
                        />

                        <div className="mt-4">
                          <Field label="Internal Notes">
                            <textarea
                              rows={3}
                              value={selectedEnquiry.internalNotes}
                              onChange={(event) =>
                                updateDraft(
                                  "internalNotes",
                                  event.target.value,
                                )
                              }
                              className={inputClass}
                            />
                          </Field>
                        </div>
                      </article>

                      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <SectionHeading
                          title="6. Convert to Customer"
                          description="Once the quotation is accepted, create the customer account and optionally generate the annual programme."
                        />

                        <div className="mt-4">
                          {selectedEnquiry.status ===
                            "Quote Accepted" && (
                            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                              <div className="font-bold text-green-900">
                                Ready to Become a Customer
                              </div>

                              <p className="mt-2 text-sm leading-6 text-green-800">
                                GreenFlow will create the customer record and can also create the remaining annual programme.
                              </p>

                              <ToggleField
                                label="Generate Annual Programme"
                                description="Create scheduled treatment visits automatically."
                                checked={generateProgramme}
                                onChange={setGenerateProgramme}
                              />

                              {generateProgramme && (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                  <Field label="Programme Year">
                                    <input
                                      type="number"
                                      min="2020"
                                      max="2100"
                                      value={programmeYear}
                                      onChange={(event) =>
                                        setProgrammeYear(
                                          Number(event.target.value),
                                        )
                                      }
                                      className={inputClass}
                                    />
                                  </Field>

                                  <Field label="First Treatment Date">
                                    <input
                                      type="date"
                                      value={programmeStartDate}
                                      onChange={(event) =>
                                        setProgrammeStartDate(
                                          event.target.value,
                                        )
                                      }
                                      className={inputClass}
                                    />
                                  </Field>

                                  <div className="rounded-xl border border-green-200 bg-white p-3 text-xs leading-5 text-green-800 sm:col-span-2">
                                    Visits are generated approximately 70 days apart. Wednesdays and weekends are avoided. Dates outside the selected year are not included.
                                  </div>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={convertAcceptedEnquiry}
                                className="mt-4 w-full rounded-xl bg-[#176b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
                              >
                                Convert to Customer
                              </button>
                            </div>
                          )}

                          {selectedEnquiry.status !==
                            "Quote Accepted" &&
                            selectedEnquiry.status !==
                              "Converted to Customer" && (
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                                Mark the quotation as accepted before converting this enquiry into a customer.
                              </div>
                            )}

                          {selectedEnquiry.status ===
                            "Converted to Customer" && (
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                              <div className="font-bold text-blue-900">
                                Customer Created
                              </div>

                              <p className="mt-2 text-sm text-blue-800">
                                This enquiry became customer{" "}
                                <strong>
                                  {
                                    selectedEnquiry.convertedCustomerNumber
                                  }
                                </strong>
                                .
                              </p>

                              <Link
                                href={`/customers/${selectedEnquiry.convertedCustomerNumber}`}
                                className="mt-4 inline-flex rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                              >
                                Open Customer Profile
                              </Link>
                            </div>
                          )}
                        </div>
                      </article>
                    </div>
                  </section>

                  <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <button
                      type="button"
                      onClick={
                        removeSelectedEnquiry
                      }
                      className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      Delete Enquiry
                    </button>

                    <button
                      type="submit"
                      className="rounded-xl bg-[#176b37] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#125b2f]"
                    >
                      Save All Changes
                    </button>
                  </section>
                </form>
              )}
            </section>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function isValidEmailAddress(
  value: string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

function isDateInputValue(
  value: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const date =
    parseDateValue(value);

  return (
    !Number.isNaN(
      date.getTime(),
    ) &&
    toDateInputValue(date) ===
      value
  );
}

function buildCustomerProgrammeVisits(
  customerNumber: string,
  programmeYear: number,
  firstTreatmentDate: string,
): ProgrammeVisit[] {
  if (!firstTreatmentDate) {
    return [];
  }

  const visits: ProgrammeVisit[] = [];

  let scheduledDate =
    parseDateValue(
      firstTreatmentDate,
    );

  for (
    let index = 0;
    index <
    standardTreatmentNames.length;
    index += 1
  ) {
    if (index > 0) {
      scheduledDate =
        addCalendarDays(
          scheduledDate,
          70,
        );
    }

    scheduledDate =
      moveToAvailableWorkingDay(
        scheduledDate,
      );

    if (
      scheduledDate.getFullYear() !==
      programmeYear
    ) {
      continue;
    }

    visits.push({
      id: `programme-visit-${customerNumber}-${programmeYear}-${index + 1}`,

      visitNumber:
        visits.length + 1,

      treatmentName:
        standardTreatmentNames[index],

      scheduledDate:
        toDateInputValue(
          scheduledDate,
        ),

      gapAfterPreviousDays:
        visits.length === 0
          ? 0
          : 70,

      status: "Scheduled",

      notes: "",
    });
  }

  return visits;
}

function moveToAvailableWorkingDay(
  date: Date,
) {
  let result = new Date(date);

  while (true) {
    const day = result.getDay();

    const isWednesday =
      day === 3;

    const isWeekend =
      day === 0 ||
      day === 6;

    if (
      !isWednesday &&
      !isWeekend
    ) {
      return result;
    }

    result = addCalendarDays(
      result,
      1,
    );
  }
}

function parseDateValue(
  value: string,
) {
  const [year, month, day] =
    value
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day,
  );
}

function addCalendarDays(
  date: Date,
  days: number,
) {
  const result = new Date(date);

  result.setDate(
    result.getDate() + days,
  );

  return result;
}

function toDateInputValue(
  date: Date,
) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function todayDate() {
  return toDateInputValue(
    new Date(),
  );
}

function formatDisplayDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(
    parseDateValue(value),
  );
}

function addDaysToDate(
  value: string,
  days: number,
) {
  return toDateInputValue(
    addCalendarDays(
      parseDateValue(value),
      days,
    ),
  );
}

function formatDateTime(
  value: string,
) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(
    new Date(value),
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus:border-[#338b45] focus:ring-4 focus:ring-green-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <div className="text-sm font-semibold">
          {label}
        </div>

        <div className="mt-1 text-xs text-slate-500">
          {description}
        </div>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked,
          )
        }
        className="h-5 w-5"
      />
    </label>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`mb-3 h-1.5 w-10 rounded-full ${
          warning
            ? "bg-amber-500"
            : "bg-[#338b45]"
        }`}
      />

      <div className="text-sm font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </article>
  );
}

function ResultBox({
  label,
  value,
  detail,
  warning = false,
  className = "",
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        warning
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-slate-50"
      } ${className}`}
    >
      <div className="text-xs font-semibold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {detail}
      </div>
    </div>
  );
}