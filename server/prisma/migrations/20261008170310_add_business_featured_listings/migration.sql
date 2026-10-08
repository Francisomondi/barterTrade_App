-- CreateTable
CREATE TABLE "BusinessFeaturedListing" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessFeaturedListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessFeaturedListing_businessId_sortOrder_idx" ON "BusinessFeaturedListing"("businessId", "sortOrder");

-- CreateIndex
CREATE INDEX "BusinessFeaturedListing_listingId_idx" ON "BusinessFeaturedListing"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessFeaturedListing_businessId_listingId_key" ON "BusinessFeaturedListing"("businessId", "listingId");

-- AddForeignKey
ALTER TABLE "BusinessFeaturedListing" ADD CONSTRAINT "BusinessFeaturedListing_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessFeaturedListing" ADD CONSTRAINT "BusinessFeaturedListing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
