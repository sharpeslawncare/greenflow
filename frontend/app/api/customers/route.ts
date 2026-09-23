import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
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
    return NextResponse.json(
      { error: "No GreenFlow organisation membership found." },
      { status: 403 },
    );
  }

  const customers = await prisma.customer.findMany({
    where: {
      organisationId: membership.organisationId,
    },
    orderBy: {
      customerNumber: "asc",
    },
  });

  return NextResponse.json({
    customers,
  });
}