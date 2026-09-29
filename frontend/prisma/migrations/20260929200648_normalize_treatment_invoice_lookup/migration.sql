/*
  Warnings:

  - You are about to drop the column `invoiceNumber` on the `Treatment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Treatment" DROP COLUMN "invoiceNumber",
ADD COLUMN     "invoiceNumberNormalized" TEXT NOT NULL DEFAULT '';
