-- AlterTable
ALTER TABLE "NotificationEvent" ADD COLUMN     "enqueueError" TEXT,
ADD COLUMN     "enqueuedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "NotificationEvent_enqueuedAt_idx" ON "NotificationEvent"("enqueuedAt");
