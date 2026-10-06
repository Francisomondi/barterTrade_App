-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "renewalOfId" TEXT;

-- CreateIndex
CREATE INDEX "Subscription_userId_plan_status_idx" ON "Subscription"("userId", "plan", "status");

-- CreateIndex
CREATE INDEX "Subscription_renewalOfId_idx" ON "Subscription"("renewalOfId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_renewalOfId_fkey" FOREIGN KEY ("renewalOfId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
