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

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSettingsArray(value: unknown) {
  return Array.isArray(value);
}

export async function GET() {
  const { error, membership } = await getCurrentMembership();

  if (error || !membership) {
    return error;
  }

  try {
    const organisationSettings =
      await prisma.organisationSettings.findUnique({
        where: {
          organisationId: membership.organisationId,
        },
      });

    if (!organisationSettings) {
      return NextResponse.json({
        settings: null,
      });
    }

    const data = isRecord(organisationSettings.data)
      ? organisationSettings.data
      : {};

    return NextResponse.json({
      settings: {
        treatmentLibrary: Array.isArray(data.treatmentLibrary)
          ? data.treatmentLibrary
          : [],
        advisories: Array.isArray(data.advisories)
          ? data.advisories
          : [],
      },
      updatedAt: organisationSettings.updatedAt,
    });
  } catch (loadError) {
    console.error(
      "Failed to load GreenFlow organisation settings:",
      loadError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load organisation settings from PostgreSQL.",
      },
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

  if (!isRecord(body)) {
    return NextResponse.json(
      { error: "Invalid organisation settings." },
      { status: 400 },
    );
  }

  if (
    !isSettingsArray(body.treatmentLibrary) ||
    !isSettingsArray(body.advisories)
  ) {
    return NextResponse.json(
      {
        error:
          "Treatment Library and Advisories must both be provided.",
      },
      { status: 400 },
    );
  }

  const data = {
    treatmentLibrary: body.treatmentLibrary,
    advisories: body.advisories,
  } satisfies Prisma.InputJsonObject;

  try {
    const existing =
      await prisma.organisationSettings.findUnique({
        where: {
          organisationId: membership.organisationId,
        },
      });

    const saved = await prisma.organisationSettings.upsert({
      where: {
        organisationId: membership.organisationId,
      },
      create: {
        id: `organisation-settings-${membership.organisationId}`,
        organisationId: membership.organisationId,
        data,
      },
      update: {
        data,
      },
    });

    return NextResponse.json({
      settings: {
        treatmentLibrary: body.treatmentLibrary,
        advisories: body.advisories,
      },
      updatedAt: saved.updatedAt,
      created: !existing,
    });
  } catch (saveError) {
    console.error(
      "Failed to save GreenFlow organisation settings:",
      saveError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to save organisation settings to PostgreSQL.",
      },
      { status: 500 },
    );
  }
}