/**
 * POST /api/payments/checkout – create a Stripe Checkout Session for a booking.
 * Body: { bookingId: string }
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonSuccess, handleApiError } from "@/lib/utils/api-response";
import { AppError, HttpStatus } from "@/lib/utils/errors";
import { getStripeClient } from "@/payments";
import { prisma } from "@/db";
import { getBaseUrl } from "@/config/env";

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

    const stripe = getStripeClient();

    const baseUrl = getBaseUrl();
    const successUrl = `${baseUrl}/bookings?payment=success`;
    const cancelUrl = `${baseUrl}/bookings?payment=cancelled`;

    const amountInMinor = Math.round(Number(booking.totalPrice) * 100);
    const platformFeeInMinor = Math.round(Number(booking.platformFeeAmount) * 100);

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

    return jsonSuccess({ url: checkoutSession.url });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return Response.json({ error: e.message }, { status: 401 });
    }
    return handleApiError(err);
  }
}

