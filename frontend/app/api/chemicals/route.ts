import { NextResponse } from "next/server";

import { auth } from "@/auth";
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
