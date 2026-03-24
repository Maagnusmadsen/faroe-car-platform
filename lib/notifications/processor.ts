/**
 * Notification event processor.
 * Runs in background (Inngest). Idempotent per delivery.
 */

import { prisma } from "@/db";
import type { NotificationChannel } from "@prisma/client";
import type { Recipient } from "./types";
import { getEventConfig, resolveRecipients, validatePayloadForEvent } from "./events";
import { isChannelEnabledForUser } from "./preferences";
import { createInAppNotification } from "./channels/in-app";
import {
  sendEmailNotification,
  getRecipientRole,
} from "./channels/email";
import {
  MAX_DELIVERY_ATTEMPTS,
  nextRetryAt,
  isRetryableEmail,
  isRetryableInApp,
} from "./retry";
function log(level: "info" | "warn" | "error", message: string, ctx?: Record<string, unknown>) {
  const entry = { level, message, ...ctx, timestamp: new Date().toISOString() };
  if (level === "error") console.error("[Notification]", JSON.stringify(entry));
  else if (level === "warn") console.warn("[Notification]", JSON.stringify(entry));
  else console.info("[Notification]", JSON.stringify(entry));
}

async function enrichPayload(
  _type: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const result = { ...payload };
  if (payload.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: payload.bookingId as string },
      include: { car: { select: { brand: true, model: true, year: true, ownerId: true } } },
    });
    if (booking) {
      result.carTitle = result.carTitle ?? `${booking.car.brand} ${booking.car.model} (${booking.car.year})`;
      result.startDate = result.startDate ?? booking.startDate.toISOString().slice(0, 10);
      result.endDate = result.endDate ?? booking.endDate.toISOString().slice(0, 10);
      if (!result.ownerId) result.ownerId = booking.car.ownerId;
      if (!result.renterId) result.renterId = booking.renterId;
    }
  }
  if (payload.carId && !result.carTitle) {
    const car = await prisma.carListing.findUnique({
      where: { id: payload.carId as string },
      select: { brand: true, model: true, year: true },
    });
    if (car) result.carTitle = `${car.brand} ${car.model} (${car.year})`;
  }
  return result;
}

async function createDeliveryRecord(
  eventId: string,
  userId: string,
  channel: NotificationChannel,
  status: "PENDING" | "SENT" | "FAILED" | "SKIPPED",
  notificationId: string | null,
  lastError: string | null,
  nextRetryAtVal?: Date | null
) {
  await prisma.notificationDelivery.upsert({
    where: {
      eventId_userId_channel: { eventId, userId, channel },
    },
    create: {
      eventId,
      userId,
      channel,
      status,
      notificationId,
      attemptCount: status === "SENT" ? 1 : 0,
      lastAttemptAt: new Date(),
      lastError,
      nextRetryAt: nextRetryAtVal ?? undefined,
    },
    update: {
      status,
      notificationId: notificationId ?? undefined,
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
      lastError,
      nextRetryAt: nextRetryAtVal ?? undefined,
    },
  });
}

