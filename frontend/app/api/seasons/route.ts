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

function isSeasonPayload(
  value: unknown,
): value is Record<string, unknown> & {
  id: string;
  year: number;
} {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const season =
    value as Record<string, unknown>;

  return (
    typeof season.id === "string" &&
    season.id.trim().length > 0 &&
    typeof season.year === "number" &&
    Number.isInteger(season.year)
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
    !("season" in body) ||
    !isSeasonPayload(
      (body as { season?: unknown }).season,
    )
  ) {
    return NextResponse.json(
      { error: "Invalid season payload." },
      { status: 400 },
    );
  }

  const season =
    (body as {
      season: Record<string, unknown> & {
        id: string;
        year: number;
      };
    }).season;

  const seasonJson =
    season as Prisma.InputJsonValue;

  try {
    const savedSeason =
      await prisma.season.upsert({
        where: {
          organisationId_year: {
            organisationId:
              membership.organisationId,
            year: season.year,
          },
        },
        create: {
          id: season.id,
          organisationId:
            membership.organisationId,
          year: season.year,
          data: seasonJson,
        },
        update: {
          data: seasonJson,
        },
      });

    return NextResponse.json({
      season: savedSeason.data,
    });
  } catch (saveError) {
    console.error(
      "Failed to save GreenFlow season:",
      saveError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to save season to PostgreSQL.",
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
    const seasons = await prisma.season.findMany({
      where: {
        organisationId: membership.organisationId,
      },
      orderBy: {
        year: "asc",
      },
    });

    return NextResponse.json({
      seasons: seasons.map((season) => season.data),
    });
  } catch (loadError) {
    console.error(
      "Failed to load GreenFlow seasons:",
      loadError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load seasons from PostgreSQL.",
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
      { error: "Invalid season delete payload." },
      { status: 400 },
    );
  }

  const year =
    (body as { year?: unknown }).year;

  if (
    typeof year !== "number" ||
    !Number.isInteger(year)
  ) {
    return NextResponse.json(
      { error: "A valid season year is required." },
      { status: 400 },
    );
  }

  try {
    await prisma.season.deleteMany({
      where: {
        organisationId:
          membership.organisationId,
        year,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (deleteError) {
    console.error(
      "Failed to delete GreenFlow season:",
      deleteError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to delete season from PostgreSQL.",
      },
      { status: 500 },
    );
  }
}