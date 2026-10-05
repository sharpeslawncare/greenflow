import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type CommunicationInput = {
  id: string;
  customerNumber: string;
  customerName: string;
  channel: "SMS" | "Email" | "Telephone";
  status: "Queued" | "Sent" | "Failed" | "Cancelled";
  subject: string;
  message: string;
  scheduledDate: string;
  treatmentName: string;
  jobType: "programme" | "additional";
  createdAt: string;
  sentAt: string;
};

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

  return { error: null, membership };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDateValue(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normaliseInput(value: unknown): CommunicationInput | null {
  if (!isRecord(value)) return null;

  const channel = value.channel;
  const status = value.status;
  const jobType = value.jobType;

  if (
    typeof value.id !== "string" ||
    !value.id.trim() ||
    typeof value.customerNumber !== "string" ||
    !value.customerNumber.trim() ||
    !(channel === "SMS" || channel === "Email" || channel === "Telephone") ||
    !(status === "Queued" || status === "Sent" || status === "Failed" || status === "Cancelled") ||
    !isDateValue(value.scheduledDate) ||
    !(jobType === "programme" || jobType === "additional")
  ) {
    return null;
  }

  return {
    id: value.id.trim(),
    customerNumber: value.customerNumber.trim(),
    customerName: typeof value.customerName === "string" ? value.customerName : "",
    channel,
    status,
    subject: typeof value.subject === "string" ? value.subject : "",
    message: typeof value.message === "string" ? value.message : "",
    scheduledDate: value.scheduledDate,
    treatmentName: typeof value.treatmentName === "string" ? value.treatmentName : "",
    jobType,
    createdAt:
      typeof value.createdAt === "string" &&
      !Number.isNaN(new Date(value.createdAt).getTime())
        ? value.createdAt
        : new Date().toISOString(),
    sentAt: typeof value.sentAt === "string" ? value.sentAt : "",
  };
}

function toResponse(record: {
  id: string; customerNumber: string; customerName: string; channel: string; status: string;
  subject: string; message: string; scheduledDate: string; treatmentName: string; jobType: string;
  createdAt: Date; sentAt: string;
}) {
  return {
    id: record.id,
    customerNumber: record.customerNumber,
    customerName: record.customerName,
    channel: record.channel,
    status: record.status,
    subject: record.subject,
    message: record.message,
    scheduledDate: record.scheduledDate,
    treatmentName: record.treatmentName,
    jobType: record.jobType,
    createdAt: record.createdAt.toISOString(),
    sentAt: record.sentAt,
  };
}

export async function GET() {
  const { error, membership } = await getCurrentMembership();
  if (error || !membership) return error;

  try {
    const records = await prisma.communication.findMany({
      where: { organisationId: membership.organisationId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      records: records.map(toResponse),
    });
  } catch (loadError) {
    console.error("Failed to load GreenFlow communications:", loadError);
    return NextResponse.json(
      { error: "Unable to load communications from PostgreSQL." },
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
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const rawRecords = isRecord(body) && Array.isArray(body.records)
    ? body.records
    : [body];
  const records = rawRecords.map(normaliseInput);

  if (records.length === 0 || records.some((record) => !record)) {
    return NextResponse.json({ error: "Invalid communication record." }, { status: 400 });
  }

  const validRecords = records as CommunicationInput[];

  try {
    const ids = validRecords.map((record) => record.id);
    const conflicting = await prisma.communication.findMany({
      where: {
        id: { in: ids },
        organisationId: { not: membership.organisationId },
      },
      select: { id: true },
    });

    if (conflicting.length > 0) {
      return NextResponse.json(
        { error: "One or more communication IDs belong to another organisation." },
        { status: 409 },
      );
    }

    await prisma.communication.createMany({
      data: validRecords.map((record) => ({
        id: record.id,
        organisationId: membership.organisationId,
        customerNumber: record.customerNumber,
        customerName: record.customerName,
        channel: record.channel,
        status: record.status,
        subject: record.subject,
        message: record.message,
        scheduledDate: record.scheduledDate,
        treatmentName: record.treatmentName,
        jobType: record.jobType,
        createdAt: new Date(record.createdAt),
        sentAt: record.sentAt,
      })),
      skipDuplicates: true,
    });

    const saved = await prisma.communication.findMany({
      where: { organisationId: membership.organisationId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ records: saved.map(toResponse) });
  } catch (saveError) {
    console.error("Failed to save GreenFlow communications:", saveError);
    return NextResponse.json(
      { error: "Unable to save communications to PostgreSQL." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const { error, membership } = await getCurrentMembership();
  if (error || !membership) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.id !== "string") {
    return NextResponse.json({ error: "A communication ID is required." }, { status: 400 });
  }

  const status = body.status;
  if (!(status === "Queued" || status === "Sent" || status === "Failed" || status === "Cancelled")) {
    return NextResponse.json({ error: "A valid communication status is required." }, { status: 400 });
  }

  try {
    const existing = await prisma.communication.findFirst({
      where: { id: body.id, organisationId: membership.organisationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Communication record not found." }, { status: 404 });
    }

    const saved = await prisma.communication.update({
      where: { id: existing.id },
      data: {
        status,
        sentAt: typeof body.sentAt === "string" ? body.sentAt : existing.sentAt,
      },
    });

    return NextResponse.json({ record: toResponse(saved) });
  } catch (saveError) {
    console.error("Failed to update GreenFlow communication:", saveError);
    return NextResponse.json(
      { error: "Unable to update communication in PostgreSQL." },
      { status: 500 },
    );
  }
}