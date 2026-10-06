import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type AuditInput = {
  id: string;
  createdAt: string;
  user: string;
  area: string;
  action: string;
  reference: string;
  description: string;
  changedFields: string[];
};

async function getCurrentMembership() {
  const session = await auth();

  if (!session?.user?.email) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      membership: null,
    };
  }

  const membership = await prisma.membership.findFirst({
    where: { user: { email: session.user.email.toLowerCase() } },
    select: { organisationId: true },
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

  return { error: null, membership };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normaliseInput(value: unknown): AuditInput | null {
  if (!isRecord(value)) return null;

  if (
    typeof value.id !== "string" ||
    !value.id.trim() ||
    typeof value.createdAt !== "string" ||
    Number.isNaN(new Date(value.createdAt).getTime()) ||
    typeof value.user !== "string" ||
    !value.user.trim() ||
    typeof value.area !== "string" ||
    !value.area.trim() ||
    typeof value.action !== "string" ||
    !value.action.trim() ||
    typeof value.reference !== "string" ||
    typeof value.description !== "string" ||
    !Array.isArray(value.changedFields) ||
    !value.changedFields.every((field) => typeof field === "string")
  ) {
    return null;
  }

  return {
    id: value.id.trim(),
    createdAt: value.createdAt,
    user: value.user.trim(),
    area: value.area.trim(),
    action: value.action.trim(),
    reference: value.reference.trim(),
    description: value.description.trim(),
    changedFields: Array.from(
      new Set(
        value.changedFields
          .map((field) => field.trim())
          .filter(Boolean),
      ),
    ).sort((first, second) => first.localeCompare(second)),
  };
}

function toResponse(record: {
  id: string;
  createdAt: Date;
  user: string;
  area: string;
  action: string;
  reference: string;
  description: string;
  changedFields: unknown;
}) {
  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    user: record.user,
    area: record.area,
    action: record.action,
    reference: record.reference,
    description: record.description,
    changedFields: Array.isArray(record.changedFields)
      ? record.changedFields.filter(
          (field): field is string => typeof field === "string",
        )
      : [],
  };
}

export async function GET() {
  const { error, membership } = await getCurrentMembership();
  if (error || !membership) return error;

  try {
    const records = await prisma.auditEntry.findMany({
      where: { organisationId: membership.organisationId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ records: records.map(toResponse) });
  } catch (loadError) {
    console.error("Failed to load GreenFlow audit trail:", loadError);
    return NextResponse.json(
      { error: "Unable to load audit trail from PostgreSQL." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { error, membership } = await getCurrentMembership();
  if (error || !membership) return error;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }

  const rawRecords =
    isRecord(body) && Array.isArray(body.records) ? body.records : [body];

  const records = rawRecords.map(normaliseInput);

  if (records.length === 0 || records.some((record) => !record)) {
    return NextResponse.json(
      { error: "Invalid audit record." },
      { status: 400 },
    );
  }

  const validRecords = records as AuditInput[];

  try {
    const ids = validRecords.map((record) => record.id);

    const conflicting = await prisma.auditEntry.findMany({
      where: {
        id: { in: ids },
        organisationId: { not: membership.organisationId },
      },
      select: { id: true },
    });

    if (conflicting.length > 0) {
      return NextResponse.json(
        { error: "One or more audit IDs belong to another organisation." },
        { status: 409 },
      );
    }

    await prisma.auditEntry.createMany({
      data: validRecords.map((record) => ({
        id: record.id,
        organisationId: membership.organisationId,
        createdAt: new Date(record.createdAt),
        user: record.user,
        area: record.area,
        action: record.action,
        reference: record.reference,
        description: record.description,
        changedFields: record.changedFields,
      })),
      skipDuplicates: true,
    });

    const saved = await prisma.auditEntry.findMany({
      where: {
        organisationId: membership.organisationId,
        id: { in: ids },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ records: saved.map(toResponse) });
  } catch (saveError) {
    console.error("Failed to save GreenFlow audit trail:", saveError);
    return NextResponse.json(
      { error: "Unable to save audit trail to PostgreSQL." },
      { status: 500 },
    );
  }
}