-- CreateTable
CREATE TABLE "BusinessStorefrontSettings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#5B1725',
    "secondaryColor" TEXT NOT NULL DEFAULT '#D6B15E',
    "accentColor" TEXT NOT NULL DEFAULT '#8A2638',
    "layoutStyle" TEXT NOT NULL DEFAULT 'CLASSIC',
    "tagline" VARCHAR(120),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessStorefrontSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessStorefrontSettings_businessId_key" ON "BusinessStorefrontSettings"("businessId");

-- CreateIndex
CREATE INDEX "BusinessStorefrontSettings_layoutStyle_idx" ON "BusinessStorefrontSettings"("layoutStyle");

-- AddForeignKey
ALTER TABLE "BusinessStorefrontSettings" ADD CONSTRAINT "BusinessStorefrontSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
