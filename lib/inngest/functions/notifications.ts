/**
 * Inngest functions: process notification events, enqueue recovery, delivery retries.
 */

import { inngest } from "../client";
import { processNotificationEvent } from "@/lib/notifications/processor";
import { recoverFailedEnqueues, retryFailedDeliveries } from "@/lib/notifications/recovery";
import { processMessageDigests } from "@/lib/notifications/message-batching";

export const processNotificationEventFn = inngest.createFunction(
  {
    id: "notification-process-event",
    retries: 3,
    triggers: [{ event: "notification/dispatch" }],
  },
  async ({ event }) => {
    const eventId = event.data.eventId as string;
    if (!eventId) {
      throw new Error("notification/dispatch event missing eventId");
    }
    await processNotificationEvent(eventId);
  }
);

export const notificationRecoveryFn = inngest.createFunction(
  {
    id: "notification-recovery",
    retries: 2,
    concurrency: { limit: 1 },
    triggers: [{ cron: "*/5 * * * *" }],
  },
  async () => {
    const [enqueueResult, deliveryResult] = await Promise.all([
      recoverFailedEnqueues(),
      retryFailedDeliveries(),
    ]);
    return {
      enqueue: enqueueResult,
      delivery: deliveryResult,
    };
  }
);

export const messageDigestFn = inngest.createFunction(
  {
    id: "message-digest",
    retries: 2,
    concurrency: { limit: 1 },
    triggers: [{ cron: "*/3 * * * *" }],
  },
  async () => {
    const result = await processMessageDigests();
    return result;
  }
);
