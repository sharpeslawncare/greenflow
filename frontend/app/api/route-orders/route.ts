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
    !("routeOrder" in body)
  ) {
    return NextResponse.json(
      { error: "Invalid route order payload." },
      { status: 400 },
    );
  }

  const routeOrder = (
    body as {
      routeOrder?: unknown;
    }
  ).routeOrder;

  if (
    typeof routeOrder !== "object" ||
    routeOrder === null
  ) {
    return NextResponse.json(
      { error: "Invalid route order payload." },
      { status: 400 },
    );
  }

  const value =
    routeOrder as Record<string, unknown>;

  if (
    typeof value.date !== "string" ||
    value.date.trim().length === 0 ||
    typeof value.vanNumber !== "number" ||
    !Number.isInteger(value.vanNumber) ||
    value.vanNumber <= 0 ||
    !Array.isArray(value.customerNumbers) ||
    !value.customerNumbers.every(
      (customerNumber) =>
        typeof customerNumber === "string",
    )
  ) {
    return NextResponse.json(
      { error: "Invalid route order payload." },
      { status: 400 },
    );
  }

  const date = value.date.trim();
  const vanNumber = value.vanNumber;

  const customerNumbers = Array.from(
    new Set(
      value.customerNumbers
        .map((customerNumber) =>
          customerNumber.trim(),
        )
        .filter(Boolean),
    ),
  );

  try {
    const savedRouteOrder =
      await prisma.routeOrder.upsert({
        where: {
          organisationId_date_vanNumber: {
            organisationId:
              membership.organisationId,
            date,
            vanNumber,
          },
        },
        create: {
          organisationId:
            membership.organisationId,
          date,
          vanNumber,
          customerNumbers,
        },
        update: {
          customerNumbers,
        },
      });

    return NextResponse.json({
      routeOrder: {
        date: savedRouteOrder.date,
        vanNumber:
          savedRouteOrder.vanNumber,
        customerNumbers:
          savedRouteOrder.customerNumbers,
        updatedAt:
          savedRouteOrder.updatedAt.toISOString(),
      },
    });
  } catch (saveError) {
    console.error(
      "Failed to save GreenFlow route order:",
      saveError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to save route order to PostgreSQL.",
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
    const routeOrders =
      await prisma.routeOrder.findMany({
        where: {
          organisationId:
            membership.organisationId,
        },
        orderBy: [
          {
            date: "asc",
          },
          {
            vanNumber: "asc",
          },
        ],
      });

    return NextResponse.json({
      routeOrders: routeOrders.map(
        (routeOrder) => ({
          date: routeOrder.date,
          vanNumber: routeOrder.vanNumber,
          customerNumbers:
            routeOrder.customerNumbers,
          updatedAt:
            routeOrder.updatedAt.toISOString(),
        }),
      ),
    });
  } catch (loadError) {
    console.error(
      "Failed to load GreenFlow route orders:",
      loadError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load route orders from PostgreSQL.",
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
    body === null
  ) {
    return NextResponse.json(
      { error: "Invalid route order payload." },
      { status: 400 },
    );
  }

  const value =
    body as Record<string, unknown>;

  if (
    typeof value.date !== "string" ||
    value.date.trim().length === 0 ||
    typeof value.vanNumber !== "number" ||
    !Number.isInteger(value.vanNumber) ||
    value.vanNumber <= 0
  ) {
    return NextResponse.json(
      { error: "Invalid route order payload." },
      { status: 400 },
    );
  }

  const date = value.date.trim();
  const vanNumber = value.vanNumber;

  try {
    const routeOrder =
      await prisma.routeOrder.findFirst({
        where: {
          organisationId:
            membership.organisationId,
          date,
          vanNumber,
        },
        select: {
          id: true,
        },
      });

    if (!routeOrder) {
      return NextResponse.json(
        {
          error:
            "Route order was not found in this organisation.",
        },
        { status: 404 },
      );
    }

    await prisma.routeOrder.delete({
      where: {
        id: routeOrder.id,
      },
    });

    return NextResponse.json({
      deletedRouteOrder: {
        date,
        vanNumber,
      },
    });
  } catch (deleteError) {
    console.error(
      "Failed to delete GreenFlow route order:",
      deleteError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to delete route order from PostgreSQL.",
      },
      { status: 500 },
    );
  }
}
