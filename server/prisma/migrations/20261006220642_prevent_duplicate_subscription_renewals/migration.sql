/*
  Warnings:

  - A unique constraint covering the columns `[renewalOfId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Subscription_renewalOfId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_renewalOfId_key" ON "Subscription"("renewalOfId");
