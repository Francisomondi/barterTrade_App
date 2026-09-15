/*
  Warnings:

  - A unique constraint covering the columns `[listingAId,listingBId]` on the table `Match` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "Match_userId_idx" ON "Match"("userId");

-- CreateIndex
CREATE INDEX "Match_listingAId_idx" ON "Match"("listingAId");

-- CreateIndex
CREATE INDEX "Match_listingBId_idx" ON "Match"("listingBId");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Match_score_idx" ON "Match"("score");

-- CreateIndex
CREATE UNIQUE INDEX "Match_listingAId_listingBId_key" ON "Match"("listingAId", "listingBId");
