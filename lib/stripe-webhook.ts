/**
 * Stripe webhook processing logic.
 * Production-safe: idempotent, retry-friendly, proper error handling.
 */

import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/db";
import { notifyBookingConfirmed, notifyPaymentReceived } from "@/lib/notifications-server";

export type WebhookResult =
  | { ok: true; alreadyProcessed?: boolean }
  | { ok: false; retryable: boolean; reason: string };

/** Structured log for webhook events. Use console for now; swap for pino/winston in production. */
function log(
  level: "info" | "warn" | "error",
  message: string,
  context?: Record<string, unknown>
) {
  const entry = { level, message, ...context, timestamp: new Date().toISOString() };
  if (level === "error") {
    console.error("[Stripe Webhook]", JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn("[Stripe Webhook]", JSON.stringify(entry));
  } else {
    console.info("[Stripe Webhook]", JSON.stringify(entry));
  }
}

/**
 * Check if we have already processed this event (idempotency).
 * Returns true if already processed, false if new.
 */
async function isEventAlreadyProcessed(
  stripeEventId: string,
  tx: { stripeWebhookEvent: typeof prisma.stripeWebhookEvent }
): Promise<boolean> {
  const existing = await tx.stripeWebhookEvent.findUnique({
    where: { stripeEventId },
  });
  return existing != null;
}

/**
 * Record that we have processed this event (call after successful processing).
 */
async function recordEventProcessed(
  stripeEventId: string,
  eventType: string,
  payload: Record<string, unknown> | null,
  tx: { stripeWebhookEvent: typeof prisma.stripeWebhookEvent }
): Promise<void> {
  await tx.stripeWebhookEvent.create({
    data: {
      stripeEventId,
      eventType,
      ...(payload != null && { payload: payload as Prisma.InputJsonValue }),
    },
  });
}

/**
 * Process checkout.session.completed: Payment succeeded, confirm booking.
 * Idempotent: safe to call multiple times with same event.
 */
async function processCheckoutSessionCompleted(
  event: Stripe.Event,
  session: Stripe.Checkout.Session
): Promise<WebhookResult> {
  const bookingId = session.metadata?.bookingId;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent as Stripe.PaymentIntent)?.id;

  if (!bookingId || !paymentIntentId) {
    log("warn", "checkout.session.completed missing metadata", {
      eventId: event.id,
      hasBookingId: !!bookingId,
      hasPaymentIntentId: !!paymentIntentId,
    });
    return { ok: false, retryable: false, reason: "Missing bookingId or payment_intent in session metadata" };
  }

  return prisma.$transaction(async (tx) => {
    // Idempotency: if we already processed this event, skip
    const alreadyProcessed = await isEventAlreadyProcessed(event.id, tx);
    if (alreadyProcessed) {
      log("info", "Event already processed, skipping", { eventId: event.id });
      return { ok: true, alreadyProcessed: true };
    }

    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { car: { select: { ownerId: true } } },
    });

    if (!booking?.car) {
      log("warn", "Booking not found for checkout session", {
        eventId: event.id,
        bookingId,
      });
      return { ok: false, retryable: false, reason: "Booking not found or car missing" };
    }

    const amount = booking.totalPrice;

    // Update Payment from PENDING to SUCCEEDED (created at checkout initiation).
    // Fallback create for legacy flows or missed checkout creates.
    await tx.payment.upsert({
      where: { stripePaymentIntentId: paymentIntentId },
      update: {
        status: "SUCCEEDED",
        bookingId: booking.id,
      },
      create: {
        bookingId: booking.id,
        type: "CHARGE",
        amount,
        currency: booking.currency,
        status: "SUCCEEDED",
        stripePaymentIntentId: paymentIntentId,
      },
    });

    // Only update booking if still PENDING_PAYMENT (idempotent)
    if (booking.status === "PENDING_PAYMENT") {
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED" },
      });
      await notifyBookingConfirmed(updated.renterId, updated.id, updated.carId);
    }

    await notifyPaymentReceived(booking.car.ownerId, booking.id, Number(amount));

    await recordEventProcessed(
      event.id,
      event.type,
      { bookingId, paymentIntentId },
      tx
    );

    log("info", "checkout.session.completed processed", {
      eventId: event.id,
      bookingId,
      amount: Number(amount),
    });

    return { ok: true };
  });
}

