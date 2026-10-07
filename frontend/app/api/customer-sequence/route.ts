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
    const sequence = await prisma.customerSequence.findUnique({
      where: {
        organisationId: membership.organisationId,
      },
      select: {
        nextNumber: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      nextCustomerNumber: sequence?.nextNumber ?? null,
      updatedAt: sequence?.updatedAt ?? null,
    });
  } catch (loadError) {
    console.error(
      "Failed to load the GreenFlow customer sequence:",
      loadError,
    );

    return NextResponse.json(
      { error: "The customer sequence could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST() {
  const { error, membership } = await getCurrentMembership();

  if (error || !membership) {
    return error;
  }

  try {
    const id =
      `customer-sequence-${membership.organisationId}`;

    /*
     * PostgreSQL derives the current numeric customer watermark and consumes
     * one number in the same sequence statement. Existing non-numeric customer
     * numbers remain valid identities but do not participate in allocation.
     *
     * The sequence stores the next unallocated number. A newly created
     * organisation therefore starts at customer 1001.
     */
    const rows = await prisma.$queryRaw<
      Array<{
        allocatedNumber: number;
        nextNumber: number;
      }>
    >`
      WITH "customerWatermark" AS (
        SELECT
          GREATEST(
            1000::numeric,
            COALESCE(
              MAX(
                CASE
                  WHEN "customerNumber" ~ '^[0-9]+$'
                    THEN "customerNumber"::numeric
                  ELSE NULL
                END
              ),
              1000::numeric
            )
          ) AS "highestNumber"
        FROM "Customer"
        WHERE "organisationId" = ${membership.organisationId}
      ),
      "reservedSequence" AS (
        INSERT INTO "CustomerSequence"
          ("id", "organisationId", "nextNumber", "createdAt", "updatedAt")
        SELECT
          ${id},
          ${membership.organisationId},
          ("highestNumber" + 2)::integer,
          NOW(),
          NOW()
        FROM "customerWatermark"
        ON CONFLICT ("organisationId")
        DO UPDATE SET
          "nextNumber" = GREATEST(
            "CustomerSequence"."nextNumber",
            (
              SELECT ("highestNumber" + 1)::integer
              FROM "customerWatermark"
            )
          ) + 1,
          "updatedAt" = NOW()
        RETURNING "nextNumber"
      )
      SELECT
        "nextNumber" - 1 AS "allocatedNumber",
        "nextNumber"
      FROM "reservedSequence";
    `;

    const allocatedNumber = rows[0]?.allocatedNumber;
    const nextCustomerNumber = rows[0]?.nextNumber;

    if (
      typeof allocatedNumber !== "number" ||
      !Number.isSafeInteger(allocatedNumber) ||
      allocatedNumber < 1001 ||
      typeof nextCustomerNumber !== "number" ||
      !Number.isSafeInteger(nextCustomerNumber) ||
      nextCustomerNumber <= allocatedNumber
    ) {
      throw new Error(
        "PostgreSQL did not return a valid customer number reservation.",
      );
    }

    return NextResponse.json({
      customerNumber: String(allocatedNumber),
      nextCustomerNumber,
    });
  } catch (reservationError) {
    console.error(
      "Failed to reserve a GreenFlow customer number:",
      reservationError,
    );

    return NextResponse.json(
      { error: "A customer number could not be reserved." },
      { status: 500 },
    );
  }
}
