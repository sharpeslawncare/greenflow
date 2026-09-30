-- CreateTable
CREATE TABLE "Chemical" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chemical_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChemicalStockMovement" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "chemicalId" TEXT NOT NULL,
    "date" TEXT NOT NULL DEFAULT '',
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChemicalStockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Chemical_organisationId_idx" ON "Chemical"("organisationId");

-- CreateIndex
CREATE INDEX "Chemical_organisationId_active_idx" ON "Chemical"("organisationId", "active");

-- CreateIndex
CREATE INDEX "Chemical_organisationId_name_idx" ON "Chemical"("organisationId", "name");

-- CreateIndex
CREATE INDEX "ChemicalStockMovement_organisationId_idx" ON "ChemicalStockMovement"("organisationId");

-- CreateIndex
CREATE INDEX "ChemicalStockMovement_organisationId_chemicalId_idx" ON "ChemicalStockMovement"("organisationId", "chemicalId");

-- CreateIndex
CREATE INDEX "ChemicalStockMovement_organisationId_date_idx" ON "ChemicalStockMovement"("organisationId", "date");

-- AddForeignKey
ALTER TABLE "Chemical" ADD CONSTRAINT "Chemical_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChemicalStockMovement" ADD CONSTRAINT "ChemicalStockMovement_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