/**
 * Process checkout.session.expired: user abandoned checkout.
 * Updates Payment from PENDING to CANCELLED.
 */
async function processCheckoutSessionExpired(
  event: Stripe.Event,
  session: Stripe.Checkout.Session
): Promise<WebhookResult> {
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) {
    log("info", "checkout.session.expired has no payment_intent, skipping", {
      eventId: event.id,
      sessionId: session.id,
    });
    return { ok: true };
  }

  return prisma.$transaction(async (tx) => {
    const alreadyProcessed = await isEventAlreadyProcessed(event.id, tx);
    if (alreadyProcessed) {
      log("info", "Event already processed, skipping", { eventId: event.id });
      return { ok: true, alreadyProcessed: true };
    }

    const result = await tx.payment.updateMany({
      where: { stripePaymentIntentId: paymentIntentId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    await recordEventProcessed(
      event.id,
      event.type,
      { paymentIntentId, sessionId: session.id, updatedCount: result.count },
      tx
    );

    log("info", "checkout.session.expired processed", {
      eventId: event.id,
      paymentIntentId,
      updatedCount: result.count,
    });

    return { ok: true };
  });
}

/**
 * Process payment_intent.payment_failed.
 * Updates any existing Payment record to FAILED.
 */
async function processPaymentIntentFailed(
  event: Stripe.Event,
  paymentIntent: Stripe.PaymentIntent
): Promise<WebhookResult> {
  const paymentIntentId = paymentIntent.id;

  return prisma.$transaction(async (tx) => {
    const alreadyProcessed = await isEventAlreadyProcessed(event.id, tx);
    if (alreadyProcessed) {
      log("info", "Event already processed, skipping", { eventId: event.id });
      return { ok: true, alreadyProcessed: true };
    }

    const result = await tx.payment.updateMany({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { status: "FAILED" },
    });

    await recordEventProcessed(
      event.id,
      event.type,
      { paymentIntentId, updatedCount: result.count },
      tx
    );

    log("info", "payment_intent.payment_failed processed", {
      eventId: event.id,
      paymentIntentId,
      updatedCount: result.count,
    });

    return { ok: true };
  });
}

/**
 * Process account.updated (Stripe Connect).
 */
async function processAccountUpdated(
  event: Stripe.Event,
  account: Stripe.Account
): Promise<WebhookResult> {
  const userId = account.metadata?.userId;
  if (!userId || !account.id) {
    log("warn", "account.updated missing metadata", {
      eventId: event.id,
      hasUserId: !!userId,
      hasAccountId: !!account.id,
    });
    return { ok: false, retryable: false, reason: "Missing userId or account.id in metadata" };
  }

  return prisma.$transaction(async (tx) => {
    const alreadyProcessed = await isEventAlreadyProcessed(event.id, tx);
    if (alreadyProcessed) {
      log("info", "Event already processed, skipping", { eventId: event.id });
      return { ok: true, alreadyProcessed: true };
    }

    await tx.user.updateMany({
      where: { id: userId },
      data: { stripeConnectAccountId: account.id },
    });

    await recordEventProcessed(
      event.id,
      event.type,
      { userId, accountId: account.id },
      tx
    );

    log("info", "account.updated processed", { eventId: event.id, userId });

    return { ok: true };
  });
}

/**
 * Route Stripe event to the appropriate handler.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<WebhookResult> {
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        return processCheckoutSessionCompleted(event, session);
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        return processCheckoutSessionExpired(event, session);
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        return processPaymentIntentFailed(event, pi);
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        return processAccountUpdated(event, account);
      }
      default:
        log("info", "Unhandled event type, acknowledging", { eventId: event.id, type: event.type });
        return { ok: true };
    }
  } catch (err) {
    const error = err as Error;
    log("error", "Webhook processing failed", {
      eventId: event.id,
      eventType: event.type,
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack,
    });
    return {
      ok: false,
      retryable: true,
      reason: error.message || "Internal processing failure",
    };
  }
}
