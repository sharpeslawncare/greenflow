-- CreateTable
CREATE TABLE "CustomerAction" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "customerNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "completedAt" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerAction_organisationId_idx" ON "CustomerAction"("organisationId");

-- CreateIndex
CREATE INDEX "CustomerAction_organisationId_customerNumber_idx" ON "CustomerAction"("organisationId", "customerNumber");

-- CreateIndex
CREATE INDEX "CustomerAction_organisationId_status_idx" ON "CustomerAction"("organisationId", "status");

-- CreateIndex
CREATE INDEX "CustomerAction_organisationId_dueDate_idx" ON "CustomerAction"("organisationId", "dueDate");

-- AddForeignKey
ALTER TABLE "CustomerAction" ADD CONSTRAINT "CustomerAction_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
