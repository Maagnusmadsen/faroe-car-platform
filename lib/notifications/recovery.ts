/**
 * Recovery jobs: enqueue failed events, retry failed deliveries.
 */

import { prisma } from "@/db";
import { inngest } from "@/lib/inngest/client";
import { retryDelivery } from "./processor";
import { MAX_DELIVERY_ATTEMPTS } from "./retry";

function log(level: "info" | "warn" | "error", message: string, ctx?: Record<string, unknown>) {
  const entry = { level, message, ...ctx, timestamp: new Date().toISOString() };
  if (level === "error") console.error("[Notification Recovery]", JSON.stringify(entry));
  else if (level === "warn") console.warn("[Notification Recovery]", JSON.stringify(entry));
  else console.info("[Notification Recovery]", JSON.stringify(entry));
}

const ENQUEUE_RECOVERY_AGE_MS = 60_000;
const ENQUEUE_RECOVERY_MAX_AGE_DAYS = 7;

/**
 * Retry inngest.send() for events that failed to enqueue.
 */
export async function recoverFailedEnqueues(): Promise<{ recovered: number; failed: number }> {
  const cutoff = new Date(Date.now() - ENQUEUE_RECOVERY_AGE_MS);
  const maxAge = new Date(Date.now() - ENQUEUE_RECOVERY_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  const events = await prisma.notificationEvent.findMany({
    where: {
      enqueuedAt: null,
      createdAt: { lt: cutoff, gte: maxAge },
    },
    take: 50,
    orderBy: { createdAt: "asc" },
  });

  let recovered = 0;
  let failed = 0;

  for (const event of events) {
    try {
      await inngest.send({
        name: "notification/dispatch",
        data: { eventId: event.id },
      });
      await prisma.notificationEvent.update({
        where: { id: event.id },
        data: { enqueuedAt: new Date(), enqueueError: null },
      });
      recovered++;
      log("info", "Enqueue recovered", { eventId: event.id });
    } catch (err) {
      failed++;
      const e = err as Error;
      await prisma.notificationEvent.update({
        where: { id: event.id },
        data: { enqueueError: e.message },
      });
      log("warn", "Enqueue recovery failed", { eventId: event.id, error: e.message });
    }
  }

  return { recovered, failed };
}

/**
 * Retry failed deliveries that are due (nextRetryAt <= now).
 */
export async function retryFailedDeliveries(): Promise<{ retried: number; failed: number }> {
  const deliveries = await prisma.notificationDelivery.findMany({
    where: {
      status: "FAILED",
      nextRetryAt: { lte: new Date(), not: null },
      attemptCount: { lt: MAX_DELIVERY_ATTEMPTS },
    },
    take: 50,
    orderBy: { nextRetryAt: "asc" },
  });

  let retried = 0;
  let failed = 0;

  for (const d of deliveries) {
    try {
      const ok = await retryDelivery(d.id);
      if (ok) retried++;
      else failed++;
    } catch (err) {
      failed++;
      log("warn", "Delivery retry threw", { deliveryId: d.id, error: (err as Error).message });
    }
  }

  return { retried, failed };
}
