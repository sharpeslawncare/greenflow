-- CreateTable
CREATE TABLE "RouteOrder" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "vanNumber" INTEGER NOT NULL,
    "customerNumbers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RouteOrder_organisationId_date_idx" ON "RouteOrder"("organisationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RouteOrder_organisationId_date_vanNumber_key" ON "RouteOrder"("organisationId", "date", "vanNumber");

-- AddForeignKey
ALTER TABLE "RouteOrder" ADD CONSTRAINT "RouteOrder_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
