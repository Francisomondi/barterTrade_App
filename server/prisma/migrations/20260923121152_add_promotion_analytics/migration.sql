-- CreateEnum
CREATE TYPE "PromotionAnalyticsEventType" AS ENUM ('VIEW', 'CLICK');

-- CreateTable
CREATE TABLE "PromotionAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "PromotionAnalyticsEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromotionAnalyticsEvent_promotionId_idx" ON "PromotionAnalyticsEvent"("promotionId");

-- CreateIndex
CREATE INDEX "PromotionAnalyticsEvent_promotionId_type_idx" ON "PromotionAnalyticsEvent"("promotionId", "type");

-- CreateIndex
CREATE INDEX "PromotionAnalyticsEvent_promotionId_createdAt_idx" ON "PromotionAnalyticsEvent"("promotionId", "createdAt");

-- CreateIndex
CREATE INDEX "PromotionAnalyticsEvent_userId_idx" ON "PromotionAnalyticsEvent"("userId");

-- AddForeignKey
ALTER TABLE "PromotionAnalyticsEvent" ADD CONSTRAINT "PromotionAnalyticsEvent_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionAnalyticsEvent" ADD CONSTRAINT "PromotionAnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
