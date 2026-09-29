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

function isProgrammePayload(
  value: unknown,
): value is Record<string, unknown> & {
  id: string;
  customerNumber: string;
  year: number;
} {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const programme =
    value as Record<string, unknown>;

  return (
    typeof programme.id === "string" &&
    programme.id.trim().length > 0 &&
    typeof programme.customerNumber === "string" &&
    programme.customerNumber.trim().length > 0 &&
    typeof programme.year === "number" &&
    Number.isInteger(programme.year)
  );
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
    !("programme" in body) ||
    !isProgrammePayload(
      (body as { programme?: unknown }).programme,
    )
  ) {
    return NextResponse.json(
      { error: "Invalid programme payload." },
      { status: 400 },
    );
  }

  const programme =
    (body as {
      programme: Record<string, unknown> & {
        id: string;
        customerNumber: string;
        year: number;
      };
    }).programme;

  const customerNumber =
    programme.customerNumber.trim();

  try {
    const customer = await prisma.customer.findFirst({
      where: {
        organisationId:
          membership.organisationId,
        customerNumber,
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "Programme customer was not found in this organisation.",
        },
        { status: 404 },
      );
    }

    const programmeJson =
      programme as Prisma.InputJsonValue;

    const savedProgramme =
      await prisma.programme.upsert({
        where: {
          customerId_year: {
            customerId: customer.id,
            year: programme.year,
          },
        },
        create: {
          id: programme.id,
          organisationId:
            membership.organisationId,
          customerId: customer.id,
          year: programme.year,
          data: programmeJson,
        },
        update: {
          data: programmeJson,
        },
      });

    return NextResponse.json({
      programme: savedProgramme.data,
    });
  } catch (saveError) {
    console.error(
      "Failed to save GreenFlow programme:",
      saveError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to save programme to PostgreSQL.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  const { error, membership } =
    await getCurrentMembership();

  if (error || !membership) {
    return error;
  }

  try {
    const programmes =
      await prisma.programme.findMany({
        where: {
          organisationId:
            membership.organisationId,
        },
        orderBy: [
          {
            year: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      });

    return NextResponse.json({
      programmes: programmes.map(
        (programme) => programme.data,
      ),
    });
  } catch (loadError) {
    console.error(
      "Failed to load GreenFlow programmes:",
      loadError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load programmes from PostgreSQL.",
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
    !("programmeId" in body) ||
    typeof (body as { programmeId?: unknown })
      .programmeId !== "string" ||
    (body as { programmeId: string })
      .programmeId.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "Invalid programme ID." },
      { status: 400 },
    );
  }

  const programmeId = (
    body as { programmeId: string }
  ).programmeId.trim();

  try {
    const programme =
      await prisma.programme.findFirst({
        where: {
          id: programmeId,
          organisationId:
            membership.organisationId,
        },
        select: {
          id: true,
        },
      });

    if (!programme) {
      return NextResponse.json(
        {
          error:
            "Programme was not found in this organisation.",
        },
        { status: 404 },
      );
    }

    await prisma.programme.delete({
      where: {
        id: programme.id,
      },
    });

    return NextResponse.json({
      deletedProgrammeId: programme.id,
    });
  } catch (deleteError) {
    console.error(
      "Failed to delete GreenFlow programme:",
      deleteError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to delete programme from PostgreSQL.",
      },
      { status: 500 },
    );
  }
}
