-- CreateTable
CREATE TABLE "TradeConfirmation" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradeConfirmation_tradeId_idx" ON "TradeConfirmation"("tradeId");

-- CreateIndex
CREATE INDEX "TradeConfirmation_userId_idx" ON "TradeConfirmation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeConfirmation_tradeId_userId_stage_key" ON "TradeConfirmation"("tradeId", "userId", "stage");

-- AddForeignKey
ALTER TABLE "TradeConfirmation" ADD CONSTRAINT "TradeConfirmation_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeConfirmation" ADD CONSTRAINT "TradeConfirmation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
