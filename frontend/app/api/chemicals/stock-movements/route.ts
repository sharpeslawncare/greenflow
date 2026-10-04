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

type StockMovementWrite = {
  movement: Record<string, unknown>;
  chemical?: Record<string, unknown>;
};

function parseStockMovementWrite(
  value: unknown,
): StockMovementWrite | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("movement" in value)
  ) {
    return null;
  }

  const record =
    value as Record<string, unknown>;

  const movement = record.movement;

  if (
    typeof movement !== "object" ||
    movement === null
  ) {
    return null;
  }

  const chemical = record.chemical;

  if (
    chemical !== undefined &&
    (typeof chemical !== "object" ||
      chemical === null)
  ) {
    return null;
  }

  return {
    movement:
      movement as Record<string, unknown>,
    chemical:
      chemical as
        | Record<string, unknown>
        | undefined,
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

  let writes: StockMovementWrite[];

  if (
    typeof body === "object" &&
    body !== null &&
    "items" in body
  ) {
    const items =
      (body as Record<string, unknown>).items;

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "A stock movement batch must contain at least one item.",
        },
        { status: 400 },
      );
    }

    const parsed =
      items.map(parseStockMovementWrite);

    if (
      parsed.some(
        (item) => item === null,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid stock movement batch payload.",
        },
        { status: 400 },
      );
    }

    writes =
      parsed as StockMovementWrite[];
  } else {
    const parsed =
      parseStockMovementWrite(body);

    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "Invalid stock movement payload.",
        },
        { status: 400 },
      );
    }

    writes = [parsed];
  }

  const prepared = writes.map(
    (write) => {
      const movementId =
        write.movement.id;

      const chemicalId =
        write.movement.chemicalId;

      if (
        typeof movementId !== "string" ||
        movementId.trim().length === 0 ||
        typeof chemicalId !== "string" ||
        chemicalId.trim().length === 0
      ) {
        return null;
      }

      return {
        id: movementId.trim(),
        productId: chemicalId.trim(),
        movement: write.movement,
        chemical: write.chemical,
      };
    },
  );

  if (
    prepared.some(
      (item) => item === null,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Stock movement id and chemical id are required.",
      },
      { status: 400 },
    );
  }

  const validPrepared =
    prepared as Array<{
      id: string;
      productId: string;
      movement: Record<string, unknown>;
      chemical?: Record<string, unknown>;
    }>;

  const movementIds =
    validPrepared.map(
      (item) => item.id,
    );

  if (
    new Set(movementIds).size !==
    movementIds.length
  ) {
    return NextResponse.json(
      {
        error:
          "A stock movement batch cannot contain duplicate movement ids.",
      },
      { status: 400 },
    );
  }

  const productIds =
    Array.from(
      new Set(
        validPrepared.map(
          (item) => item.productId,
        ),
      ),
    );

  try {
    const ownedChemicals =
      await prisma.chemical.findMany({
        where: {
          id: {
            in: productIds,
          },
          organisationId:
            membership.organisationId,
        },
        select: {
          id: true,
        },
      });

    const ownedIds =
      new Set(
        ownedChemicals.map(
          (chemical) => chemical.id,
        ),
      );

    const missingProduct =
      productIds.find(
        (id) => !ownedIds.has(id),
      );

    if (missingProduct) {
      return NextResponse.json(
        {
          error:
            "One or more selected chemicals do not belong to this organisation.",
        },
        { status: 404 },
      );
    }

    const saved =
      await prisma.$transaction(
        async (tx) => {
          const results = [];

          for (
            const item of validPrepared
          ) {
            let chemicalData:
              Prisma.InputJsonValue | undefined;

            if (
              item.chemical !== undefined
            ) {
              chemicalData =
                item.chemical as Prisma.InputJsonValue;
            }

            const chemical =
              chemicalData !== undefined
                ? await tx.chemical.update({
                    where: {
                      id: item.productId,
                    },
                    data: {
                      data: chemicalData,
                      name:
                        typeof item.chemical
                          ?.name === "string"
                          ? item.chemical
                              .name as string
                          : undefined,
                      active:
                        typeof item.chemical
                          ?.active === "boolean"
                          ? item.chemical
                              .active as boolean
                          : undefined,
                    },
                  })
                : null;

            const stockMovement =
              await tx.chemicalStockMovement.upsert({
                where: {
                  id: item.id,
                },
                create: {
                  id: item.id,
                  organisationId:
                    membership.organisationId,
                  chemicalId:
                    item.productId,
                  date:
                    typeof item.movement
                      .date === "string"
                      ? item.movement.date
                      : "",
                  data:
                    item.movement as Prisma.InputJsonValue,
                },
                update: {
                  chemicalId:
                    item.productId,
                  date:
                    typeof item.movement
                      .date === "string"
                      ? item.movement.date
                      : "",
                  data:
                    item.movement as Prisma.InputJsonValue,
                },
              });

            results.push({
              chemical:
                chemical?.data ?? null,
              stockMovement:
                stockMovement.data,
            });
          }

          return results;
        },
      );

    if (
      typeof body === "object" &&
      body !== null &&
      "items" in body
    ) {
      return NextResponse.json({
        items: saved,
      });
    }

    return NextResponse.json(
      saved[0],
    );
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