/**
 * POST /api/payments/checkout – create a Stripe Checkout Session for a booking.
 * Body: { bookingId: string }
 *
 * Creates a PENDING Payment record immediately for traceability.
 * Webhook updates it to SUCCEEDED/FAILED/CANCELLED as the flow progresses.
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonSuccess, handleApiError } from "@/lib/utils/api-response";
import { AppError, HttpStatus } from "@/lib/utils/errors";
import { getStripeClient } from "@/payments";
import { prisma } from "@/db";
import { getBaseUrl } from "@/config/env";
import { createPendingPaymentForCheckout } from "@/lib/payments-server";
import { isStripeConnectReady } from "@/lib/stripe-connect";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const bookingId = typeof body?.bookingId === "string" ? body.bookingId : "";
    if (!bookingId) {
      throw new AppError(
        "bookingId is required",
        HttpStatus.BAD_REQUEST,
        "INVALID_REQUEST"
      );
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, renterId: session.user.id },
      include: { car: { include: { owner: { select: { stripeConnectAccountId: true } } } } },
    });
    if (!booking?.car?.owner) {
      throw new AppError(
        "Booking not found",
        HttpStatus.NOT_FOUND,
        "BOOKING_NOT_FOUND"
      );
    }

    if (booking.status !== "PENDING_PAYMENT") {
      throw new AppError(
        "Booking is not in a payable state",
        HttpStatus.CONFLICT,
        "BOOKING_NOT_PAYABLE"
      );
    }

    const ownerStripeAccountId = booking.car.owner.stripeConnectAccountId;
    if (!ownerStripeAccountId) {
      throw new AppError(
        "The car owner has not set up payouts yet. Payment is temporarily unavailable.",
        HttpStatus.CONFLICT,
        "OWNER_STRIPE_NOT_CONNECTED"
      );
    }

    const connectReady = await isStripeConnectReady(ownerStripeAccountId);
    if (!connectReady) {
      throw new AppError(
        "The car owner's payment account is temporarily unavailable. Please try again later or contact support.",
        HttpStatus.CONFLICT,
        "OWNER_STRIPE_SUSPENDED"
      );
    }

    const totalPrice = Number(booking.totalPrice);
    const amountInMinor = Math.round(totalPrice * 100);

    if (amountInMinor <= 0) {
      throw new AppError(
        "Booking has invalid price. Please contact support.",
        HttpStatus.BAD_REQUEST,
        "INVALID_BOOKING_PRICE"
      );
    }

    const platformFeeInMinor = Math.round(Number(booking.platformFeeAmount) * 100);

    const stripe = getStripeClient();

    const baseUrl = getBaseUrl();
    const successUrl = `${baseUrl}/bookings?payment=success`;
    const cancelUrl = `${baseUrl}/bookings?payment=cancelled`;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: booking.currency,
            unit_amount: amountInMinor,
            product_data: {
              name: "Car booking",
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFeeInMinor,
        transfer_data: {
          destination: ownerStripeAccountId,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId: booking.id,
      },
    });

    const paymentIntentId =
      typeof checkoutSession.payment_intent === "string"
        ? checkoutSession.payment_intent
        : checkoutSession.payment_intent?.id;

    if (paymentIntentId) {
      await createPendingPaymentForCheckout({
        bookingId: booking.id,
        amount: totalPrice,
        currency: booking.currency,
        stripePaymentIntentId: paymentIntentId,
        stripeCheckoutSessionId: checkoutSession.id,
        metadata: {
          renterId: session.user.id,
          ownerId: booking.car.ownerId,
          carId: booking.carId,
        },
      });
    }

    return jsonSuccess({ url: checkoutSession.url });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return Response.json({ error: e.message }, { status: 401 });
    }
    return handleApiError(err);
  }
}

