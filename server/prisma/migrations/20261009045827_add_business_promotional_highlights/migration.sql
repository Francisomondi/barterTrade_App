-- AlterTable
ALTER TABLE "BusinessStorefrontSettings" ADD COLUMN     "introduction" VARCHAR(1000);

-- CreateTable
CREATE TABLE "BusinessPromotionalHighlight" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(300),
    "icon" VARCHAR(50),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessPromotionalHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessPromotionalHighlight_businessId_sortOrder_idx" ON "BusinessPromotionalHighlight"("businessId", "sortOrder");

-- CreateIndex
CREATE INDEX "BusinessPromotionalHighlight_businessId_isActive_idx" ON "BusinessPromotionalHighlight"("businessId", "isActive");

-- AddForeignKey
ALTER TABLE "BusinessPromotionalHighlight" ADD CONSTRAINT "BusinessPromotionalHighlight_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