async function deliverInApp(
  event: { id: string },
  recipient: Recipient,
  eventType: import("./types").EventType,
  payload: import("./types").NotificationEventPayload
): Promise<void> {
  const existing = await prisma.notificationDelivery.findUnique({
    where: {
      eventId_userId_channel: {
        eventId: event.id,
        userId: recipient.userId,
        channel: "IN_APP",
      },
    },
  });
  if (existing && (existing.status === "SENT" || existing.status === "SKIPPED")) {
    return;
  }

  try {
    const delivery = await prisma.notificationDelivery.upsert({
      where: {
        eventId_userId_channel: {
          eventId: event.id,
          userId: recipient.userId,
          channel: "IN_APP",
        },
      },
      create: {
        eventId: event.id,
        userId: recipient.userId,
        channel: "IN_APP",
        status: "PENDING",
        attemptCount: 1,
        lastAttemptAt: new Date(),
      },
      update: {
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    const notificationId = await createInAppNotification({
      userId: recipient.userId,
      eventType,
      payload,
      eventId: event.id,
      deliveryId: delivery.id,
    });

    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: "SENT", notificationId },
    });
  } catch (err) {
    const e = err as Error;
    const delivery = await prisma.notificationDelivery.findUnique({
      where: {
        eventId_userId_channel: {
          eventId: event.id,
          userId: recipient.userId,
          channel: "IN_APP",
        },
      },
    });
    const attemptCount = delivery?.attemptCount ?? 1;
    const canRetry =
      attemptCount < MAX_DELIVERY_ATTEMPTS && isRetryableInApp(e.message);
    log("error", "In-app delivery failed", {
      eventId: event.id,
      userId: recipient.userId,
      error: e.message,
      retryable: canRetry,
    });
    const failedDelivery = await prisma.notificationDelivery.findUnique({
      where: {
        eventId_userId_channel: {
          eventId: event.id,
          userId: recipient.userId,
          channel: "IN_APP",
        },
      },
    });
    if (failedDelivery) {
      await prisma.notificationDelivery.update({
        where: { id: failedDelivery.id },
        data: {
          status: "FAILED",
          lastAttemptAt: new Date(),
          lastError: e.message,
          nextRetryAt: canRetry ? nextRetryAt(attemptCount) : null,
        },
      });
    }
  }
}

async function deliverEmail(
  event: { id: string; eventType: string },
  recipient: Recipient,
  eventType: import("./types").EventType,
  payload: import("./types").NotificationEventPayload
): Promise<void> {
  if (!recipient.email) return;

  const existing = await prisma.notificationDelivery.findUnique({
    where: {
      eventId_userId_channel: {
        eventId: event.id,
        userId: recipient.userId,
        channel: "EMAIL",
      },
    },
  });
  if (existing && (existing.status === "SENT" || existing.status === "SKIPPED")) {
    return;
  }

  let delivery = existing;
  if (!delivery) {
    delivery = await prisma.notificationDelivery.create({
      data: {
        eventId: event.id,
        userId: recipient.userId,
        channel: "EMAIL",
        status: "PENDING",
        attemptCount: 0,
      },
    });
  }

  try {
    const result = await sendEmailNotification({
      userId: recipient.userId,
      email: recipient.email,
      eventType,
      payload,
      deliveryId: delivery.id,
      recipientRole: getRecipientRole(eventType, payload, recipient.userId),
    });

    const newAttemptCount = result.reconciled ? delivery.attemptCount : delivery.attemptCount + 1;
    const canRetry =
      !result.success &&
      newAttemptCount < MAX_DELIVERY_ATTEMPTS &&
      isRetryableEmail(result.error, result.statusCode);

    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: result.success ? "SENT" : "FAILED",
        attemptCount: result.reconciled ? delivery.attemptCount : newAttemptCount,
        lastAttemptAt: new Date(),
        lastError: result.error ?? null,
        nextRetryAt: result.success
          ? null
          : canRetry
            ? nextRetryAt(newAttemptCount)
            : null,
      },
    });

    if (!result.success) {
      log("warn", "Email delivery failed", {
        eventId: event.id,
        userId: recipient.userId,
        error: result.error,
        retryable: canRetry,
      });
    }
  } catch (err) {
    const e = err as Error;
    const newAttemptCount = delivery.attemptCount + 1;
    const canRetry =
      newAttemptCount < MAX_DELIVERY_ATTEMPTS && isRetryableEmail(e.message);
    log("error", "Email delivery threw", {
      eventId: event.id,
      userId: recipient.userId,
      error: e.message,
      retryable: canRetry,
    });
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "FAILED",
        attemptCount: newAttemptCount,
        lastAttemptAt: new Date(),
        lastError: e.message,
        nextRetryAt: canRetry ? nextRetryAt(newAttemptCount) : null,
      },
    });
  }
}

