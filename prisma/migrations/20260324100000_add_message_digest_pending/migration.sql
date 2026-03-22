-- CreateTable
CREATE TABLE "MessageDigestPending" (
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "lastTriggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageDigestPending_pkey" PRIMARY KEY ("userId","conversationId")
);

-- CreateIndex
CREATE INDEX "MessageDigestPending_lastTriggeredAt_idx" ON "MessageDigestPending"("lastTriggeredAt");
