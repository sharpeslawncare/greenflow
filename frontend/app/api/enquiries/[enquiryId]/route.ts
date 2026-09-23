import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_STATUSES = [
  "New Enquiry",
  "Visit Arranged",
  "Quote Prepared",
  "Quote Accepted",
  "Quote Declined",
  "Converted to Customer",
  "Closed",
] as const;

const ALLOWED_SOURCES = [
  "Recommendation",
  "Website",
  "Telephone",
  "Email",
  "Social Media",
  "Other",
] as const;

const ALLOWED_QUOTE_STATUSES = [
  "Not Prepared",
  "Draft",
  "Presented",
  "Accepted",
  "Declined",
] as const;

type RouteContext = {
  params: Promise<{
    enquiryId: string;
  }>;
};

async function getCurrentMembership() {
  const session = await auth();

  if (!session?.user?.email) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      ),
      membership: null,
    };
  }

  const membership = await prisma.membership.findFirst({
    where: {
      user: {
        email: session.user.email.toLowerCase(),
      },
    },
    select: {
      organisationId: true,
    },
  });

  if (!membership) {
    return {
      error: NextResponse.json(
        {
          error:
            "No GreenFlow organisation membership found.",
        },
        { status: 403 },
      ),
      membership: null,
    };
  }

  return {
    error: null,
    membership,
  };
}

function serializeEnquiry<
  T extends {
    pricePerSquareMetre: unknown;
    calculatedTreatmentPrice: unknown;
    quotedTreatmentPrice: unknown;
    createdAt: Date;
    updatedAt: Date;
  },
>(enquiry: T) {
  return {
    ...enquiry,

    pricePerSquareMetre:
      Number(enquiry.pricePerSquareMetre),

    calculatedTreatmentPrice:
      Number(
        enquiry.calculatedTreatmentPrice,
      ),

    quotedTreatmentPrice:
      Number(enquiry.quotedTreatmentPrice),

    createdAt:
      enquiry.createdAt.toISOString(),

    updatedAt:
      enquiry.updatedAt.toISOString(),
  };
}

function parseNonNegativeNumber(
  value: unknown,
) {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return null;
  }

  return number;
}