/**
 * Retry a single failed delivery. Called by retry cron.
 * Idempotent: checks SENT/SKIPPED and EmailLog before sending.
 */
export async function retryDelivery(deliveryId: string): Promise<boolean> {
  const delivery = await prisma.notificationDelivery.findUnique({
    where: { id: deliveryId },
    include: { event: true },
  });
  if (!delivery || delivery.status !== "FAILED") return false;
  if (!delivery.nextRetryAt || delivery.nextRetryAt > new Date()) return false;
  if (delivery.attemptCount >= MAX_DELIVERY_ATTEMPTS) return false;

  const user = await prisma.user.findUnique({
    where: { id: delivery.userId },
    select: { id: true, email: true },
  });
  if (!user || (delivery.channel === "EMAIL" && !user.email)) return false;

  const recipient: Recipient = {
    userId: user.id,
    email: user.email ?? undefined,
  };
  const type = delivery.event.eventType as import("./types").EventType;
  const payload = (await enrichPayload(type, delivery.event.payload as Record<string, unknown>)) as import("./types").NotificationEventPayload;

  if (delivery.channel === "IN_APP") {
    await deliverInApp(delivery.event, recipient, type, payload);
  } else if (delivery.channel === "EMAIL") {
    await deliverEmail(delivery.event, recipient, type, payload);
  }
  return true;
}

/**
 * Process a notification event: resolve recipients and deliver via channels.
 * Idempotent: skips deliveries already SENT or SKIPPED (safe for Inngest retries).
 */
export async function processNotificationEvent(eventId: string): Promise<void> {
  const event = await prisma.notificationEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    log("warn", "Event not found", { eventId });
    return;
  }

  const type = event.eventType as import("./types").EventType;
  const payload = event.payload as Record<string, unknown>;

  const validation = validatePayloadForEvent(type, payload as import("./types").NotificationEventPayload);
  if (!validation.valid) {
    const err = JSON.stringify({
      reason: "payload_validation_failed",
      message: validation.reason,
      missingFields: validation.missingFields,
    });
    await prisma.notificationEvent.update({
      where: { id: eventId },
      data: { processingError: err },
    });
    log("warn", "Payload validation failed", { eventId, type, reason: validation.reason });
    return;
  }

  const enrichedPayload = await enrichPayload(type, payload);
  const recipients = await resolveRecipients(type, enrichedPayload as import("./types").NotificationEventPayload);

  if (recipients.length === 0) {
    const err = JSON.stringify({
      reason: "no_recipients",
      message: `No recipients resolved for ${type}`,
      payloadKeys: Object.keys(payload),
    });
    await prisma.notificationEvent.update({
      where: { id: eventId },
      data: { processingError: err },
    });
    log("warn", "No recipients resolved", { eventId, type });
    return;
  }

  const config = getEventConfig(type);

  for (const recipient of recipients) {
    for (const channel of config.channels) {
      const enabled = await isChannelEnabledForUser(recipient.userId, type, channel);
      if (!enabled) {
        await createDeliveryRecord(
          eventId,
          recipient.userId,
          channel,
          "SKIPPED",
          null,
          "preference_disabled",
          null
        );
        continue;
      }

      if (channel === "IN_APP") {
        await deliverInApp(
          event,
          recipient,
          type,
          enrichedPayload as import("./types").NotificationEventPayload
        );
      } else if (channel === "EMAIL" && recipient.email) {
        await deliverEmail(
          event,
          recipient,
          type,
          enrichedPayload as import("./types").NotificationEventPayload
        );
      } else if (channel === "EMAIL" && !recipient.email) {
        log("warn", "No email for recipient, skipping email channel", {
          userId: recipient.userId,
          eventType: type,
        });
        await createDeliveryRecord(
          eventId,
          recipient.userId,
          channel,
          "SKIPPED",
          null,
          "no_email",
          null
        );
      }
    }
  }
}
