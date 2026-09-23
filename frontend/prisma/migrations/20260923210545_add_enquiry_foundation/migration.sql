-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "enquiryNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'New Enquiry',
    "source" TEXT NOT NULL DEFAULT 'Recommendation',
    "referredBy" TEXT NOT NULL DEFAULT '',
    "firstName" TEXT NOT NULL DEFAULT '',
    "surname" TEXT NOT NULL DEFAULT '',
    "fullName" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "postcode" TEXT NOT NULL DEFAULT '',
    "emailAddress" TEXT NOT NULL DEFAULT '',
    "homePhone" TEXT NOT NULL DEFAULT '',
    "mobilePhone" TEXT NOT NULL DEFAULT '',
    "initialMessage" TEXT NOT NULL DEFAULT '',
    "internalNotes" TEXT NOT NULL DEFAULT '',
    "siteVisitDate" TEXT NOT NULL DEFAULT '',
    "siteVisitTime" TEXT NOT NULL DEFAULT '',
    "lawnMeasured" BOOLEAN NOT NULL DEFAULT false,
    "lawnSizeSquareMetres" INTEGER NOT NULL DEFAULT 0,
    "minimumPriceApplied" BOOLEAN NOT NULL DEFAULT false,
    "pricePerSquareMetre" DECIMAL(10,2) NOT NULL DEFAULT 0.20,
    "calculatedTreatmentPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "quotedTreatmentPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "quoteStatus" TEXT NOT NULL DEFAULT 'Not Prepared',
    "quoteDate" TEXT NOT NULL DEFAULT '',
    "quoteExpiryDate" TEXT NOT NULL DEFAULT '',
    "quoteNotes" TEXT NOT NULL DEFAULT '',
    "treatmentStartedImmediately" BOOLEAN NOT NULL DEFAULT false,
    "suggestedGroupNumber" INTEGER NOT NULL DEFAULT 1,
    "suggestedVanNumber" INTEGER NOT NULL DEFAULT 1,
    "extraWorkRequired" BOOLEAN NOT NULL DEFAULT false,
    "extraWorkDescription" TEXT NOT NULL DEFAULT '',
    "preferredExtraWorkSeason" TEXT NOT NULL DEFAULT '',
    "convertedCustomerNumber" TEXT NOT NULL DEFAULT '',
    "convertedAt" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Enquiry_organisationId_idx" ON "Enquiry"("organisationId");

-- CreateIndex
CREATE INDEX "Enquiry_organisationId_status_idx" ON "Enquiry"("organisationId", "status");

-- CreateIndex
CREATE INDEX "Enquiry_organisationId_quoteStatus_idx" ON "Enquiry"("organisationId", "quoteStatus");

-- CreateIndex
CREATE INDEX "Enquiry_organisationId_postcode_idx" ON "Enquiry"("organisationId", "postcode");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_organisationId_enquiryNumber_key" ON "Enquiry"("organisationId", "enquiryNumber");

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
