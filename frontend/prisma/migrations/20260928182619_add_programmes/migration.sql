-- CreateTable
CREATE TABLE "Programme" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Programme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Programme_organisationId_idx" ON "Programme"("organisationId");

-- CreateIndex
CREATE INDEX "Programme_organisationId_year_idx" ON "Programme"("organisationId", "year");

-- CreateIndex
CREATE INDEX "Programme_customerId_idx" ON "Programme"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Programme_customerId_year_key" ON "Programme"("customerId", "year");

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
