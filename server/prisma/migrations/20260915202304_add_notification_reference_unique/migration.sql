/*
  Warnings:

  - A unique constraint covering the columns `[userId,type,referenceId,referenceType]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_type_referenceId_referenceType_key" ON "Notification"("userId", "type", "referenceId", "referenceType");
