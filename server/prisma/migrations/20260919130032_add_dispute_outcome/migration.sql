-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "outcome" TEXT,
ADD COLUMN     "outcomeAt" TIMESTAMP(3),
ADD COLUMN     "previousTradeStatus" "TradeStatus";
