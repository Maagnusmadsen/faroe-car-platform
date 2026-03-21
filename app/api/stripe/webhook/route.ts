/**
 * POST /api/stripe/webhook – Stripe webhook handler.
 *
 * Production-safe:
 * - Returns 400 for non-retryable errors (invalid data) → Stripe does NOT retry
 * - Returns 500 for retryable errors (transient failures) → Stripe retries
 * - Returns 400 on signature/invalid payload (non-retryable)
 * - Idempotent: same event can be received multiple times safely
 * - Uses StripeWebhookEvent table to prevent duplicate processing
 *
 * Handles:
 * - checkout.session.completed → Payment SUCCEEDED, Booking CONFIRMED
 * - checkout.session.expired → Payment CANCELLED
 * - payment_intent.payment_failed → Payment FAILED
 * - account.updated → User stripeConnectAccountId
 */

import { NextRequest } from "next/server";
import Stripe from "stripe";
import { env } from "@/config/env";
import { getStripeClient } from "@/payments";
import { handleStripeEvent } from "@/lib/stripe-webhook";

/** Log webhook-level errors with context */
function logWebhookError(message: string, context?: Record<string, unknown>) {
  console.error("[Stripe Webhook]", JSON.stringify({
    level: "error",
    message,
    ...context,
    timestamp: new Date().toISOString(),
  }));
}

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const webhookSecret = env.stripeWebhookSecret;
  const sig = request.headers.get("stripe-signature");

  // 1. Signature verification (400 = bad request, do not retry)
  if (!webhookSecret || !sig) {
    logWebhookError("Webhook not configured: missing secret or signature");
    return new Response(
      JSON.stringify({ error: "Webhook not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: string;
  try {
    body = await request.text();
  } catch (err) {
    logWebhookError("Failed to read request body", { error: (err as Error).message });
    return new Response(
      JSON.stringify({ error: "Invalid body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    logWebhookError("Invalid webhook signature", { error: message });
    return new Response(
      JSON.stringify({ error: "Webhook signature verification failed" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Process event
  const result = await handleStripeEvent(event);

  // 3. Response
  if (result.ok) {
    return new Response("ok", { status: 200 });
  }

  // Processing failed – return 400 for non-retryable (Stripe stops), 500 for retryable (Stripe retries)
  const statusCode = result.retryable ? 500 : 400;
  const logMessage = result.retryable
    ? "Event processing failed (retryable – returning 500)"
    : "Event processing failed (non-retryable – returning 400, Stripe will not retry)";

  logWebhookError(logMessage, {
    eventId: event.id,
    eventType: event.type,
    reason: result.reason,
    retryable: result.retryable,
  });

  return new Response(
    JSON.stringify({ error: result.reason }),
    { status: statusCode, headers: { "Content-Type": "application/json" } }
  );
}
