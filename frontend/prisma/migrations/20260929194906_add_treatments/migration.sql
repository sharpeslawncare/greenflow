-- CreateTable
CREATE TABLE "Treatment" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "customerNumber" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL DEFAULT '',
    "programmeVisitId" TEXT NOT NULL DEFAULT '',
    "invoiceNumber" TEXT NOT NULL DEFAULT '',
    "recordedDate" TEXT NOT NULL DEFAULT '',
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Treatment_organisationId_customerNumber_idx" ON "Treatment"("organisationId", "customerNumber");

-- CreateIndex
CREATE INDEX "Treatment_organisationId_recordedDate_idx" ON "Treatment"("organisationId", "recordedDate");

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
