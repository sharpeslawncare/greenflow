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

type EnquiryInput = {
  id: string;
  enquiryNumber: string;

  createdAt: Date;
  updatedAt: Date;

  status: string;
  source: string;
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

  quoteStatus: string;
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

type EnquiryParseResult =
  | {
      success: true;
      enquiry: EnquiryInput;
    }
  | {
      success: false;
      error: string;
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

function stringValue(
  value: unknown,
  fallback = "",
) {
  return typeof value === "string"
    ? value.trim()
    : fallback;
}

function booleanValue(
  value: unknown,
  fallback = false,
) {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function nonNegativeNumber(
  value: unknown,
  fallback = 0,
) {
  const number = Number(value ?? fallback);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return null;
  }

  return number;
}

function positiveInteger(
  value: unknown,
  fallback: number,
) {
  const number = Number(value ?? fallback);

  if (
    !Number.isFinite(number) ||
    number < 1 ||
    !Number.isInteger(number)
  ) {
    return null;
  }

  return number;
}

function parseDate(
  value: unknown,
  fallback: Date,
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function parseEnquiry(
  value: unknown,
): EnquiryParseResult {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {
      success: false,
      error: "Invalid enquiry data.",
    };
  }

  const data =
    value as Record<string, unknown>;

  const id = stringValue(data.id);
  const enquiryNumber = stringValue(
    data.enquiryNumber,
  ).toUpperCase();

  if (!id) {
    return {
      success: false,
      error: "Enquiry ID is required.",
    };
  }

  if (!enquiryNumber) {
    return {
      success: false,
      error: "Enquiry number is required.",
    };
  }

  const status = stringValue(
    data.status,
    "New Enquiry",
  );

  if (
    !ALLOWED_STATUSES.includes(
      status as (typeof ALLOWED_STATUSES)[number],
    )
  ) {
    return {
      success: false,
      error: "Invalid enquiry status.",
    };
  }

  const source = stringValue(
    data.source,
    "Recommendation",
  );

  if (
    !ALLOWED_SOURCES.includes(
      source as (typeof ALLOWED_SOURCES)[number],
    )
  ) {
    return {
      success: false,
      error: "Invalid enquiry source.",
    };
  }

  const quoteStatus = stringValue(
    data.quoteStatus,
    "Not Prepared",
  );

  if (
    !ALLOWED_QUOTE_STATUSES.includes(
      quoteStatus as (typeof ALLOWED_QUOTE_STATUSES)[number],
    )
  ) {
    return {
      success: false,
      error: "Invalid quote status.",
    };
  }

  const lawnSizeSquareMetres =
    nonNegativeNumber(
      data.lawnSizeSquareMetres,
    );

  if (lawnSizeSquareMetres === null) {
    return {
      success: false,
      error:
        "Lawn size must be a valid non-negative number.",
    };
  }

  if (!Number.isInteger(lawnSizeSquareMetres)) {
    return {
      success: false,
      error:
        "Lawn size must be a whole number.",
    };
  }

  const pricePerSquareMetre =
    nonNegativeNumber(
      data.pricePerSquareMetre,
      0.2,
    );

  if (pricePerSquareMetre === null) {
    return {
      success: false,
      error:
        "Price per square metre must be a valid non-negative number.",
    };
  }

  const calculatedTreatmentPrice =
    nonNegativeNumber(
      data.calculatedTreatmentPrice,
    );

  if (calculatedTreatmentPrice === null) {
    return {
      success: false,
      error:
        "Calculated treatment price must be a valid non-negative number.",
    };
  }

  const quotedTreatmentPrice =
    nonNegativeNumber(
      data.quotedTreatmentPrice,
    );

  if (quotedTreatmentPrice === null) {
    return {
      success: false,
      error:
        "Quoted treatment price must be a valid non-negative number.",
    };
  }

  const suggestedGroupNumber =
    positiveInteger(
      data.suggestedGroupNumber,
      1,
    );

  if (suggestedGroupNumber === null) {
    return {
      success: false,
      error:
        "Suggested group number must be a positive whole number.",
    };
  }

  const suggestedVanNumber =
    positiveInteger(
      data.suggestedVanNumber,
      1,
    );

  if (suggestedVanNumber === null) {
    return {
      success: false,
      error:
        "Suggested van number must be a positive whole number.",
    };
  }

  const now = new Date();

  const createdAt = parseDate(
    data.createdAt,
    now,
  );

  if (!createdAt) {
    return {
      success: false,
      error:
        "Enquiry createdAt must be a valid date.",
    };
  }

  const updatedAt = parseDate(
    data.updatedAt,
    createdAt,
  );

  if (!updatedAt) {
    return {
      success: false,
      error:
        "Enquiry updatedAt must be a valid date.",
    };
  }

  const firstName =
    stringValue(data.firstName);

  const surname =
    stringValue(data.surname);

  const suppliedFullName =
    stringValue(data.fullName);

  const fullName =
    suppliedFullName ||
    `${firstName} ${surname}`.trim();

  return {
    success: true,
    enquiry: {
      id,
      enquiryNumber,

      createdAt,
      updatedAt,

      status,
      source,
      referredBy:
        stringValue(data.referredBy),

      firstName,
      surname,
      fullName,

      address:
        stringValue(data.address),

      postcode:
        stringValue(data.postcode)
          .toUpperCase(),

      emailAddress:
        stringValue(data.emailAddress),

      homePhone:
        stringValue(data.homePhone),

      mobilePhone:
        stringValue(data.mobilePhone),

      initialMessage:
        stringValue(data.initialMessage),

      internalNotes:
        stringValue(data.internalNotes),

      siteVisitDate:
        stringValue(data.siteVisitDate),

      siteVisitTime:
        stringValue(data.siteVisitTime),

      lawnMeasured:
        booleanValue(data.lawnMeasured),

      lawnSizeSquareMetres,

      minimumPriceApplied:
        booleanValue(
          data.minimumPriceApplied,
        ),

      pricePerSquareMetre,
      calculatedTreatmentPrice,
      quotedTreatmentPrice,

      quoteStatus,

      quoteDate:
        stringValue(data.quoteDate),

      quoteExpiryDate:
        stringValue(
          data.quoteExpiryDate,
        ),

      quoteNotes:
        stringValue(data.quoteNotes),

      treatmentStartedImmediately:
        booleanValue(
          data.treatmentStartedImmediately,
        ),

      suggestedGroupNumber,
      suggestedVanNumber,

      extraWorkRequired:
        booleanValue(
          data.extraWorkRequired,
        ),

      extraWorkDescription:
        stringValue(
          data.extraWorkDescription,
        ),

      preferredExtraWorkSeason:
        stringValue(
          data.preferredExtraWorkSeason,
        ),

      convertedCustomerNumber:
        stringValue(
          data.convertedCustomerNumber,
        ),

      convertedAt:
        stringValue(data.convertedAt),
    },
  };
}

function enquiryDatabaseData(
  enquiry: EnquiryInput,
) {
  return {
    enquiryNumber:
      enquiry.enquiryNumber,

    status: enquiry.status,
    source: enquiry.source,
    referredBy: enquiry.referredBy,

    firstName: enquiry.firstName,
    surname: enquiry.surname,
    fullName: enquiry.fullName,

    address: enquiry.address,
    postcode: enquiry.postcode,

    emailAddress:
      enquiry.emailAddress,

    homePhone: enquiry.homePhone,
    mobilePhone: enquiry.mobilePhone,

    initialMessage:
      enquiry.initialMessage,

    internalNotes:
      enquiry.internalNotes,

    siteVisitDate:
      enquiry.siteVisitDate,

    siteVisitTime:
      enquiry.siteVisitTime,

    lawnMeasured:
      enquiry.lawnMeasured,

    lawnSizeSquareMetres:
      enquiry.lawnSizeSquareMetres,

    minimumPriceApplied:
      enquiry.minimumPriceApplied,

    pricePerSquareMetre:
      enquiry.pricePerSquareMetre,

    calculatedTreatmentPrice:
      enquiry.calculatedTreatmentPrice,

    quotedTreatmentPrice:
      enquiry.quotedTreatmentPrice,

    quoteStatus:
      enquiry.quoteStatus,

    quoteDate:
      enquiry.quoteDate,

    quoteExpiryDate:
      enquiry.quoteExpiryDate,

    quoteNotes:
      enquiry.quoteNotes,

    treatmentStartedImmediately:
      enquiry.treatmentStartedImmediately,

    suggestedGroupNumber:
      enquiry.suggestedGroupNumber,

    suggestedVanNumber:
      enquiry.suggestedVanNumber,

    extraWorkRequired:
      enquiry.extraWorkRequired,

    extraWorkDescription:
      enquiry.extraWorkDescription,

    preferredExtraWorkSeason:
      enquiry.preferredExtraWorkSeason,

    convertedCustomerNumber:
      enquiry.convertedCustomerNumber,

    convertedAt:
      enquiry.convertedAt,

    createdAt:
      enquiry.createdAt,

    updatedAt:
      enquiry.updatedAt,
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
      Number(
        enquiry.pricePerSquareMetre,
      ),

    calculatedTreatmentPrice:
      Number(
        enquiry.calculatedTreatmentPrice,
      ),

    quotedTreatmentPrice:
      Number(
        enquiry.quotedTreatmentPrice,
      ),

    createdAt:
      enquiry.createdAt.toISOString(),

    updatedAt:
      enquiry.updatedAt.toISOString(),
  };
}

export async function GET() {
  const { error, membership } =
    await getCurrentMembership();

  if (error || !membership) {
    return error;
  }

  const enquiries =
    await prisma.enquiry.findMany({
      where: {
        organisationId:
          membership.organisationId,
      },
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          enquiryNumber: "desc",
        },
      ],
    });

  return NextResponse.json({
    enquiries:
      enquiries.map(serializeEnquiry),
  });
}

