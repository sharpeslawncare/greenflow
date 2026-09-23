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

type CustomerInput = {
  customerNumber: string;
  firstName: string;
  surname: string;
  fullName: string;
  address: string;
  postcode: string;
  email: string;
  homePhone: string;
  mobilePhone: string;
  lawnSize: number;
  groupNumber: number;
  treatmentPrice: number;
  status: string;
  vanNumber: number;
  nextVisit: string;
  lastVisit: string;
  lockedGate: boolean;
  gateCode: string;
  dogOnProperty: boolean;
  preferredContact: string;
  paymentMethod: string;
  notes: string;
  programmeStartDate: string;
  additionalJobs: AdditionalJobInput[];
};

type CustomerParseResult =
  | {
      success: true;
      customer: CustomerInput;
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
  const seenIds = new Set<string>();

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

    if (seenIds.has(id)) {
      return {
        success: false,
        error: `Duplicate additional job ID "${id}".`,
      };
    }

    seenIds.add(id);

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

function parseCustomer(
  value: unknown,
): CustomerParseResult {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {
      success: false,
      error: "Invalid customer data.",
    };
  }

  const data = value as Record<string, unknown>;

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
    typeof data.fullName === "string" &&
    data.fullName.trim()
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

  const status =
    typeof data.status === "string"
      ? data.status.trim()
      : "Active";

  const vanNumber = Number(data.vanNumber ?? 1);

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
    return {
      success: false,
      error: "Customer number is required.",
    };
  }

  if (
    !Number.isFinite(lawnSize) ||
    lawnSize < 0
  ) {
    return {
      success: false,
      error:
        "Lawn size must be a valid non-negative number.",
    };
  }

  if (
    !Number.isFinite(groupNumber) ||
    groupNumber < 0
  ) {
    return {
      success: false,
      error:
        "Group number must be a valid non-negative number.",
    };
  }

  if (
    !Number.isFinite(treatmentPrice) ||
    treatmentPrice < 0
  ) {
    return {
      success: false,
      error:
        "Treatment price must be a valid non-negative number.",
    };
  }

  if (
    !Number.isFinite(vanNumber) ||
    vanNumber < 1
  ) {
    return {
      success: false,
      error:
        "Van number must be a valid positive number.",
    };
  }

  const allowedStatuses = [
    "Active",
    "Paused",
    "Inactive",
  ];

  if (!allowedStatuses.includes(status)) {
    return {
      success: false,
      error:
        "Status must be Active, Paused or Inactive.",
    };
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
    return {
      success: false,
      error:
        "Preferred contact must be SMS, Email or Telephone.",
    };
  }

  const additionalJobsResult =
    parseAdditionalJobs(data.additionalJobs);

  if (!additionalJobsResult.success) {
    return {
      success: false,
      error: additionalJobsResult.error,
    };
  }

  return {
    success: true,
    customer: {
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
      additionalJobs:
        additionalJobsResult.jobs,
    },
  };
}

