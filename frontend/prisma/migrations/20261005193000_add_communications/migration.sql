-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "customerNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL DEFAULT '',
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "scheduledDate" TEXT NOT NULL,
    "treatmentName" TEXT NOT NULL DEFAULT '',
    "jobType" TEXT NOT NULL,
    "sentAt" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Communication_organisationId_idx" ON "Communication"("organisationId");

-- CreateIndex
CREATE INDEX "Communication_organisationId_scheduledDate_idx" ON "Communication"("organisationId", "scheduledDate");

-- CreateIndex
CREATE INDEX "Communication_organisationId_customerNumber_idx" ON "Communication"("organisationId", "customerNumber");

-- CreateIndex
CREATE INDEX "Communication_organisationId_status_idx" ON "Communication"("organisationId", "status");

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
