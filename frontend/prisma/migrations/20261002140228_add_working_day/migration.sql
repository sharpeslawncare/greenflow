-- CreateTable
CREATE TABLE "WorkingDay" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "chemicalsChecked" BOOLEAN NOT NULL DEFAULT false,
    "quickbooksExported" BOOLEAN NOT NULL DEFAULT false,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkingDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkingDay_organisationId_idx" ON "WorkingDay"("organisationId");

-- CreateIndex
CREATE INDEX "WorkingDay_organisationId_date_idx" ON "WorkingDay"("organisationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingDay_organisationId_date_key" ON "WorkingDay"("organisationId", "date");

-- AddForeignKey
ALTER TABLE "WorkingDay" ADD CONSTRAINT "WorkingDay_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
