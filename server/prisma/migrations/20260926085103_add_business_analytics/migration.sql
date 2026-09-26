-- CreateEnum
CREATE TYPE "BusinessAnalyticsEventType" AS ENUM ('LISTING_VIEW', 'STOREFRONT_VIEW', 'CONTACT_CLICK', 'WEBSITE_CLICK', 'PHONE_CLICK', 'LISTING_SHARE');

-- AlterEnum
ALTER TYPE "SubscriptionPlanType" ADD VALUE 'BUSINESS_PRO';

-- CreateTable
CREATE TABLE "BusinessAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "listingId" TEXT,
    "visitorUserId" TEXT,
    "type" "BusinessAnalyticsEventType" NOT NULL,
    "visitorKey" TEXT,
    "sessionKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessAnalyticsEvent_businessId_idx" ON "BusinessAnalyticsEvent"("businessId");

-- CreateIndex
CREATE INDEX "BusinessAnalyticsEvent_listingId_idx" ON "BusinessAnalyticsEvent"("listingId");

-- CreateIndex
CREATE INDEX "BusinessAnalyticsEvent_visitorUserId_idx" ON "BusinessAnalyticsEvent"("visitorUserId");

-- CreateIndex
CREATE INDEX "BusinessAnalyticsEvent_businessId_type_idx" ON "BusinessAnalyticsEvent"("businessId", "type");

-- CreateIndex
CREATE INDEX "BusinessAnalyticsEvent_businessId_createdAt_idx" ON "BusinessAnalyticsEvent"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessAnalyticsEvent_businessId_type_createdAt_idx" ON "BusinessAnalyticsEvent"("businessId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessAnalyticsEvent_listingId_type_idx" ON "BusinessAnalyticsEvent"("listingId", "type");

-- CreateIndex
CREATE INDEX "BusinessAnalyticsEvent_listingId_createdAt_idx" ON "BusinessAnalyticsEvent"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessAnalyticsEvent_listingId_type_createdAt_idx" ON "BusinessAnalyticsEvent"("listingId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessAnalyticsEvent_visitorKey_idx" ON "BusinessAnalyticsEvent"("visitorKey");

-- CreateIndex
CREATE INDEX "BusinessAnalyticsEvent_sessionKey_idx" ON "BusinessAnalyticsEvent"("sessionKey");

-- AddForeignKey
ALTER TABLE "BusinessAnalyticsEvent" ADD CONSTRAINT "BusinessAnalyticsEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessAnalyticsEvent" ADD CONSTRAINT "BusinessAnalyticsEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessAnalyticsEvent" ADD CONSTRAINT "BusinessAnalyticsEvent_visitorUserId_fkey" FOREIGN KEY ("visitorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
