-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BusinessVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "coverImage" TEXT,
    "logoPublicId" TEXT,
    "coverImagePublicId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "category" TEXT,
    "location" TEXT,
    "address" TEXT,
    "status" "BusinessStatus" NOT NULL DEFAULT 'ACTIVE',
    "verificationStatus" "BusinessVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_userId_key" ON "BusinessProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_slug_key" ON "BusinessProfile"("slug");

-- CreateIndex
CREATE INDEX "BusinessProfile_status_idx" ON "BusinessProfile"("status");

-- CreateIndex
CREATE INDEX "BusinessProfile_verificationStatus_idx" ON "BusinessProfile"("verificationStatus");

-- CreateIndex
CREATE INDEX "BusinessProfile_businessName_idx" ON "BusinessProfile"("businessName");

-- CreateIndex
CREATE INDEX "BusinessProfile_category_idx" ON "BusinessProfile"("category");

-- CreateIndex
CREATE INDEX "BusinessProfile_createdAt_idx" ON "BusinessProfile"("createdAt");

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
