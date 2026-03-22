/**
 * Notification service – orchestration layer.
 * Creates events, enqueues background processing. Non-blocking.
 */

import { prisma } from "@/db";
import type { Prisma } from "@prisma/client";
import type { DispatchNotificationEventInput } from "./types";
import { inngest } from "@/lib/inngest/client";

function log(level: "info" | "warn" | "error", message: string, ctx?: Record<string, unknown>) {
  const entry = { level, message, ...ctx, timestamp: new Date().toISOString() };
  if (level === "error") console.error("[Notification]", JSON.stringify(entry));
  else if (level === "warn") console.warn("[Notification]", JSON.stringify(entry));
  else console.info("[Notification]", JSON.stringify(entry));
}

/**
 * Dispatch a notification event. Idempotent by idempotencyKey.
 * Creates event record, enqueues background processing (Inngest).
 * Non-blocking: returns after event creation + enqueue attempt; delivery runs in background.
 * If enqueue fails, event is marked (enqueuedAt=null, enqueueError set) for later recovery.
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
    log("error", "Inngest send failed; event marked for recovery", {
      eventId: event.id,
      type,
      error: e.message,
    });
  }

  return { eventId: event.id, alreadyExisted: false };
}
