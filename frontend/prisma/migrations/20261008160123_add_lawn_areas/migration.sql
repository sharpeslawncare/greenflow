-- CreateTable
CREATE TABLE "CustomerLawnArea" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "areaSquareMetres" INTEGER NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerLawnArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquiryLawnArea" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "areaSquareMetres" INTEGER NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnquiryLawnArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerLawnArea_customerId_idx" ON "CustomerLawnArea"("customerId");

-- CreateIndex
CREATE INDEX "CustomerLawnArea_customerId_displayOrder_idx" ON "CustomerLawnArea"("customerId", "displayOrder");

-- CreateIndex
CREATE INDEX "EnquiryLawnArea_enquiryId_idx" ON "EnquiryLawnArea"("enquiryId");

-- CreateIndex
CREATE INDEX "EnquiryLawnArea_enquiryId_displayOrder_idx" ON "EnquiryLawnArea"("enquiryId", "displayOrder");

-- AddForeignKey
ALTER TABLE "CustomerLawnArea" ADD CONSTRAINT "CustomerLawnArea_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryLawnArea" ADD CONSTRAINT "EnquiryLawnArea_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
