-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "traderAConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "traderAConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "traderBConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "traderBConfirmedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
