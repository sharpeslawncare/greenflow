import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

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

export async function GET() {
  const { error, membership } =
    await getCurrentMembership();

  if (error || !membership) {
    return error;
  }

  try {
    const treatments =
      await prisma.treatment.findMany({
        where: {
          organisationId:
            membership.organisationId,
        },
        orderBy: [
          {
            recordedDate: "desc",
          },
          {
            updatedAt: "desc",
          },
        ],
      });

    return NextResponse.json({
      treatments: treatments.map(
        (treatment) => treatment.data,
      ),
    });
  } catch (loadError) {
    console.error(
      "Failed to load GreenFlow treatments:",
      loadError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load treatments from PostgreSQL.",
      },
      { status: 500 },
    );
  }
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
    typeof body !== "object" ||
    body === null ||
    !("treatment" in body)
  ) {
    return NextResponse.json(
      { error: "Invalid treatment payload." },
      { status: 400 },
    );
  }

  const treatment = (
    body as {
      treatment?: unknown;
    }
  ).treatment;

  if (
    typeof treatment !== "object" ||
    treatment === null
  ) {
    return NextResponse.json(
      { error: "Invalid treatment payload." },
      { status: 400 },
    );
  }

  const value =
    treatment as Record<string, unknown>;

  if (
    typeof value.id !== "string" ||
    value.id.trim().length === 0 ||
    typeof value.customerNumber !== "string" ||
    value.customerNumber.trim().length === 0 ||
    typeof value.programmeId !== "string" ||
    typeof value.programmeVisitId !== "string" ||
    typeof value.invoiceNumber !== "string" ||
    typeof value.recordedDate !== "string" ||
    typeof value.status !== "string" ||
    !Array.isArray(value.applications)
  ) {
    return NextResponse.json(
      { error: "Invalid treatment payload." },
      { status: 400 },
    );
  }

  const id = value.id.trim();
  const customerNumber =
    value.customerNumber.trim();
  const programmeId =
    value.programmeId.trim();
  const programmeVisitId =
    value.programmeVisitId.trim();
  const invoiceNumber =
    value.invoiceNumber.trim();
  const invoiceNumberNormalized =
    invoiceNumber.toUpperCase();
  const recordedDate =
    value.recordedDate.trim();

  if (
    value.status === "Completed" &&
    !invoiceNumber
  ) {
    return NextResponse.json(
      {
        reason: "missing-invoice",
        error:
          "A completed treatment must have a reserved invoice number before it can be saved.",
      },
      { status: 400 },
    );
  }

  try {
    const customer =
      await prisma.customer.findUnique({
        where: {
          organisationId_customerNumber: {
            organisationId:
              membership.organisationId,
            customerNumber,
          },
        },
        select: {
          id: true,
        },
      });

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "Treatment customer was not found in this organisation.",
        },
        { status: 404 },
      );
    }

    if (programmeId && programmeVisitId) {
      const duplicateTreatment =
        await prisma.treatment.findFirst({
          where: {
            organisationId:
              membership.organisationId,
            programmeId,
            programmeVisitId,
            NOT: {
              id,
            },
          },
          select: {
            id: true,
          },
        });

      if (duplicateTreatment) {
        return NextResponse.json(
          {
            reason: "duplicate-treatment",
            error:
              "Another treatment record already exists for this programme visit.",
          },
          { status: 409 },
        );
      }
    }

    if (invoiceNumberNormalized) {
      const duplicateInvoice =
        await prisma.treatment.findFirst({
          where: {
            organisationId:
              membership.organisationId,
            invoiceNumberNormalized,
            NOT: {
              id,
            },
          },
          select: {
            id: true,
          },
        });

      if (duplicateInvoice) {
        return NextResponse.json(
          {
            reason: "duplicate-invoice",
            error:
              `Invoice number ${invoiceNumber} is already attached to another treatment record.`,
          },
          { status: 409 },
        );
      }
    }

    const existingTreatmentById =
      await prisma.treatment.findUnique({
        where: {
          id,
        },
        select: {
          organisationId: true,
        },
      });

    if (
      existingTreatmentById &&
      existingTreatmentById.organisationId !==
        membership.organisationId
    ) {
      return NextResponse.json(
        {
          error:
            "Treatment record does not belong to this organisation.",
        },
        { status: 403 },
      );
    }

    const treatmentJson =
      treatment as Prisma.InputJsonValue;

    const savedTreatment =
      await prisma.treatment.upsert({
        where: {
          id,
        },
        create: {
          id,
          organisationId:
            membership.organisationId,
          customerNumber,
          programmeId,
          programmeVisitId,
          invoiceNumberNormalized,
          recordedDate,
          data: treatmentJson,
        },
        update: {
          customerNumber,
          programmeId,
          programmeVisitId,
          invoiceNumberNormalized,
          recordedDate,
          data: treatmentJson,
        },
      });

    return NextResponse.json({
      treatment: savedTreatment.data,
    });
  } catch (saveError) {
    console.error(
      "Failed to save GreenFlow treatment:",
      saveError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to save treatment to PostgreSQL.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
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
    typeof body !== "object" ||
    body === null ||
    !("treatmentId" in body)
  ) {
    return NextResponse.json(
      { error: "Invalid treatment delete payload." },
      { status: 400 },
    );
  }

  const treatmentId = (
    body as {
      treatmentId?: unknown;
    }
  ).treatmentId;

  if (
    typeof treatmentId !== "string" ||
    treatmentId.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "Invalid treatment delete payload." },
      { status: 400 },
    );
  }

  const id = treatmentId.trim();

  try {
    const existing =
      await prisma.treatment.findFirst({
        where: {
          id,
          organisationId:
            membership.organisationId,
        },
        select: {
          id: true,
        },
      });

    if (existing) {
      await prisma.treatment.delete({
        where: {
          id: existing.id,
        },
      });
    }

    return NextResponse.json({
      deletedTreatment: {
        id,
      },
    });
  } catch (deleteError) {
    console.error(
      "Failed to delete GreenFlow treatment:",
      deleteError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to delete treatment from PostgreSQL.",
      },
      { status: 500 },
    );
  }
}
