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
    !("movement" in body)
  ) {
    return NextResponse.json(
      { error: "Invalid stock movement payload." },
      { status: 400 },
    );
  }

  const value =
    body as Record<string, unknown>;

  const movement = value.movement;

  if (
    typeof movement !== "object" ||
    movement === null
  ) {
    return NextResponse.json(
      { error: "Invalid stock movement payload." },
      { status: 400 },
    );
  }

  const movementValue =
    movement as Record<string, unknown>;

  const movementId =
    movementValue.id;

  const chemicalId =
    movementValue.chemicalId;

  if (
    typeof movementId !== "string" ||
    movementId.trim().length === 0 ||
    typeof chemicalId !== "string" ||
    chemicalId.trim().length === 0
  ) {
    return NextResponse.json(
      {
        error:
          "Stock movement id and chemical id are required.",
      },
      { status: 400 },
    );
  }

  const id = movementId.trim();
  const productId = chemicalId.trim();

  const chemicalPayload =
    value.chemical;

  if (
    chemicalPayload !== undefined &&
    (typeof chemicalPayload !== "object" ||
      chemicalPayload === null)
  ) {
    return NextResponse.json(
      { error: "Invalid chemical payload." },
      { status: 400 },
    );
  }

  try {
    const existingChemical =
      await prisma.chemical.findFirst({
        where: {
          id: productId,
          organisationId:
            membership.organisationId,
        },
        select: {
          id: true,
        },
      });

    if (!existingChemical) {
      return NextResponse.json(
        {
          error:
            "The selected chemical does not belong to this organisation.",
        },
        { status: 404 },
      );
    }

    const saved =
      await prisma.$transaction(async (tx) => {
        let chemicalData:
          Prisma.InputJsonValue | undefined;

        if (chemicalPayload !== undefined) {
          chemicalData =
            chemicalPayload as Prisma.InputJsonValue;
        }

        const chemical =
          chemicalData !== undefined
            ? await tx.chemical.update({
                where: {
                  id: productId,
                },
                data: {
                  data: chemicalData,
                  name:
                    typeof (
                      chemicalPayload as Record<string, unknown>
                    ).name === "string"
                      ? (
                          chemicalPayload as Record<string, unknown>
                        ).name as string
                      : undefined,
                  active:
                    typeof (
                      chemicalPayload as Record<string, unknown>
                    ).active === "boolean"
                      ? (
                          chemicalPayload as Record<string, unknown>
                        ).active as boolean
                      : undefined,
                },
              })
            : null;

        const stockMovement =
          await tx.chemicalStockMovement.upsert({
            where: {
              id,
            },
            create: {
              id,
              organisationId:
                membership.organisationId,
              chemicalId: productId,
              date:
                typeof movementValue.date === "string"
                  ? movementValue.date
                  : "",
              data:
                movementValue as Prisma.InputJsonValue,
            },
            update: {
              chemicalId: productId,
              date:
                typeof movementValue.date === "string"
                  ? movementValue.date
                  : "",
              data:
                movementValue as Prisma.InputJsonValue,
            },
          });

        return {
          chemical: chemical?.data ?? null,
          stockMovement:
            stockMovement.data,
        };
      });

    return NextResponse.json(saved);
  } catch (saveError) {
    console.error(
      "Failed to save GreenFlow stock movement:",
      saveError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to save stock movement to PostgreSQL.",
      },
      { status: 500 },
    );
  }
}
