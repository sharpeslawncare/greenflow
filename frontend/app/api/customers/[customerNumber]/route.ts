import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    customerNumber: string;
  }>;
};

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

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const { error, membership } =
    await getCurrentMembership();

  if (error || !membership) {
    return error;
  }

  const { customerNumber: rawCustomerNumber } =
    await context.params;

  const customerNumber = decodeURIComponent(
    rawCustomerNumber,
  ).trim();

  if (!customerNumber) {
    return NextResponse.json(
      { error: "Customer number is required." },
      { status: 400 },
    );
  }

  const existingCustomer =
    await prisma.customer.findFirst({
      where: {
        organisationId:
          membership.organisationId,
        customerNumber,
      },
    });

  if (!existingCustomer) {
    return NextResponse.json(
      { error: "Customer not found." },
      { status: 404 },
    );
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

  const updateData: {
    firstName?: string;
    surname?: string;
    fullName?: string;
    address?: string;
    postcode?: string;
    email?: string;
    homePhone?: string;
    mobilePhone?: string;
    lawnSize?: number;
    groupNumber?: number;
    treatmentPrice?: number;
    status?: string;
    vanNumber?: number;
    nextVisit?: string;
    lastVisit?: string;
    lockedGate?: boolean;
    gateCode?: string;
    dogOnProperty?: boolean;
    preferredContact?: string;
    paymentMethod?: string;
    notes?: string;
    programmeStartDate?: string;
  } = {};

  if (typeof data.firstName === "string") {
    updateData.firstName = data.firstName.trim();
  }

  if (typeof data.surname === "string") {
    updateData.surname = data.surname.trim();
  }

  if (typeof data.fullName === "string") {
    updateData.fullName = data.fullName.trim();
  }

  if (typeof data.address === "string") {
    updateData.address = data.address.trim();
  }

  if (typeof data.postcode === "string") {
    updateData.postcode = data.postcode
      .trim()
      .toUpperCase();
  }

  if (typeof data.email === "string") {
    updateData.email = data.email
      .trim()
      .toLowerCase();
  }

  if (typeof data.homePhone === "string") {
    updateData.homePhone =
      data.homePhone.trim();
  }

  if (typeof data.mobilePhone === "string") {
    updateData.mobilePhone =
      data.mobilePhone.trim();
  }

  if (data.lawnSize !== undefined) {
    const lawnSize = Number(data.lawnSize);

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

    updateData.lawnSize = lawnSize;
  }

  if (data.groupNumber !== undefined) {
    const groupNumber = Number(
      data.groupNumber,
    );

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

    updateData.groupNumber = groupNumber;
  }

  if (data.treatmentPrice !== undefined) {
    const treatmentPrice = Number(
      data.treatmentPrice,
    );

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

    updateData.treatmentPrice =
      treatmentPrice;
  }

  if (data.status !== undefined) {
    if (typeof data.status !== "string") {
      return NextResponse.json(
        { error: "Invalid customer status." },
        { status: 400 },
      );
    }

    const status = data.status.trim();

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

    updateData.status = status;
  }

  if (data.vanNumber !== undefined) {
    const vanNumber = Number(data.vanNumber);

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

    updateData.vanNumber = vanNumber;
  }

  if (typeof data.nextVisit === "string") {
    updateData.nextVisit =
      data.nextVisit.trim();
  }

  if (typeof data.lastVisit === "string") {
    updateData.lastVisit =
      data.lastVisit.trim();
  }

  if (typeof data.lockedGate === "boolean") {
    updateData.lockedGate =
      data.lockedGate;
  }

  if (typeof data.gateCode === "string") {
    updateData.gateCode =
      data.gateCode.trim();
  }

  if (
    typeof data.dogOnProperty === "boolean"
  ) {
    updateData.dogOnProperty =
      data.dogOnProperty;
  }

  if (data.preferredContact !== undefined) {
    if (
      typeof data.preferredContact !==
      "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid preferred contact method.",
        },
        { status: 400 },
      );
    }

    const preferredContact =
      data.preferredContact.trim();

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

    updateData.preferredContact =
      preferredContact;
  }

  if (
    typeof data.paymentMethod === "string"
  ) {
    updateData.paymentMethod =
      data.paymentMethod.trim();
  }

  if (typeof data.notes === "string") {
    updateData.notes = data.notes.trim();
  }

  if (
    typeof data.programmeStartDate ===
    "string"
  ) {
    updateData.programmeStartDate =
      data.programmeStartDate.trim();
  }

  if (
    updateData.firstName !== undefined ||
    updateData.surname !== undefined
  ) {
    const firstName =
      updateData.firstName ??
      existingCustomer.firstName;

    const surname =
      updateData.surname ??
      existingCustomer.surname;

    if (updateData.fullName === undefined) {
      updateData.fullName =
        `${firstName} ${surname}`.trim();
    }
  }

  let additionalJobs:
    | AdditionalJobInput[]
    | undefined;

  if (data.additionalJobs !== undefined) {
    const additionalJobsResult =
      parseAdditionalJobs(
        data.additionalJobs,
      );

    if (!additionalJobsResult.success) {
      return NextResponse.json(
        {
          error:
            additionalJobsResult.error,
        },
        { status: 400 },
      );
    }

    additionalJobs =
      additionalJobsResult.jobs;
  }

  try {
    const customer = await prisma.$transaction(
      async (tx) => {
        await tx.customer.update({
          where: {
            id: existingCustomer.id,
          },
          data: updateData,
        });

        if (additionalJobs !== undefined) {
          await tx.additionalCustomerJob.deleteMany({
            where: {
              customerId: existingCustomer.id,
            },
          });

          if (additionalJobs.length > 0) {
            await tx.additionalCustomerJob.createMany({
              data: additionalJobs.map(
                (job) => ({
                  id: job.id,
                  customerId:
                    existingCustomer.id,
                  treatmentLibraryId:
                    job.treatmentLibraryId,
                  treatmentName:
                    job.treatmentName,
                  wordingSnapshot:
                    job.wordingSnapshot,
                  scheduledDate:
                    job.scheduledDate,
                  price: job.price,
                  notes: job.notes,
                  status: job.status,
                  createdAt: job.createdAt,
                }),
              ),
            });
          }
        }

        return tx.customer.findUniqueOrThrow({
          where: {
            id: existingCustomer.id,
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

    return NextResponse.json({
      customer: serializeCustomer(customer),
    });
  } catch (updateError) {
    console.error(
      "Failed to update GreenFlow customer:",
      updateError,
    );

    return NextResponse.json(
      { error: "Unable to update customer." },
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

  const { customerNumber: rawCustomerNumber } =
    await context.params;

  const customerNumber = decodeURIComponent(
    rawCustomerNumber,
  ).trim();

  if (!customerNumber) {
    return NextResponse.json(
      { error: "Customer number is required." },
      { status: 400 },
    );
  }

  const existingCustomer =
    await prisma.customer.findFirst({
      where: {
        organisationId:
          membership.organisationId,
        customerNumber,
      },
      select: {
        id: true,
        customerNumber: true,
      },
    });

  if (!existingCustomer) {
    return NextResponse.json(
      { error: "Customer not found." },
      { status: 404 },
    );
  }

  try {
    await prisma.customer.delete({
      where: {
        id: existingCustomer.id,
      },
    });

    return NextResponse.json({
      success: true,
      customerNumber:
        existingCustomer.customerNumber,
    });
  } catch (deleteError) {
    console.error(
      "Failed to delete GreenFlow customer:",
      deleteError,
    );

    return NextResponse.json(
      { error: "Unable to delete customer." },
      { status: 500 },
    );
  }
}