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

function readPositiveSafeInteger(
  value: unknown,
) {
  const numericValue = Number(value);

  if (
    !Number.isSafeInteger(numericValue) ||
    numericValue < 1
  ) {
    return null;
  }

  return numericValue;
}

export async function GET() {
  const { error, membership } = await getCurrentMembership();

  if (error || !membership) {
    return error;
  }

  try {
    const sequence = await prisma.invoiceSequence.findUnique({
      where: {
        organisationId: membership.organisationId,
      },
      select: {
        nextNumber: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      nextInvoiceNumber: sequence?.nextNumber ?? null,
      updatedAt: sequence?.updatedAt ?? null,
    });
  } catch (loadError) {
    console.error(
      "Failed to load the GreenFlow invoice sequence:",
      loadError,
    );

    return NextResponse.json(
      { error: "The invoice sequence could not be loaded." },
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

  const minimumNextInvoiceNumber =
    readPositiveSafeInteger(
      (body as { minimumNextInvoiceNumber?: unknown } | null)
        ?.minimumNextInvoiceNumber,
    );

  if (minimumNextInvoiceNumber === null) {
    return NextResponse.json(
      { error: "A valid minimum next invoice number is required." },
      { status: 400 },
    );
  }

  try {
    const id =
      `invoice-sequence-${membership.organisationId}`;

    const rows = await prisma.$queryRaw<
      Array<{ nextNumber: number }>
    >`
      INSERT INTO "InvoiceSequence"
        ("id", "organisationId", "nextNumber", "createdAt", "updatedAt")
      VALUES
        (${id}, ${membership.organisationId}, ${minimumNextInvoiceNumber}, NOW(), NOW())
      ON CONFLICT ("organisationId")
      DO UPDATE SET
        "nextNumber" = GREATEST(
          "InvoiceSequence"."nextNumber",
          EXCLUDED."nextNumber"
        ),
        "updatedAt" = NOW()
      RETURNING "nextNumber";
    `;

    const nextInvoiceNumber = rows[0]?.nextNumber;

    if (
      typeof nextInvoiceNumber !== "number" ||
      !Number.isSafeInteger(nextInvoiceNumber)
    ) {
      throw new Error(
        "PostgreSQL did not return the reconciled invoice sequence.",
      );
    }

    return NextResponse.json({
      nextInvoiceNumber,
    });
  } catch (saveError) {
    console.error(
      "Failed to reconcile the GreenFlow invoice sequence:",
      saveError,
    );

    return NextResponse.json(
      { error: "The invoice sequence could not be reconciled." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

  const requestBody = body as {
    quantity?: unknown;
    minimumNextInvoiceNumber?: unknown;
  } | null;

  const quantity =
    readPositiveSafeInteger(
      requestBody?.quantity,
    );

  const minimumNextInvoiceNumber =
    readPositiveSafeInteger(
      requestBody?.minimumNextInvoiceNumber,
    );

  if (quantity === null || quantity > 1000) {
    return NextResponse.json(
      { error: "A reservation quantity between 1 and 1000 is required." },
      { status: 400 },
    );
  }

  if (minimumNextInvoiceNumber === null) {
    return NextResponse.json(
      { error: "A valid minimum next invoice number is required." },
      { status: 400 },
    );
  }

  try {
    const id =
      `invoice-sequence-${membership.organisationId}`;

    /*
     * This single PostgreSQL statement both honours the highest known
     * watermark and consumes the requested block. Concurrent devices
     * therefore cannot receive the same numeric invoice sequence.
     */
    const rows = await prisma.$queryRaw<
      Array<{ nextNumber: number }>
    >`
      INSERT INTO "InvoiceSequence"
        ("id", "organisationId", "nextNumber", "createdAt", "updatedAt")
      VALUES
        (
          ${id},
          ${membership.organisationId},
          ${minimumNextInvoiceNumber + quantity},
          NOW(),
          NOW()
        )
      ON CONFLICT ("organisationId")
      DO UPDATE SET
        "nextNumber" = GREATEST(
          "InvoiceSequence"."nextNumber",
          ${minimumNextInvoiceNumber}
        ) + ${quantity},
        "updatedAt" = NOW()
      RETURNING "nextNumber";
    `;

    const nextInvoiceNumber = rows[0]?.nextNumber;

    if (
      typeof nextInvoiceNumber !== "number" ||
      !Number.isSafeInteger(nextInvoiceNumber)
    ) {
      throw new Error(
        "PostgreSQL did not return the reserved invoice sequence.",
      );
    }

    const startNumber =
      nextInvoiceNumber - quantity;

    if (startNumber < 1) {
      throw new Error(
        "PostgreSQL returned an invalid invoice reservation start number.",
      );
    }

    return NextResponse.json({
      startNumber,
      nextInvoiceNumber,
      quantity,
    });
  } catch (reservationError) {
    console.error(
      "Failed to reserve GreenFlow invoice numbers:",
      reservationError,
    );

    return NextResponse.json(
      { error: "Invoice numbers could not be reserved." },
      { status: 500 },
    );
  }
}