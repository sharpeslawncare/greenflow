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

function isValidDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
  );
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(request: Request) {
  const { error, membership } = await getCurrentMembership();

  if (error || !membership) {
    return error;
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date")?.trim();

  try {
    if (date) {
      if (!isValidDate(date)) {
        return NextResponse.json(
          { error: "Invalid working day date." },
          { status: 400 },
        );
      }

      const workingDay = await prisma.workingDay.findUnique({
        where: {
          organisationId_date: {
            organisationId: membership.organisationId,
            date,
          },
        },
      });

      return NextResponse.json({
        workingDay: workingDay
          ? {
              id: workingDay.id,
              date: workingDay.date,
              chemicalsChecked: workingDay.chemicalsChecked,
              quickbooksExported: workingDay.quickbooksExported,
              closed: workingDay.closed,
              updatedAt: workingDay.updatedAt,
            }
          : null,
      });
    }

    const workingDays = await prisma.workingDay.findMany({
      where: {
        organisationId: membership.organisationId,
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json({
      workingDays: workingDays.map((workingDay) => ({
        id: workingDay.id,
        date: workingDay.date,
        chemicalsChecked: workingDay.chemicalsChecked,
        quickbooksExported: workingDay.quickbooksExported,
        closed: workingDay.closed,
        updatedAt: workingDay.updatedAt,
      })),
    });
  } catch (loadError) {
    console.error(
      "Failed to load GreenFlow working days:",
      loadError,
    );

    return NextResponse.json(
      { error: "Unable to load working days from PostgreSQL." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const { error, membership } = await getCurrentMembership();

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

  if (!isRecord(body) || !isValidDate(body.date)) {
    return NextResponse.json(
      { error: "A valid working day date is required." },
      { status: 400 },
    );
  }

  const date = body.date.trim();

  const booleanFields = [
    "chemicalsChecked",
    "quickbooksExported",
    "closed",
  ] as const;

  for (const field of booleanFields) {
    if (
      field in body &&
      typeof body[field] !== "boolean"
    ) {
      return NextResponse.json(
        { error: `${field} must be a boolean.` },
        { status: 400 },
      );
    }
  }

  try {
    const existing = await prisma.workingDay.findUnique({
      where: {
        organisationId_date: {
          organisationId: membership.organisationId,
          date,
        },
      },
    });

    const saved = await prisma.workingDay.upsert({
      where: {
        organisationId_date: {
          organisationId: membership.organisationId,
          date,
        },
      },
      create: {
        id: `working-day-${membership.organisationId}-${date}`,
        organisationId: membership.organisationId,
        date,
        chemicalsChecked:
          body.chemicalsChecked === true,
        quickbooksExported:
          body.quickbooksExported === true,
        closed:
          body.closed === true,
      },
      update: {
        ...(typeof body.chemicalsChecked === "boolean"
          ? {
              chemicalsChecked:
                body.chemicalsChecked,
            }
          : {}),
        ...(typeof body.quickbooksExported === "boolean"
          ? {
              quickbooksExported:
                body.quickbooksExported,
            }
          : {}),
        ...(typeof body.closed === "boolean"
          ? {
              closed: body.closed,
            }
          : {}),
      },
    });

    return NextResponse.json({
      workingDay: {
        id: saved.id,
        date: saved.date,
        chemicalsChecked: saved.chemicalsChecked,
        quickbooksExported: saved.quickbooksExported,
        closed: saved.closed,
        updatedAt: saved.updatedAt,
      },
      created: !existing,
    });
  } catch (saveError) {
    console.error(
      "Failed to save GreenFlow working day:",
      saveError,
    );

    return NextResponse.json(
      { error: "Unable to save working day to PostgreSQL." },
      { status: 500 },
    );
  }
}
