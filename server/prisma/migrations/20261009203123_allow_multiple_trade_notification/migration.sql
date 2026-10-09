-- DropIndex
DROP INDEX "Notification_userId_type_referenceId_referenceType_key";

-- CreateIndex
CREATE INDEX "Notification_userId_type_referenceId_referenceType_idx" ON "Notification"("userId", "type", "referenceId", "referenceType");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");
