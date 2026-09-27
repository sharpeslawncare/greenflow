-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Season_organisationId_idx" ON "Season"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_organisationId_year_key" ON "Season"("organisationId", "year");

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
