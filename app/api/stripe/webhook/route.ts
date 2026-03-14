/**
 * POST /api/stripe/webhook – Stripe webhook handler.
 * Handles:
 * - checkout.session.completed → marks payment as SUCCEEDED and booking as CONFIRMED
 * - payment_intent.payment_failed → marks payment as FAILED
 *
 * Idempotency:
 * - Uses upsert on Payment by stripePaymentIntentId.
 * - Booking updates are idempotent (setting the same status multiple times is safe).
 */

import { NextRequest } from "next/server";
import Stripe from "stripe";
import { env } from "@/config/env";
import { getStripeClient } from "@/payments";
import { prisma } from "@/db";
import { HttpStatus } from "@/lib/utils/errors";
import { notifyBookingConfirmed, notifyPaymentReceived } from "@/lib/notifications-server";

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const webhookSecret = env.stripeWebhookSecret;
  const sig = request.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    const body = await request.text();
    if (!webhookSecret || !sig) {
      return new Response("Webhook not configured", { status: 500 });
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;
        if (!bookingId || !paymentIntentId) break;

        await prisma.$transaction(async (tx) => {
          const booking = await tx.booking.findUnique({
            where: { id: bookingId },
            include: { car: { select: { ownerId: true } } },
          });
          if (!booking?.car) return;

          const amount = booking.totalPrice;

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

          if (booking.status === "PENDING_PAYMENT") {
            const updated = await tx.booking.update({
              where: { id: booking.id },
              data: { status: "CONFIRMED" },
            });

            // Notify renter that booking is confirmed
            await notifyBookingConfirmed(
              updated.renterId,
              updated.id,
              updated.carId
            );
          }

          // Notify owner about payment receipt (ownerId from car)
          await notifyPaymentReceived(
            booking.car.ownerId,
            booking.id,
            Number(amount)
          );
        });
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const paymentIntentId = pi.id;

        await prisma.payment.updateMany({
          where: { stripePaymentIntentId: paymentIntentId },
          data: { status: "FAILED" },
        });
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const userId = account.metadata?.userId;
        if (userId && account.id) {
          await prisma.user.updateMany({
            where: { id: userId },
            data: { stripeConnectAccountId: account.id },
          });
        }
        break;
      }
      default:
        // ignore other events for now
        break;
    }

    return new Response("ok", { status: HttpStatus.OK ?? 200 });
  } catch (err) {
    // Log error; respond 200 to avoid repeated retries if we can't handle it gracefully.
    console.error("Stripe webhook error", err);
    return new Response("error", { status: 200 });
  }
}

