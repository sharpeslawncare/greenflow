import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type AdditionalJobInput = {
  id: string;
  treatmentLibraryId: string;
  treatmentName: string;
  wordingSnapshot: string;
  scheduledDate: string;
  price: number;
  notes: string;
  status: string;
  createdAt: Date;
};

type AdditionalJobsParseResult =
  | {
      success: true;
      jobs: AdditionalJobInput[];
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

function parseAdditionalJobs(
  value: unknown,
): AdditionalJobsParseResult {
  if (value === undefined) {
    return {
      success: true,
      jobs: [],
    };
  }

  if (!Array.isArray(value)) {
    return {
      success: false,
      error: "Additional jobs must be an array.",
    };
  }

  const jobs: AdditionalJobInput[] = [];

  for (const rawJob of value) {
    if (
      !rawJob ||
      typeof rawJob !== "object" ||
      Array.isArray(rawJob)
    ) {
      return {
        success: false,
        error: "Invalid additional job data.",
      };
    }

    const job = rawJob as Record<string, unknown>;

    const id =
      typeof job.id === "string"
        ? job.id.trim()
        : "";

    const treatmentLibraryId =
      typeof job.treatmentLibraryId === "string"
        ? job.treatmentLibraryId.trim()
        : "";

    const treatmentName =
      typeof job.treatmentName === "string"
        ? job.treatmentName.trim()
        : "";

    const wordingSnapshot =
      typeof job.wordingSnapshot === "string"
        ? job.wordingSnapshot
        : "";

    const scheduledDate =
      typeof job.scheduledDate === "string"
        ? job.scheduledDate.trim()
        : "";

    const price = Number(job.price ?? 0);

    const notes =
      typeof job.notes === "string"
        ? job.notes.trim()
        : "";

    const status =
      typeof job.status === "string"
        ? job.status.trim()
        : "";

    const createdAtValue =
      typeof job.createdAt === "string"
        ? job.createdAt
        : "";

    const createdAt = createdAtValue
      ? new Date(createdAtValue)
      : new Date();

    if (!id) {
      return {
        success: false,
        error:
          "Every additional job must have an ID.",
      };
    }

    if (!treatmentLibraryId) {
      return {
        success: false,
        error:
          "Every additional job must have a treatment library ID.",
      };
    }

    if (!treatmentName) {
      return {
        success: false,
        error:
          "Every additional job must have a treatment name.",
      };
    }

    if (!Number.isFinite(price) || price < 0) {
      return {
        success: false,
        error:
          "Additional job price must be a valid non-negative number.",
      };
    }

    if (!status) {
      return {
        success: false,
        error:
          "Every additional job must have a status.",
      };
    }

    if (Number.isNaN(createdAt.getTime())) {
      return {
        success: false,
        error:
          "Additional job createdAt must be a valid date.",
      };
    }

    jobs.push({
      id,
      treatmentLibraryId,
      treatmentName,
      wordingSnapshot,
      scheduledDate,
      price,
      notes,
      status,
      createdAt,
    });
  }

  return {
    success: true,
    jobs,
  };
}

function serializeCustomer<
  T extends {
    treatmentPrice: unknown;
    additionalJobs: Array<{
      id: string;
      treatmentLibraryId: string;
      treatmentName: string;
      wordingSnapshot: string;
      scheduledDate: string;
      price: unknown;
      notes: string;
      status: string;
      createdAt: Date;
    }>;
  },
>(customer: T) {
  return {
    ...customer,
    treatmentPrice: Number(
      customer.treatmentPrice,
    ),
    additionalJobs: customer.additionalJobs.map(
      (job) => ({
        id: job.id,
        treatmentLibraryId:
          job.treatmentLibraryId,
        treatmentName: job.treatmentName,
        wordingSnapshot: job.wordingSnapshot,
        scheduledDate: job.scheduledDate,
        price: Number(job.price),
        notes: job.notes,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
      }),
    ),
  };
}

export async function GET() {
  const { error, membership } =
    await getCurrentMembership();

  if (error || !membership) {
    return error;
  }

  const customers = await prisma.customer.findMany({
    where: {
      organisationId: membership.organisationId,
    },
    include: {
      additionalJobs: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      customerNumber: "asc",
    },
  });

  return NextResponse.json({
    customers: customers.map(serializeCustomer),
  });
}

export async function POST(request: Request) {
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
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Invalid customer data." },
      { status: 400 },
    );
  }

  const data = body as Record<string, unknown>;

  const customerNumber =
    typeof data.customerNumber === "string"
      ? data.customerNumber.trim()
      : "";

  const firstName =
    typeof data.firstName === "string"
      ? data.firstName.trim()
      : "";

  const surname =
    typeof data.surname === "string"
      ? data.surname.trim()
      : "";

  const fullName =
    typeof data.fullName === "string"
      ? data.fullName.trim()
      : `${firstName} ${surname}`.trim();

  const address =
    typeof data.address === "string"
      ? data.address.trim()
      : "";

  const postcode =
    typeof data.postcode === "string"
      ? data.postcode.trim().toUpperCase()
      : "";

  const email =
    typeof data.email === "string"
      ? data.email.trim().toLowerCase()
      : "";

  const homePhone =
    typeof data.homePhone === "string"
      ? data.homePhone.trim()
      : "";

  const mobilePhone =
    typeof data.mobilePhone === "string"
      ? data.mobilePhone.trim()
      : "";

  const lawnSize = Number(data.lawnSize ?? 0);
  const groupNumber = Number(
    data.groupNumber ?? 0,
  );
  const treatmentPrice = Number(
    data.treatmentPrice ?? 0,
  );
  const vanNumber = Number(data.vanNumber ?? 1);

  const status =
    typeof data.status === "string"
      ? data.status.trim()
      : "Active";

  const nextVisit =
    typeof data.nextVisit === "string"
      ? data.nextVisit.trim()
      : "Not yet scheduled";

  const lastVisit =
    typeof data.lastVisit === "string"
      ? data.lastVisit.trim()
      : "No previous visit";

  const lockedGate =
    typeof data.lockedGate === "boolean"
      ? data.lockedGate
      : false;

  const gateCode =
    typeof data.gateCode === "string"
      ? data.gateCode.trim()
      : "";

  const dogOnProperty =
    typeof data.dogOnProperty === "boolean"
      ? data.dogOnProperty
      : false;

  const preferredContact =
    typeof data.preferredContact === "string"
      ? data.preferredContact.trim()
      : "SMS";

  const paymentMethod =
    typeof data.paymentMethod === "string"
      ? data.paymentMethod.trim()
      : "Not set";

  const notes =
    typeof data.notes === "string"
      ? data.notes.trim()
      : "";

  const programmeStartDate =
    typeof data.programmeStartDate === "string"
      ? data.programmeStartDate.trim()
      : "";

  if (!customerNumber) {
    return NextResponse.json(
      { error: "Customer number is required." },
      { status: 400 },
    );
  }

  if (
    !Number.isFinite(lawnSize) ||
    lawnSize < 0
  ) {
    return NextResponse.json(
      {
        error:
          "Lawn size must be a valid non-negative number.",
      },
      { status: 400 },
    );
  }

  if (
    !Number.isFinite(groupNumber) ||
    groupNumber < 0
  ) {
    return NextResponse.json(
      {
        error:
          "Group number must be a valid non-negative number.",
      },
      { status: 400 },
    );
  }

  if (
    !Number.isFinite(treatmentPrice) ||
    treatmentPrice < 0
  ) {
    return NextResponse.json(
      {
        error:
          "Treatment price must be a valid non-negative number.",
      },
      { status: 400 },
    );
  }

  if (
    !Number.isFinite(vanNumber) ||
    vanNumber < 1
  ) {
    return NextResponse.json(
      {
        error:
          "Van number must be a valid positive number.",
      },
      { status: 400 },
    );
  }

  const allowedStatuses = [
    "Active",
    "Paused",
    "Inactive",
  ];

  if (!allowedStatuses.includes(status)) {
    return NextResponse.json(
      {
        error:
          "Status must be Active, Paused or Inactive.",
      },
      { status: 400 },
    );
  }

  const allowedContactMethods = [
    "SMS",
    "Email",
    "Telephone",
  ];

  if (
    !allowedContactMethods.includes(
      preferredContact,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Preferred contact must be SMS, Email or Telephone.",
      },
      { status: 400 },
    );
  }

  const additionalJobsResult =
    parseAdditionalJobs(data.additionalJobs);

  if (!additionalJobsResult.success) {
    return NextResponse.json(
      {
        error: additionalJobsResult.error,
      },
      { status: 400 },
    );
  }

  const additionalJobs =
    additionalJobsResult.jobs;

  const existingCustomer =
    await prisma.customer.findFirst({
      where: {
        organisationId:
          membership.organisationId,
        customerNumber,
      },
      select: {
        id: true,
      },
    });

  if (existingCustomer) {
    return NextResponse.json(
      {
        error:
          "A customer with this customer number already exists.",
      },
      { status: 409 },
    );
  }

  try {
    const customer = await prisma.$transaction(
      async (tx) => {
        const createdCustomer =
          await tx.customer.create({
            data: {
              organisationId:
                membership.organisationId,
              customerNumber,
              firstName,
              surname,
              fullName,
              address,
              postcode,
              email,
              homePhone,
              mobilePhone,
              lawnSize,
              groupNumber,
              treatmentPrice,
              status,
              vanNumber,
              nextVisit,
              lastVisit,
              lockedGate,
              gateCode,
              dogOnProperty,
              preferredContact,
              paymentMethod,
              notes,
              programmeStartDate,
            },
          });

        if (additionalJobs.length > 0) {
          await tx.additionalCustomerJob.createMany({
            data: additionalJobs.map((job) => ({
              id: job.id,
              customerId: createdCustomer.id,
              treatmentLibraryId:
                job.treatmentLibraryId,
              treatmentName: job.treatmentName,
              wordingSnapshot:
                job.wordingSnapshot,
              scheduledDate: job.scheduledDate,
              price: job.price,
              notes: job.notes,
              status: job.status,
              createdAt: job.createdAt,
            })),
          });
        }

        return tx.customer.findUniqueOrThrow({
          where: {
            id: createdCustomer.id,
          },
          include: {
            additionalJobs: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });
      },
    );

    return NextResponse.json(
      {
        customer: serializeCustomer(customer),
      },
      { status: 201 },
    );
  } catch (createError) {
    console.error(
      "Failed to create GreenFlow customer:",
      createError,
    );

    return NextResponse.json(
      {
        error: "Unable to create customer.",
      },
      { status: 500 },
    );
  }
}