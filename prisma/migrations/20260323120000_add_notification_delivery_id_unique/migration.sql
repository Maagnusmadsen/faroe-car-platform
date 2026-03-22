-- CreateIndex
-- Partial unique: multiple NULLs allowed; at most one row per non-null deliveryId for idempotency.
CREATE UNIQUE INDEX "Notification_deliveryId_key" ON "Notification"("deliveryId");
