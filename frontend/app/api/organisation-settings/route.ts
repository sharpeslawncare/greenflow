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

function getStoredObject(
  data: Record<string, unknown>,
  key: string,
) {
  return isRecord(data[key])
    ? data[key]
    : null;
}

function toInputJsonObject(
  value: Record<string, unknown>,
): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

function toInputJsonArray(
  value: unknown[],
): Prisma.InputJsonArray {
  return value as Prisma.InputJsonArray;
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
        business: getStoredObject(data, "business"),
        invoices: getStoredObject(data, "invoices"),
        treatmentLibrary: Array.isArray(data.treatmentLibrary)
          ? data.treatmentLibrary
          : [],
        advisories: Array.isArray(data.advisories)
          ? data.advisories
          : [],
        customChemicalTypes: Array.isArray(data.customChemicalTypes)
          ? data.customChemicalTypes
          : [],
        communications: getStoredObject(data, "communications"),
        treatmentWording: getStoredObject(data, "treatmentWording"),
        branding: getStoredObject(data, "branding"),
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
    !isRecord(body.business) ||
    !isRecord(body.invoices) ||
    !isSettingsArray(body.treatmentLibrary) ||
    !isSettingsArray(body.advisories) ||
    !isSettingsArray(body.customChemicalTypes) ||
    !isRecord(body.communications) ||
    !isRecord(body.treatmentWording) ||
    !isRecord(body.branding)
  ) {
    return NextResponse.json(
      {
        error:
          "Business Settings, Invoice Settings, Treatment Library, Advisories, Custom Chemical Types, Communications Settings, Treatment Wording and Branding Settings must all be provided.",
      },
      { status: 400 },
    );
  }

  const invoiceSettings: Prisma.InputJsonObject = {
    invoicePrefix:
      typeof body.invoices.invoicePrefix === "string"
        ? body.invoices.invoicePrefix
        : "",
    invoiceNumberPadding:
      typeof body.invoices.invoiceNumberPadding === "number"
        ? body.invoices.invoiceNumberPadding
        : 1,
    paymentInstructions:
      typeof body.invoices.paymentInstructions === "string"
        ? body.invoices.paymentInstructions
        : "",
    vatWording:
      typeof body.invoices.vatWording === "string"
        ? body.invoices.vatWording
        : "",
    footerMessage:
      typeof body.invoices.footerMessage === "string"
        ? body.invoices.footerMessage
        : "",
    emailCopyMessage:
      typeof body.invoices.emailCopyMessage === "string"
        ? body.invoices.emailCopyMessage
        : "",
    showAmountIncludingVat:
      body.invoices.showAmountIncludingVat !== false,
  };

  const data: Prisma.InputJsonObject = {
    business: toInputJsonObject(body.business),
    invoices: invoiceSettings,
    treatmentLibrary:
      toInputJsonArray(body.treatmentLibrary),
    advisories:
      toInputJsonArray(body.advisories),
    customChemicalTypes:
      toInputJsonArray(body.customChemicalTypes),
    communications:
      toInputJsonObject(body.communications),
    treatmentWording:
      toInputJsonObject(body.treatmentWording),
    branding:
      toInputJsonObject(body.branding),
  };

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
        business: body.business,
        invoices: invoiceSettings,
        treatmentLibrary: body.treatmentLibrary,
        advisories: body.advisories,
        customChemicalTypes: body.customChemicalTypes,
        communications: body.communications,
        treatmentWording: body.treatmentWording,
        branding: body.branding,
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