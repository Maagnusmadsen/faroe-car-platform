/**
 * Message notification batching / anti-spam.
 * Throttles per-conversation email; sends digest after a short window.
 * In-app notifications remain immediate.
 */

import { prisma } from "@/db";

/** Minutes before we consider it okay to send another email for the same conversation */
export const MESSAGE_EMAIL_THROTTLE_MINUTES = 5;

/** Minutes to wait after last message before sending digest */
export const MESSAGE_DIGEST_DELAY_MINUTES = 2;

/**
 * Check if we recently sent an email for this (userId, conversationId).
 * If true, we should throttle (skip immediate send, record for digest).
 */
export async function shouldThrottleMessageEmail(
  userId: string,
  conversationId: string
): Promise<boolean> {
  const cutoff = new Date(
    Date.now() - MESSAGE_EMAIL_THROTTLE_MINUTES * 60 * 1000
  );

  const recent = await prisma.notificationDelivery.findFirst({
    where: {
      userId,
      channel: "EMAIL",
      status: "SENT",
      lastAttemptAt: { gte: cutoff },
      event: {
        eventType: "message.received",
        sourceType: "conversation",
        sourceId: conversationId,
      },
    },
  });

  return !!recent;
}

/**
 * Record that we throttled; digest job will pick this up.
 */
export async function recordDigestPending(
  userId: string,
  conversationId: string
): Promise<void> {
  await prisma.messageDigestPending.upsert({
    where: {
      userId_conversationId: { userId, conversationId },
    },
    create: { userId, conversationId },
    update: { lastTriggeredAt: new Date() },
  });
}

/**
 * Remove digest pending (e.g. after we sent an immediate email).
 */
export async function clearDigestPending(
  userId: string,
  conversationId: string
): Promise<void> {
  await prisma.messageDigestPending.deleteMany({
    where: { userId, conversationId },
  });
}

/**
 * Process pending message digests: send one batched email per (userId, conversationId).
 * Called by cron. Idempotent per digest (we delete after send).
 */
export async function processMessageDigests(): Promise<{
  processed: number;
  sent: number;
}> {
  const delayCutoff = new Date(
    Date.now() - MESSAGE_DIGEST_DELAY_MINUTES * 60 * 1000
  );

  const pending = await prisma.messageDigestPending.findMany({
    where: { lastTriggeredAt: { lt: delayCutoff } },
    take: 50,
    orderBy: { lastTriggeredAt: "asc" },
  });

  let sent = 0;

  for (const row of pending) {
    const sentOne = await sendOneDigest(row.userId, row.conversationId, row.lastTriggeredAt);
    if (sentOne) sent++;
    await prisma.messageDigestPending.deleteMany({
      where: { userId: row.userId, conversationId: row.conversationId },
    });
  }

  return { processed: pending.length, sent };
}

async function sendOneDigest(
  userId: string,
  conversationId: string,
  lastTriggeredAt: Date
): Promise<boolean> {
  const { sendEmailNotification } = await import("./channels/email");
  const { isChannelEnabledForUser } = await import("./preferences");

  const enabled = await isChannelEnabledForUser(userId, "message.received", "EMAIL");
  if (!enabled) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) return false;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      booking: { select: { id: true } },
      participants: { select: { userId: true } },
    },
  });
  if (!conversation) return false;

  const otherParticipantIds = conversation.participants
    .filter((p) => p.userId !== userId)
    .map((p) => p.userId);
  if (otherParticipantIds.length === 0) return false;

  const unreadCount = await prisma.message.count({
    where: {
      conversationId,
      senderId: { in: otherParticipantIds },
      readAt: null,
    },
  });
  if (unreadCount === 0) return false;

  const sender = await prisma.user.findUnique({
    where: { id: otherParticipantIds[0] },
    select: { name: true },
  });
  const senderName = sender?.name ?? "Someone";

  const idempotencyKey = `message.digest-${userId}-${conversationId}-${lastTriggeredAt.getTime()}`;
  const existingEvent = await prisma.notificationEvent.findUnique({
    where: { idempotencyKey },
  });
  if (existingEvent) return false;

  const event = await prisma.notificationEvent.create({
    data: {
      eventType: "message.digest",
      idempotencyKey,
      payload: {
        conversationId,
        bookingId: conversation.booking?.id,
        userId,
        unreadCount,
        senderName,
      },
      sourceId: conversationId,
      sourceType: "conversation",
      enqueuedAt: new Date(),
    },
  });

  const delivery = await prisma.notificationDelivery.create({
    data: {
      eventId: event.id,
      userId,
      channel: "EMAIL",
      status: "PENDING",
      attemptCount: 0,
    },
  });

  const result = await sendEmailNotification({
    userId,
    email: user.email,
    eventType: "message.digest",
    payload: {
      conversationId,
      bookingId: conversation.booking?.id,
      unreadCount,
      senderName,
    },
    deliveryId: delivery.id,
    recipientRole: "user",
  });

  await prisma.notificationDelivery.update({
    where: { id: delivery.id },
    data: {
      status: result.success ? "SENT" : "FAILED",
      attemptCount: 1,
      lastAttemptAt: new Date(),
      lastError: result.error ?? null,
    },
  });

  return result.success;
}
