-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "customerNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "surname" TEXT NOT NULL DEFAULT '',
    "fullName" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "postcode" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "homePhone" TEXT NOT NULL DEFAULT '',
    "mobilePhone" TEXT NOT NULL DEFAULT '',
    "lawnSize" INTEGER NOT NULL DEFAULT 0,
    "groupNumber" INTEGER NOT NULL DEFAULT 0,
    "treatmentPrice" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "vanNumber" INTEGER NOT NULL DEFAULT 1,
    "nextVisit" TEXT NOT NULL DEFAULT 'Not yet scheduled',
    "lastVisit" TEXT NOT NULL DEFAULT 'No previous visit',
    "lockedGate" BOOLEAN NOT NULL DEFAULT false,
    "gateCode" TEXT NOT NULL DEFAULT '',
    "dogOnProperty" BOOLEAN NOT NULL DEFAULT false,
    "preferredContact" TEXT NOT NULL DEFAULT 'SMS',
    "paymentMethod" TEXT NOT NULL DEFAULT 'Not set',
    "notes" TEXT NOT NULL DEFAULT '',
    "programmeStartDate" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalCustomerJob" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "treatmentName" TEXT NOT NULL,
    "scheduledDate" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalCustomerJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_organisationId_idx" ON "Customer"("organisationId");

-- CreateIndex
CREATE INDEX "Customer_organisationId_status_idx" ON "Customer"("organisationId", "status");

-- CreateIndex
CREATE INDEX "Customer_organisationId_postcode_idx" ON "Customer"("organisationId", "postcode");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_organisationId_customerNumber_key" ON "Customer"("organisationId", "customerNumber");

-- CreateIndex
CREATE INDEX "AdditionalCustomerJob_customerId_idx" ON "AdditionalCustomerJob"("customerId");

-- CreateIndex
CREATE INDEX "AdditionalCustomerJob_customerId_status_idx" ON "AdditionalCustomerJob"("customerId", "status");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalCustomerJob" ADD CONSTRAINT "AdditionalCustomerJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