function customerDatabaseData(
  customer: CustomerInput,
) {
  return {
    customerNumber: customer.customerNumber,
    firstName: customer.firstName,
    surname: customer.surname,
    fullName: customer.fullName,
    address: customer.address,
    postcode: customer.postcode,
    email: customer.email,
    homePhone: customer.homePhone,
    mobilePhone: customer.mobilePhone,
    lawnSize: customer.lawnSize,
    groupNumber: customer.groupNumber,
    treatmentPrice: customer.treatmentPrice,
    status: customer.status,
    vanNumber: customer.vanNumber,
    nextVisit: customer.nextVisit,
    lastVisit: customer.lastVisit,
    lockedGate: customer.lockedGate,
    gateCode: customer.gateCode,
    dogOnProperty: customer.dogOnProperty,
    preferredContact: customer.preferredContact,
    paymentMethod: customer.paymentMethod,
    notes: customer.notes,
    programmeStartDate:
      customer.programmeStartDate,
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

  const requestData =
    body as Record<string, unknown>;

  /*
   * Safe bulk import/upsert mode.
   *
   * This deliberately DOES NOT delete customers that are
   * absent from the supplied array.
   *
   * That distinction is important because GreenFlow's
   * existing customer records may include genuine customers
   * as well as temporary/demo records used during development.
   */
  if (requestData.customers !== undefined) {
    if (!Array.isArray(requestData.customers)) {
      return NextResponse.json(
        {
          error:
            "Customers must be supplied as an array.",
        },
        { status: 400 },
      );
    }

    const parsedCustomers: CustomerInput[] = [];
    const seenCustomerNumbers =
      new Set<string>();

    for (
      let index = 0;
      index < requestData.customers.length;
      index += 1
    ) {
      const result = parseCustomer(
        requestData.customers[index],
      );

      if (!result.success) {
        return NextResponse.json(
          {
            error: `Customer ${
              index + 1
            }: ${result.error}`,
          },
          { status: 400 },
        );
      }

      if (
        seenCustomerNumbers.has(
          result.customer.customerNumber,
        )
      ) {
        return NextResponse.json(
          {
            error:
              `Duplicate customer number ` +
              `"${result.customer.customerNumber}" ` +
              "in bulk request.",
          },
          { status: 400 },
        );
      }

      seenCustomerNumbers.add(
        result.customer.customerNumber,
      );

      parsedCustomers.push(result.customer);
    }

    try {
      const customers =
        await prisma.$transaction(
          async (tx) => {
            for (const customer of parsedCustomers) {
              const existingCustomer =
                await tx.customer.findFirst({
                  where: {
                    organisationId:
                      membership.organisationId,
                    customerNumber:
                      customer.customerNumber,
                  },
                  select: {
                    id: true,
                  },
                });

              let customerId: string;

              if (existingCustomer) {
                const updatedCustomer =
                  await tx.customer.update({
                    where: {
                      id: existingCustomer.id,
                    },
                    data: customerDatabaseData(
                      customer,
                    ),
                    select: {
                      id: true,
                    },
                  });

                customerId = updatedCustomer.id;

                await tx.additionalCustomerJob.deleteMany(
                  {
                    where: {
                      customerId,
                    },
                  },
                );
              } else {
                const createdCustomer =
                  await tx.customer.create({
                    data: {
                      organisationId:
                        membership.organisationId,
                      ...customerDatabaseData(
                        customer,
                      ),
                    },
                    select: {
                      id: true,
                    },
                  });

                customerId = createdCustomer.id;
              }

              if (
                customer.additionalJobs.length > 0
              ) {
                await tx.additionalCustomerJob.createMany(
                  {
                    data:
                      customer.additionalJobs.map(
                        (job) => ({
                          id: job.id,
                          customerId,
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
                  },
                );
              }
            }

            return tx.customer.findMany({
              where: {
                organisationId:
                  membership.organisationId,
                customerNumber: {
                  in: parsedCustomers.map(
                    (customer) =>
                      customer.customerNumber,
                  ),
                },
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
          },
        );

      return NextResponse.json({
        success: true,
        imported: customers.length,
        customers:
          customers.map(serializeCustomer),
      });
    } catch (bulkError) {
      console.error(
        "Failed to bulk upsert GreenFlow customers:",
        bulkError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to import customers.",
        },
        { status: 500 },
      );
    }
  }

  const customerResult = parseCustomer(body);

  if (!customerResult.success) {
    return NextResponse.json(
      {
        error: customerResult.error,
      },
      { status: 400 },
    );
  }

  const customerInput =
    customerResult.customer;

  const existingCustomer =
    await prisma.customer.findFirst({
      where: {
        organisationId:
          membership.organisationId,
        customerNumber:
          customerInput.customerNumber,
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
              ...customerDatabaseData(
                customerInput,
              ),
            },
          });

        if (
          customerInput.additionalJobs.length > 0
        ) {
          await tx.additionalCustomerJob.createMany({
            data:
              customerInput.additionalJobs.map(
                (job) => ({
                  id: job.id,
                  customerId: createdCustomer.id,
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