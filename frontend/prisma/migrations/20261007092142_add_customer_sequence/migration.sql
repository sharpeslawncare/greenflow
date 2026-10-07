-- CreateTable
CREATE TABLE "CustomerSequence" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1001,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSequence_organisationId_key" ON "CustomerSequence"("organisationId");

-- CreateIndex
CREATE INDEX "CustomerSequence_organisationId_idx" ON "CustomerSequence"("organisationId");

-- AddForeignKey
ALTER TABLE "CustomerSequence" ADD CONSTRAINT "CustomerSequence_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
