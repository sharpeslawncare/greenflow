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

  return { error: null, membership };
}

export async function GET() {
  const { error, membership } = await getCurrentMembership();

  if (error || !membership) return error;

  try {
    const sequence = await prisma.enquirySequence.findUnique({
      where: { organisationId: membership.organisationId },
      select: { nextNumber: true, updatedAt: true },
    });

    return NextResponse.json({
      nextEnquiryNumber: sequence?.nextNumber ?? null,
      updatedAt: sequence?.updatedAt ?? null,
    });
  } catch (loadError) {
    console.error(
      "Failed to load the GreenFlow enquiry sequence:",
      loadError,
    );
    return NextResponse.json(
      { error: "The enquiry sequence could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST() {
  const { error, membership } = await getCurrentMembership();

  if (error || !membership) return error;

  try {
    const id = `enquiry-sequence-${membership.organisationId}`;

    const rows = await prisma.$queryRaw<
      Array<{ allocatedNumber: number; nextNumber: number }>
    >`
      WITH "enquiryWatermark" AS (
        SELECT
          GREATEST(
            0::numeric,
            COALESCE(
              MAX(
                CASE
                  WHEN "enquiryNumber" ~* '^ENQ-[0-9]+$'
                    THEN SUBSTRING(
                      "enquiryNumber"
                      FROM '[0-9]+$'
                    )::numeric
                  ELSE NULL
                END
              ),
              0::numeric
            )
          ) AS "highestNumber"
        FROM "Enquiry"
        WHERE "organisationId" = ${membership.organisationId}
      ),
      "reservedSequence" AS (
        INSERT INTO "EnquirySequence"
          ("id", "organisationId", "nextNumber", "createdAt", "updatedAt")
        SELECT
          ${id},
          ${membership.organisationId},
          ("highestNumber" + 2)::integer,
          NOW(),
          NOW()
        FROM "enquiryWatermark"
        ON CONFLICT ("organisationId")
        DO UPDATE SET
          "nextNumber" = GREATEST(
            "EnquirySequence"."nextNumber",
            (
              SELECT ("highestNumber" + 1)::integer
              FROM "enquiryWatermark"
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
    const nextEnquiryNumber = rows[0]?.nextNumber;

    if (
      typeof allocatedNumber !== "number" ||
      !Number.isSafeInteger(allocatedNumber) ||
      allocatedNumber < 1 ||
      typeof nextEnquiryNumber !== "number" ||
      !Number.isSafeInteger(nextEnquiryNumber) ||
      nextEnquiryNumber <= allocatedNumber
    ) {
      throw new Error(
        "PostgreSQL did not return a valid enquiry number reservation.",
      );
    }

    return NextResponse.json({
      enquiryNumber: `ENQ-${String(
        allocatedNumber,
      ).padStart(4, "0")}`,
      nextEnquiryNumber,
    });
  } catch (reservationError) {
    console.error(
      "Failed to reserve a GreenFlow enquiry number:",
      reservationError,
    );
    return NextResponse.json(
      { error: "An enquiry number could not be reserved." },
      { status: 500 },
    );
  }
}
