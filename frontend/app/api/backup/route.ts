import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const BACKUP_FORMAT = "greenflow-postgresql-export";
const BACKUP_VERSION = 1;

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
    select: {
      organisationId: true,
      organisation: {
        select: {
          name: true,
          slug: true,
        },
      },
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

  const organisationId = membership.organisationId;

  try {
    const [
      customers,
      enquiries,
      seasons,
      programmes,
      routeOrders,
      treatments,
      chemicals,
      chemicalStockMovements,
      workingDays,
      communications,
      customerActions,
      auditEntries,
      organisationSettings,
      invoiceSequence,
      customerSequence,
      enquirySequence,
    ] = await prisma.$transaction([
      prisma.customer.findMany({
        where: { organisationId },
        include: {
          additionalJobs: true,
          lawnAreas: {
            orderBy: { displayOrder: "asc" },
          },
        },
        orderBy: { customerNumber: "asc" },
      }),
      prisma.enquiry.findMany({
        where: { organisationId },
        include: {
          lawnAreas: {
            orderBy: { displayOrder: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.season.findMany({
        where: { organisationId },
        orderBy: { year: "asc" },
      }),
      prisma.programme.findMany({
        where: { organisationId },
        orderBy: [{ year: "asc" }, { createdAt: "asc" }],
      }),
      prisma.routeOrder.findMany({
        where: { organisationId },
        orderBy: [{ date: "asc" }, { vanNumber: "asc" }],
      }),
      prisma.treatment.findMany({
        where: { organisationId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.chemical.findMany({
        where: { organisationId },
        orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      }),
      prisma.chemicalStockMovement.findMany({
        where: { organisationId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.workingDay.findMany({
        where: { organisationId },
        orderBy: { date: "asc" },
      }),
      prisma.communication.findMany({
        where: { organisationId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.customerAction.findMany({
        where: { organisationId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.auditEntry.findMany({
        where: { organisationId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.organisationSettings.findUnique({
        where: { organisationId },
      }),
      prisma.invoiceSequence.findUnique({
        where: { organisationId },
      }),
      prisma.customerSequence.findUnique({
        where: { organisationId },
      }),
      prisma.enquirySequence.findUnique({
        where: { organisationId },
      }),
    ]);

    const createdAt = new Date().toISOString();

    const backup = {
      application: "GreenFlow",
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt,
      restoreSupported: false,
      organisation: {
        name: membership.organisation.name,
        slug: membership.organisation.slug,
      },
      data: {
        customers,
        enquiries,
        seasons,
        programmes,
        routeOrders,
        treatments,
        chemicals,
        chemicalStockMovements,
        workingDays,
        communications,
        customerActions,
        auditEntries,
        organisationSettings,
        invoiceSequence,
        customerSequence,
        enquirySequence,
      },
    };

    const safeSlug =
      membership.organisation.slug
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "organisation";

    const timestamp = createdAt
      .slice(0, 19)
      .replaceAll(":", "-");

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="greenflow-central-backup-${safeSlug}-${timestamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (loadError) {
    console.error(
      "Failed to create GreenFlow central backup:",
      loadError,
    );

    return NextResponse.json(
      {
        error:
          "Unable to create the GreenFlow central backup from PostgreSQL.",
      },
      { status: 500 },
    );
  }
}