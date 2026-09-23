/*
  Warnings:

  - You are about to drop the column `active` on the `Promotion` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `Promotion` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[promotionId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `durationDays` to the `Promotion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Promotion` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Promotion` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('FEATURED', 'BOOST', 'HOMEPAGE');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "promotionId" TEXT;

-- AlterTable
ALTER TABLE "Promotion" DROP COLUMN "active",
DROP COLUMN "expiresAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'KES',
ADD COLUMN     "durationDays" INTEGER NOT NULL,
ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "status" "PromotionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "PromotionType" NOT NULL,
ALTER COLUMN "startsAt" DROP NOT NULL;

-- CreateTable
CREATE TABLE "_PaymentToPromotion" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PaymentToPromotion_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PaymentToPromotion_B_index" ON "_PaymentToPromotion"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_promotionId_key" ON "Payment"("promotionId");

-- CreateIndex
CREATE INDEX "Promotion_userId_idx" ON "Promotion"("userId");

-- CreateIndex
CREATE INDEX "Promotion_listingId_idx" ON "Promotion"("listingId");

-- CreateIndex
CREATE INDEX "Promotion_status_idx" ON "Promotion"("status");

-- CreateIndex
CREATE INDEX "Promotion_type_idx" ON "Promotion"("type");

-- CreateIndex
CREATE INDEX "Promotion_endsAt_idx" ON "Promotion"("endsAt");

-- AddForeignKey
ALTER TABLE "_PaymentToPromotion" ADD CONSTRAINT "_PaymentToPromotion_A_fkey" FOREIGN KEY ("A") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PaymentToPromotion" ADD CONSTRAINT "_PaymentToPromotion_B_fkey" FOREIGN KEY ("B") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
