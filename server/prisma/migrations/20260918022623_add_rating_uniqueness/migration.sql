/*
  Warnings:

  - A unique constraint covering the columns `[tradeId,reviewerId,reviewedId]` on the table `Rating` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "Rating_tradeId_idx" ON "Rating"("tradeId");

-- CreateIndex
CREATE INDEX "Rating_reviewedId_idx" ON "Rating"("reviewedId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_tradeId_reviewerId_reviewedId_key" ON "Rating"("tradeId", "reviewerId", "reviewedId");