function parsePositiveInteger(
  value: unknown,
) {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    !Number.isInteger(number) ||
    number < 1
  ) {
    return null;
  }

  return number;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const { error, membership } =
    await getCurrentMembership();

  if (error || !membership) {
    return error;
  }

  const { enquiryId: rawEnquiryId } =
    await context.params;

  const enquiryId = decodeURIComponent(
    rawEnquiryId,
  ).trim();

  if (!enquiryId) {
    return NextResponse.json(
      { error: "Enquiry ID is required." },
      { status: 400 },
    );
  }

  const existingEnquiry =
    await prisma.enquiry.findFirst({
      where: {
        id: enquiryId,
        organisationId:
          membership.organisationId,
      },
    });

  if (!existingEnquiry) {
    return NextResponse.json(
      { error: "Enquiry not found." },
      { status: 404 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid JSON request body.",
      },
      { status: 400 },
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Invalid enquiry data." },
      { status: 400 },
    );
  }

  const data =
    body as Record<string, unknown>;

  const updateData: {
    enquiryNumber?: string;

    status?: string;
    source?: string;
    referredBy?: string;

    firstName?: string;
    surname?: string;
    fullName?: string;

    address?: string;
    postcode?: string;

    emailAddress?: string;
    homePhone?: string;
    mobilePhone?: string;

    initialMessage?: string;
    internalNotes?: string;

    siteVisitDate?: string;
    siteVisitTime?: string;

    lawnMeasured?: boolean;
    lawnSizeSquareMetres?: number;

    minimumPriceApplied?: boolean;
    pricePerSquareMetre?: number;
    calculatedTreatmentPrice?: number;
    quotedTreatmentPrice?: number;

    quoteStatus?: string;
    quoteDate?: string;
    quoteExpiryDate?: string;
    quoteNotes?: string;

    treatmentStartedImmediately?: boolean;

    suggestedGroupNumber?: number;
    suggestedVanNumber?: number;

    extraWorkRequired?: boolean;
    extraWorkDescription?: string;
    preferredExtraWorkSeason?: string;

    convertedCustomerNumber?: string;
    convertedAt?: string;
  } = {};

  if (data.enquiryNumber !== undefined) {
    if (
      typeof data.enquiryNumber !== "string" ||
      !data.enquiryNumber.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Enquiry number is required.",
        },
        { status: 400 },
      );
    }

    const enquiryNumber =
      data.enquiryNumber
        .trim()
        .toUpperCase();

    const numberCollision =
      await prisma.enquiry.findFirst({
        where: {
          organisationId:
            membership.organisationId,
          enquiryNumber,
          NOT: {
            id: existingEnquiry.id,
          },
        },
        select: {
          id: true,
        },
      });

    if (numberCollision) {
      return NextResponse.json(
        {
          error:
            "An enquiry with this enquiry number already exists.",
        },
        { status: 409 },
      );
    }

    updateData.enquiryNumber =
      enquiryNumber;
  }

  if (data.status !== undefined) {
    if (typeof data.status !== "string") {
      return NextResponse.json(
        {
          error:
            "Invalid enquiry status.",
        },
        { status: 400 },
      );
    }

    const status = data.status.trim();

    if (
      !ALLOWED_STATUSES.includes(
        status as (typeof ALLOWED_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid enquiry status.",
        },
        { status: 400 },
      );
    }

    updateData.status = status;
  }

  if (data.source !== undefined) {
    if (typeof data.source !== "string") {
      return NextResponse.json(
        {
          error:
            "Invalid enquiry source.",
        },
        { status: 400 },
      );
    }

    const source = data.source.trim();

    if (
      !ALLOWED_SOURCES.includes(
        source as (typeof ALLOWED_SOURCES)[number],
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid enquiry source.",
        },
        { status: 400 },
      );
    }

    updateData.source = source;
  }

  if (
    typeof data.referredBy === "string"
  ) {
    updateData.referredBy =
      data.referredBy.trim();
  }

  if (
    typeof data.firstName === "string"
  ) {
    updateData.firstName =
      data.firstName.trim();
  }

  if (
    typeof data.surname === "string"
  ) {
    updateData.surname =
      data.surname.trim();
  }

  if (
    typeof data.fullName === "string"
  ) {
    updateData.fullName =
      data.fullName.trim();
  }

  if (
    updateData.firstName !== undefined ||
    updateData.surname !== undefined
  ) {
    const firstName =
      updateData.firstName ??
      existingEnquiry.firstName;

    const surname =
      updateData.surname ??
      existingEnquiry.surname;

    if (
      updateData.fullName === undefined
    ) {
      updateData.fullName =
        `${firstName} ${surname}`.trim();
    }
  }

  if (typeof data.address === "string") {
    updateData.address =
      data.address.trim();
  }

  if (
    typeof data.postcode === "string"
  ) {
    updateData.postcode =
      data.postcode
        .trim()
        .toUpperCase();
  }

  if (
    typeof data.emailAddress === "string"
  ) {
    updateData.emailAddress =
      data.emailAddress.trim();
  }

  if (
    typeof data.homePhone === "string"
  ) {
    updateData.homePhone =
      data.homePhone.trim();
  }

  if (
    typeof data.mobilePhone === "string"
  ) {
    updateData.mobilePhone =
      data.mobilePhone.trim();
  }

  if (
    typeof data.initialMessage ===
    "string"
  ) {
    updateData.initialMessage =
      data.initialMessage.trim();
  }

  if (
    typeof data.internalNotes ===
    "string"
  ) {
    updateData.internalNotes =
      data.internalNotes.trim();
  }

  if (
    typeof data.siteVisitDate ===
    "string"
  ) {
    updateData.siteVisitDate =
      data.siteVisitDate.trim();
  }

  if (
    typeof data.siteVisitTime ===
    "string"
  ) {
    updateData.siteVisitTime =
      data.siteVisitTime.trim();
  }

  if (
    data.lawnMeasured !== undefined
  ) {
    if (
      typeof data.lawnMeasured !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "Lawn measured must be true or false.",
        },
        { status: 400 },
      );
    }

    updateData.lawnMeasured =
      data.lawnMeasured;
  }

  if (
    data.lawnSizeSquareMetres !==
    undefined
  ) {
    const value =
      parseNonNegativeNumber(
        data.lawnSizeSquareMetres,
      );

    if (
      value === null ||
      !Number.isInteger(value)
    ) {
      return NextResponse.json(
        {
          error:
            "Lawn size must be a valid non-negative whole number.",
        },
        { status: 400 },
      );
    }

    updateData.lawnSizeSquareMetres =
      value;
  }

  if (
    data.minimumPriceApplied !==
    undefined
  ) {
    if (
      typeof data.minimumPriceApplied !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "Minimum price applied must be true or false.",
        },
        { status: 400 },
      );
    }

    updateData.minimumPriceApplied =
      data.minimumPriceApplied;
  }

  if (
    data.pricePerSquareMetre !==
    undefined
  ) {
    const value =
      parseNonNegativeNumber(
        data.pricePerSquareMetre,
      );

    if (value === null) {
      return NextResponse.json(
        {
          error:
            "Price per square metre must be a valid non-negative number.",
        },
        { status: 400 },
      );
    }

    updateData.pricePerSquareMetre =
      value;
  }

  if (
    data.calculatedTreatmentPrice !==
    undefined
  ) {
    const value =
      parseNonNegativeNumber(
        data.calculatedTreatmentPrice,
      );

    if (value === null) {
      return NextResponse.json(
        {
          error:
            "Calculated treatment price must be a valid non-negative number.",
        },
        { status: 400 },
      );
    }

    updateData.calculatedTreatmentPrice =
      value;
  }

  if (
    data.quotedTreatmentPrice !==
    undefined
  ) {
    const value =
      parseNonNegativeNumber(
        data.quotedTreatmentPrice,
      );

    if (value === null) {
      return NextResponse.json(
        {
          error:
            "Quoted treatment price must be a valid non-negative number.",
        },
        { status: 400 },
      );
    }

    updateData.quotedTreatmentPrice =
      value;
  }

  if (
    data.quoteStatus !== undefined
  ) {
    if (
      typeof data.quoteStatus !==
      "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid quote status.",
        },
        { status: 400 },
      );
    }

    const quoteStatus =
      data.quoteStatus.trim();

    if (
      !ALLOWED_QUOTE_STATUSES.includes(
        quoteStatus as (typeof ALLOWED_QUOTE_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid quote status.",
        },
        { status: 400 },
      );
    }

    updateData.quoteStatus =
      quoteStatus;
  }

  if (
    typeof data.quoteDate === "string"
  ) {
    updateData.quoteDate =
      data.quoteDate.trim();
  }

  if (
    typeof data.quoteExpiryDate ===
    "string"
  ) {
    updateData.quoteExpiryDate =
      data.quoteExpiryDate.trim();
  }

  if (
    typeof data.quoteNotes === "string"
  ) {
    updateData.quoteNotes =
      data.quoteNotes.trim();
  }

  if (
    data.treatmentStartedImmediately !==
    undefined
  ) {
    if (
      typeof data.treatmentStartedImmediately !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "Treatment started immediately must be true or false.",
        },
        { status: 400 },
      );
    }

    updateData.treatmentStartedImmediately =
      data.treatmentStartedImmediately;
  }

  if (
    data.suggestedGroupNumber !==
    undefined
  ) {
    const value =
      parsePositiveInteger(
        data.suggestedGroupNumber,
      );

    if (value === null) {
      return NextResponse.json(
        {
          error:
            "Suggested group number must be a positive whole number.",
        },
        { status: 400 },
      );
    }

    updateData.suggestedGroupNumber =
      value;
  }

  if (
    data.suggestedVanNumber !==
    undefined
  ) {
    const value =
      parsePositiveInteger(
        data.suggestedVanNumber,
      );

    if (value === null) {
      return NextResponse.json(
        {
          error:
            "Suggested van number must be a positive whole number.",
        },
        { status: 400 },
      );
    }

    updateData.suggestedVanNumber =
      value;
  }

  if (
    data.extraWorkRequired !==
    undefined
  ) {
    if (
      typeof data.extraWorkRequired !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "Extra work required must be true or false.",
        },
        { status: 400 },
      );
    }

    updateData.extraWorkRequired =
      data.extraWorkRequired;
  }

  if (
    typeof data.extraWorkDescription ===
    "string"
  ) {
    updateData.extraWorkDescription =
      data.extraWorkDescription.trim();
  }

  if (
    typeof data.preferredExtraWorkSeason ===
    "string"
  ) {
    updateData.preferredExtraWorkSeason =
      data.preferredExtraWorkSeason.trim();
  }

  if (
    typeof data.convertedCustomerNumber ===
    "string"
  ) {
    updateData.convertedCustomerNumber =
      data.convertedCustomerNumber.trim();
  }

  if (
    typeof data.convertedAt === "string"
  ) {
    updateData.convertedAt =
      data.convertedAt.trim();
  }

  try {
    const enquiry =
      await prisma.enquiry.update({
        where: {
          id: existingEnquiry.id,
        },
        data: updateData,
      });

    return NextResponse.json({
      enquiry:
        serializeEnquiry(enquiry),
    });
  } catch (updateError) {
    console.error(
      "Failed to update GreenFlow enquiry:",
      updateError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to update enquiry.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  const { error, membership } =
    await getCurrentMembership();

  if (error || !membership) {
    return error;
  }

  const { enquiryId: rawEnquiryId } =
    await context.params;

  const enquiryId = decodeURIComponent(
    rawEnquiryId,
  ).trim();

  if (!enquiryId) {
    return NextResponse.json(
      { error: "Enquiry ID is required." },
      { status: 400 },
    );
  }

  const existingEnquiry =
    await prisma.enquiry.findFirst({
      where: {
        id: enquiryId,
        organisationId:
          membership.organisationId,
      },
      select: {
        id: true,
        enquiryNumber: true,
      },
    });

  if (!existingEnquiry) {
    return NextResponse.json(
      { error: "Enquiry not found." },
      { status: 404 },
    );
  }

  try {
    await prisma.enquiry.delete({
      where: {
        id: existingEnquiry.id,
      },
    });

    return NextResponse.json({
      success: true,
      enquiryId:
        existingEnquiry.id,
      enquiryNumber:
        existingEnquiry.enquiryNumber,
    });
  } catch (deleteError) {
    console.error(
      "Failed to delete GreenFlow enquiry:",
      deleteError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to delete enquiry.",
      },
      { status: 500 },
    );
  }
}