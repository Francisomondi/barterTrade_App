/*
  Warnings:

  - You are about to drop the `_PaymentToPromotion` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_PaymentToPromotion" DROP CONSTRAINT "_PaymentToPromotion_A_fkey";

-- DropForeignKey
ALTER TABLE "_PaymentToPromotion" DROP CONSTRAINT "_PaymentToPromotion_B_fkey";

-- DropIndex
DROP INDEX "Payment_promotionId_key";

-- DropTable
DROP TABLE "_PaymentToPromotion";

-- CreateIndex
CREATE INDEX "Payment_promotionId_idx" ON "Payment"("promotionId");

-- CreateIndex
CREATE INDEX "Promotion_listingId_status_idx" ON "Promotion"("listingId", "status");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
