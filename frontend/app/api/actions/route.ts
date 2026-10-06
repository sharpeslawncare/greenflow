import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type ActionType =
  | "Call back"
  | "Quote follow-up"
  | "Payment"
  | "Access issue"
  | "Programme change"
  | "Customer request"
  | "Other";

type ActionPriority = "Normal" | "High" | "Urgent";
type ActionStatus = "Open" | "Completed" | "Cancelled";

type ActionInput = {
  id: string;
  customerNumber: string;
  customerName: string;
  type: ActionType;
  priority: ActionPriority;
  status: ActionStatus;
  dueDate: string;
  note: string;
  createdAt: string;
  completedAt: string;
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

function isDateValue(value: unknown): value is string {
  return value === "" || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function normaliseInput(value: unknown): ActionInput | null {
  if (!isRecord(value)) return null;

  const allowedTypes: ActionType[] = [
    "Call back",
    "Quote follow-up",
    "Payment",
    "Access issue",
    "Programme change",
    "Customer request",
    "Other",
  ];
  const allowedPriorities: ActionPriority[] = ["Normal", "High", "Urgent"];
  const allowedStatuses: ActionStatus[] = ["Open", "Completed", "Cancelled"];

  if (
    typeof value.id !== "string" ||
    !value.id.trim() ||
    typeof value.customerNumber !== "string" ||
    !value.customerNumber.trim() ||
    !allowedTypes.includes(value.type as ActionType) ||
    !allowedPriorities.includes(value.priority as ActionPriority) ||
    !allowedStatuses.includes(value.status as ActionStatus) ||
    !isDateValue(value.dueDate) ||
    typeof value.note !== "string" ||
    !value.note.trim()
  ) {
    return null;
  }

  return {
    id: value.id.trim(),
    customerNumber: value.customerNumber.trim(),
    customerName: typeof value.customerName === "string" ? value.customerName : "",
    type: value.type as ActionType,
    priority: value.priority as ActionPriority,
    status: value.status as ActionStatus,
    dueDate: value.dueDate as string,
    note: value.note.trim(),
    createdAt:
      typeof value.createdAt === "string" &&
      !Number.isNaN(new Date(value.createdAt).getTime())
        ? value.createdAt
        : new Date().toISOString(),
    completedAt: typeof value.completedAt === "string" ? value.completedAt : "",
  };
}

function toResponse(record: {
  id: string;
  customerNumber: string;
  customerName: string;
  type: string;
  priority: string;
  status: string;
  dueDate: string;
  note: string;
  createdAt: Date;
  completedAt: string;
}) {
  return {
    id: record.id,
    customerNumber: record.customerNumber,
    customerName: record.customerName,
    type: record.type,
    priority: record.priority,
    status: record.status,
    dueDate: record.dueDate,
    note: record.note,
    createdAt: record.createdAt.toISOString(),
    completedAt: record.completedAt,
  };
}

export async function GET() {
  const { error, membership } = await getCurrentMembership();
  if (error || !membership) return error;

  try {
    const records = await prisma.customerAction.findMany({
      where: { organisationId: membership.organisationId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ records: records.map(toResponse) });
  } catch (loadError) {
    console.error("Failed to load GreenFlow actions:", loadError);
    return NextResponse.json(
      { error: "Unable to load actions from PostgreSQL." },
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

  const rawRecords = isRecord(body) && Array.isArray(body.records) ? body.records : [body];
  const records = rawRecords.map(normaliseInput);

  if (records.length === 0 || records.some((record) => !record)) {
    return NextResponse.json({ error: "Invalid action record." }, { status: 400 });
  }

  const validRecords = records as ActionInput[];

  try {
    const ids = validRecords.map((record) => record.id);
    const conflicting = await prisma.customerAction.findMany({
      where: {
        id: { in: ids },
        organisationId: { not: membership.organisationId },
      },
      select: { id: true },
    });

    if (conflicting.length > 0) {
      return NextResponse.json(
        { error: "One or more action IDs belong to another organisation." },
        { status: 409 },
      );
    }

    await prisma.customerAction.createMany({
      data: validRecords.map((record) => ({
        id: record.id,
        organisationId: membership.organisationId,
        customerNumber: record.customerNumber,
        customerName: record.customerName,
        type: record.type,
        priority: record.priority,
        status: record.status,
        dueDate: record.dueDate,
        note: record.note,
        createdAt: new Date(record.createdAt),
        completedAt: record.completedAt,
      })),
      skipDuplicates: true,
    });

    const saved = await prisma.customerAction.findMany({
      where: { organisationId: membership.organisationId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ records: saved.map(toResponse) });
  } catch (saveError) {
    console.error("Failed to save GreenFlow actions:", saveError);
    return NextResponse.json(
      { error: "Unable to save actions to PostgreSQL." },
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

  const record = normaliseInput(body);
  if (!record) {
    return NextResponse.json({ error: "Invalid action record." }, { status: 400 });
  }

  try {
    const existing = await prisma.customerAction.findFirst({
      where: { id: record.id, organisationId: membership.organisationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Action record not found." }, { status: 404 });
    }

    const saved = await prisma.customerAction.update({
      where: { id: existing.id },
      data: {
        customerNumber: record.customerNumber,
        customerName: record.customerName,
        type: record.type,
        priority: record.priority,
        status: record.status,
        dueDate: record.dueDate,
        note: record.note,
        completedAt: record.completedAt,
      },
    });

    return NextResponse.json({ record: toResponse(saved) });
  } catch (saveError) {
    console.error("Failed to update GreenFlow action:", saveError);
    return NextResponse.json(
      { error: "Unable to update action in PostgreSQL." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const { error, membership } = await getCurrentMembership();
  if (error || !membership) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.id !== "string" || !body.id.trim()) {
    return NextResponse.json({ error: "An action ID is required." }, { status: 400 });
  }

  try {
    const existing = await prisma.customerAction.findFirst({
      where: { id: body.id.trim(), organisationId: membership.organisationId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Action record not found." }, { status: 404 });
    }

    await prisma.customerAction.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (deleteError) {
    console.error("Failed to delete GreenFlow action:", deleteError);
    return NextResponse.json(
      { error: "Unable to delete action from PostgreSQL." },
      { status: 500 },
    );
  }
}