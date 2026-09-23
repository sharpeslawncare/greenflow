import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../lib/generated/prisma/client";

const databaseUrlValue = process.env.DATABASE_URL?.trim();
const ownerEmailValue = process.env.GREENFLOW_OWNER_EMAIL
  ?.trim()
  .toLowerCase();

if (!databaseUrlValue) {
  throw new Error(
    "DATABASE_URL is not configured. GreenFlow database seed aborted.",
  );
}

if (!ownerEmailValue) {
  throw new Error(
    "GREENFLOW_OWNER_EMAIL is not configured. GreenFlow database seed aborted.",
  );
}

// Create explicitly narrowed string values after validation.
const databaseUrl: string = databaseUrlValue;
const ownerEmail: string = ownerEmailValue;

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const organisation = await prisma.organisation.upsert({
    where: {
      slug: "sharpes-lawn-care",
    },
    update: {
      name: "Sharpes Lawn Care",
    },
    create: {
      name: "Sharpes Lawn Care",
      slug: "sharpes-lawn-care",
    },
  });

  const user = await prisma.user.upsert({
    where: {
      email: ownerEmail,
    },
    update: {
      name: "Rob Sharpe",
    },
    create: {
      name: "Rob Sharpe",
      email: ownerEmail,
    },
  });

  const membership = await prisma.membership.upsert({
    where: {
      organisationId_userId: {
        organisationId: organisation.id,
        userId: user.id,
      },
    },
    update: {
      role: "Owner",
    },
    create: {
      organisationId: organisation.id,
      userId: user.id,
      role: "Owner",
    },
  });

  console.log("GreenFlow database seed complete.");
  console.log(`Organisation: ${organisation.name}`);
  console.log(`User: ${user.name}`);
  console.log(`Role: ${membership.role}`);
}

main()
  .catch((error) => {
    console.error("GreenFlow database seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });