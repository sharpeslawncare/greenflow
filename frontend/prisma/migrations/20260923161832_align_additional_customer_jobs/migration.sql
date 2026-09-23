-- Align AdditionalCustomerJob with GreenFlow's existing customer-store data shape.
-- Rename the existing treatment identifier column so existing data is preserved.

ALTER TABLE "AdditionalCustomerJob"
RENAME COLUMN "treatmentId" TO "treatmentLibraryId";

-- Preserve the wording used for the job at the time it was created.
-- The default keeps this migration safe for any existing rows.

ALTER TABLE "AdditionalCustomerJob"
ADD COLUMN "wordingSnapshot" TEXT NOT NULL DEFAULT '';