/**
 * Inngest API route.
 * Serves Inngest functions and receives events.
 */

import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { processNotificationEventFn, notificationRecoveryFn } from "@/lib/inngest/functions/notifications";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processNotificationEventFn, notificationRecoveryFn],
});
