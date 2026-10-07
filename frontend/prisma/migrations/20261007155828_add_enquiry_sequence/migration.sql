-- CreateTable
CREATE TABLE "EnquirySequence" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnquirySequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnquirySequence_organisationId_key" ON "EnquirySequence"("organisationId");

-- CreateIndex
CREATE INDEX "EnquirySequence_organisationId_idx" ON "EnquirySequence"("organisationId");

-- AddForeignKey
ALTER TABLE "EnquirySequence" ADD CONSTRAINT "EnquirySequence_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
