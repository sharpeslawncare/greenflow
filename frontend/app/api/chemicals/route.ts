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
        { error: "No GreenFlow organisation membership found." },
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

type BootstrapRecord = Record<string, unknown> & {
  id: string;
};

function isBootstrapRecord(
  value: unknown,
): value is BootstrapRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === "string" &&
    record.id.trim().length > 0
  );
}

function isBootstrapPayload(
  value: unknown,
): value is {
  chemicals: BootstrapRecord[];
  stockMovements: BootstrapRecord[];
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    Array.isArray(payload.chemicals) &&
    payload.chemicals.every(isBootstrapRecord) &&
    Array.isArray(payload.stockMovements) &&
    payload.stockMovements.every(isBootstrapRecord)
  );
}
export async function GET() {
  const { error, membership } = await getCurrentMembership();

  if (error || !membership) {
    return error;
  }

  try {
    const [chemicals, stockMovements] = await Promise.all([
      prisma.chemical.findMany({
        where: {
          organisationId: membership.organisationId,
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.chemicalStockMovement.findMany({
        where: {
          organisationId: membership.organisationId,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    return NextResponse.json({
      chemicals: chemicals.map((chemical) => chemical.data),
      stockMovements: stockMovements.map((movement) => movement.data),
      databaseEmpty:
        chemicals.length === 0 && stockMovements.length === 0,
    });
  } catch (loadError) {
    console.error(
      "Failed to load GreenFlow chemicals:",
      loadError,
    );

    return NextResponse.json(
      { error: "Unable to load chemicals from PostgreSQL." },
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

  if (!isBootstrapPayload(body)) {
    return NextResponse.json(
      { error: "Invalid chemical bootstrap payload." },
      { status: 400 },
    );
  }

  try {
    const existingCount =
      await prisma.chemical.count({
        where: {
          organisationId:
            membership.organisationId,
        },
      });

    const existingMovementCount =
      await prisma.chemicalStockMovement.count({
        where: {
          organisationId:
            membership.organisationId,
        },
      });

    if (
      existingCount > 0 ||
      existingMovementCount > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Chemical database already contains records. Bootstrap refused.",
        },
        { status: 409 },
      );
    }

    await prisma.$transaction([
      ...body.chemicals.map(
        (chemical) =>
          prisma.chemical.create({
            data: {
              id: chemical.id,
              organisationId:
                membership.organisationId,
              name:
                typeof chemical.name === "string"
                  ? chemical.name
                  : "",
              active:
                typeof chemical.active === "boolean"
                  ? chemical.active
                  : true,
              data:
                chemical as Prisma.InputJsonValue,
            },
          }),
      ),

      ...body.stockMovements.map(
        (movement) =>
          prisma.chemicalStockMovement.create({
            data: {
              id: movement.id,
              organisationId:
                membership.organisationId,
              chemicalId:
                typeof movement.chemicalId === "string"
                  ? movement.chemicalId
                  : "",
              date:
                typeof movement.date === "string"
                  ? movement.date
                  : "",
              data:
                movement as Prisma.InputJsonValue,
            },
          }),
      ),
    ]);

    return NextResponse.json({
      importedChemicals:
        body.chemicals.length,
      importedStockMovements:
        body.stockMovements.length,
    });
  } catch (saveError) {
    console.error(
      "Failed to bootstrap GreenFlow chemicals:",
      saveError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to bootstrap chemicals into PostgreSQL.",
      },
      { status: 500 },
    );
  }
}