export async function POST(
  request: Request,
) {
  const { error, membership } =
    await getCurrentMembership();

  if (error || !membership) {
    return error;
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
      {
        error: "Invalid enquiry data.",
      },
      { status: 400 },
    );
  }

  const requestData =
    body as Record<string, unknown>;

  /*
   * Safe bulk import/upsert mode.
   *
   * This deliberately DOES NOT delete
   * enquiries that are absent from the
   * supplied array.
   *
   * This will later allow the browser's
   * existing enquiry data to be migrated
   * into PostgreSQL without turning an
   * incomplete upload into a destructive
   * replace-all operation.
   */
  if (
    requestData.enquiries !== undefined
  ) {
    if (
      !Array.isArray(
        requestData.enquiries,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Enquiries must be supplied as an array.",
        },
        { status: 400 },
      );
    }

    const parsedEnquiries:
      EnquiryInput[] = [];

    const seenIds =
      new Set<string>();

    const seenEnquiryNumbers =
      new Set<string>();

    for (
      let index = 0;
      index <
      requestData.enquiries.length;
      index += 1
    ) {
      const result =
        parseEnquiry(
          requestData.enquiries[index],
        );

      if (!result.success) {
        return NextResponse.json(
          {
            error:
              `Enquiry ${index + 1}: ` +
              result.error,
          },
          { status: 400 },
        );
      }

      if (
        seenIds.has(
          result.enquiry.id,
        )
      ) {
        return NextResponse.json(
          {
            error:
              `Duplicate enquiry ID ` +
              `"${result.enquiry.id}" ` +
              "in bulk request.",
          },
          { status: 400 },
        );
      }

      if (
        seenEnquiryNumbers.has(
          result.enquiry.enquiryNumber,
        )
      ) {
        return NextResponse.json(
          {
            error:
              `Duplicate enquiry number ` +
              `"${result.enquiry.enquiryNumber}" ` +
              "in bulk request.",
          },
          { status: 400 },
        );
      }

      seenIds.add(
        result.enquiry.id,
      );

      seenEnquiryNumbers.add(
        result.enquiry.enquiryNumber,
      );

      parsedEnquiries.push(
        result.enquiry,
      );
    }

    try {
      const enquiries =
        await prisma.$transaction(
          async (tx) => {
            for (
              const enquiry
              of parsedEnquiries
            ) {
              const existingById =
                await tx.enquiry.findFirst({
                  where: {
                    organisationId:
                      membership.organisationId,
                    id: enquiry.id,
                  },
                  select: {
                    id: true,
                    enquiryNumber: true,
                  },
                });

              const existingByNumber =
                await tx.enquiry.findFirst({
                  where: {
                    organisationId:
                      membership.organisationId,
                    enquiryNumber:
                      enquiry.enquiryNumber,
                  },
                  select: {
                    id: true,
                    enquiryNumber: true,
                  },
                });

              if (
                existingById &&
                existingByNumber &&
                existingById.id !==
                  existingByNumber.id
              ) {
                throw new Error(
                  `Enquiry ID "${enquiry.id}" and ` +
                    `enquiry number "${enquiry.enquiryNumber}" ` +
                    "belong to different existing enquiries.",
                );
              }

              const existing =
                existingById ??
                existingByNumber;

              if (existing) {
                await tx.enquiry.update({
                  where: {
                    id: existing.id,
                  },
                  data: {
                    ...enquiryDatabaseData(
                      enquiry,
                    ),
                  },
                });
              } else {
                await tx.enquiry.create({
                  data: {
                    id: enquiry.id,
                    organisationId:
                      membership.organisationId,
                    ...enquiryDatabaseData(
                      enquiry,
                    ),
                  },
                });
              }
            }

            return tx.enquiry.findMany({
              where: {
                organisationId:
                  membership.organisationId,
                id: {
                  in: parsedEnquiries.map(
                    (enquiry) =>
                      enquiry.id,
                  ),
                },
              },
              orderBy: {
                createdAt: "desc",
              },
            });
          },
        );

      return NextResponse.json({
        success: true,
        imported: enquiries.length,
        enquiries:
          enquiries.map(
            serializeEnquiry,
          ),
      });
    } catch (bulkError) {
      console.error(
        "Failed to bulk upsert GreenFlow enquiries:",
        bulkError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to import enquiries.",
        },
        { status: 500 },
      );
    }
  }

  const result =
    parseEnquiry(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error,
      },
      { status: 400 },
    );
  }

  const enquiryInput =
    result.enquiry;

  const existingEnquiry =
    await prisma.enquiry.findFirst({
      where: {
        organisationId:
          membership.organisationId,
        OR: [
          {
            id: enquiryInput.id,
          },
          {
            enquiryNumber:
              enquiryInput.enquiryNumber,
          },
        ],
      },
      select: {
        id: true,
        enquiryNumber: true,
      },
    });

  if (existingEnquiry) {
    return NextResponse.json(
      {
        error:
          "An enquiry with this ID or enquiry number already exists.",
      },
      { status: 409 },
    );
  }

  try {
    const enquiry =
      await prisma.enquiry.create({
        data: {
          id: enquiryInput.id,

          organisationId:
            membership.organisationId,

          ...enquiryDatabaseData(
            enquiryInput,
          ),
        },
      });

    return NextResponse.json(
      {
        enquiry:
          serializeEnquiry(enquiry),
      },
      { status: 201 },
    );
  } catch (createError) {
    console.error(
      "Failed to create GreenFlow enquiry:",
      createError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to create enquiry.",
      },
      { status: 500 },
    );
  }
}