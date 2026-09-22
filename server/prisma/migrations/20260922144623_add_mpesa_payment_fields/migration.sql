/*
  Warnings:

  - You are about to drop the column `reference` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `transactionId` on the `Payment` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "PaymentType" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "reference",
DROP COLUMN "transactionId",
ADD COLUMN     "checkoutRequestId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "merchantRequestId" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'MPESA',
ADD COLUMN     "receiptNumber" TEXT,
ADD COLUMN     "resultCode" TEXT,
ADD COLUMN     "resultDescription" TEXT,
ADD COLUMN     "tradeId" TEXT;

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_tradeId_idx" ON "Payment"("tradeId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_type_idx" ON "Payment"("type");

-- CreateIndex
CREATE INDEX "Payment_checkoutRequestId_idx" ON "Payment"("checkoutRequestId");

-- CreateIndex
CREATE INDEX "Payment_merchantRequestId_idx" ON "Payment"("merchantRequestId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
