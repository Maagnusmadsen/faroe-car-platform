/**
 * Notification service – orchestration layer.
 * Creates events, enqueues background processing (Inngest).
 * If Inngest send fails (e.g. missing INNGEST_EVENT_KEY), falls back to sync delivery
 * so notifications are never lost.
 */

import { prisma } from "@/db";
import type { Prisma } from "@prisma/client";
import type { DispatchNotificationEventInput } from "./types";
import { inngest } from "@/lib/inngest/client";
import { processNotificationEvent } from "./processor";

function log(level: "info" | "warn" | "error", message: string, ctx?: Record<string, unknown>) {
  const entry = { level, message, ...ctx, timestamp: new Date().toISOString() };
  if (level === "error") console.error("[Notification]", JSON.stringify(entry));
  else if (level === "warn") console.warn("[Notification]", JSON.stringify(entry));
  else console.info("[Notification]", JSON.stringify(entry));
}

/**
 * Dispatch a notification event. Idempotent by idempotencyKey.
 * Creates event record, enqueues background processing (Inngest).
 * If Inngest send fails (e.g. missing INNGEST_EVENT_KEY in production), processes synchronously
 * so the notification is still delivered.
 */
export async function dispatchNotificationEvent(
  input: DispatchNotificationEventInput
): Promise<{ eventId: string; alreadyExisted: boolean }> {
  const { type, idempotencyKey, payload, sourceId, sourceType } = input;

  const existing = await prisma.notificationEvent.findUnique({
    where: { idempotencyKey },
  });

  if (existing) {
    log("info", "Event already processed (idempotent)", {
      idempotencyKey,
      eventId: existing.id,
    });
    return { eventId: existing.id, alreadyExisted: true };
  }

  const event = await prisma.notificationEvent.create({
    data: {
      eventType: type,
      idempotencyKey,
      payload: payload as Prisma.InputJsonValue,
      sourceId: sourceId ?? payload.bookingId ?? payload.conversationId ?? null,
      sourceType: sourceType ?? (payload.bookingId ? "booking" : payload.conversationId ? "conversation" : null),
    },
  });

  try {
    await inngest.send({
      name: "notification/dispatch",
      data: { eventId: event.id },
    });
    await prisma.notificationEvent.update({
      where: { id: event.id },
      data: { enqueuedAt: new Date() },
    });
    log("info", "Notification event enqueued", { eventId: event.id, type });
  } catch (err) {
    const e = err as Error;
    await prisma.notificationEvent.update({
      where: { id: event.id },
      data: { enqueueError: e.message },
    });
    log("warn", "Inngest send failed; falling back to sync delivery", {
      eventId: event.id,
      type,
      error: e.message,
    });
    try {
      await processNotificationEvent(event.id);
      log("info", "Sync delivery completed", { eventId: event.id, type });
    } catch (syncErr) {
      log("error", "Sync delivery also failed", {
        eventId: event.id,
        type,
        error: (syncErr as Error).message,
      });
    }
  }

  return { eventId: event.id, alreadyExisted: false };
}
