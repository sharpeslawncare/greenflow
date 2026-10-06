-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "changedFields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEntry_organisationId_idx" ON "AuditEntry"("organisationId");

-- CreateIndex
CREATE INDEX "AuditEntry_organisationId_createdAt_idx" ON "AuditEntry"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEntry_organisationId_area_idx" ON "AuditEntry"("organisationId", "area");

-- CreateIndex
CREATE INDEX "AuditEntry_organisationId_action_idx" ON "AuditEntry"("organisationId", "action");

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
