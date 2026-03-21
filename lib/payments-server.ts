/**
 * Server-side payment helpers.
 * Centralizes payment record creation and lifecycle.
 */

import { prisma } from "@/db";

export interface CreatePendingPaymentInput {
  bookingId: string;
  amount: number;
  currency: string;
  stripePaymentIntentId: string;
  stripeCheckoutSessionId: string;
  metadata?: {
    renterId?: string;
    ownerId?: string;
    carId?: string;
  };
}

/**
 * Create or reuse a PENDING payment record when checkout is initiated.
 * Idempotent by stripePaymentIntentId.
 */
export async function createPendingPaymentForCheckout(
  input: CreatePendingPaymentInput
): Promise<void> {
  await prisma.payment.upsert({
    where: { stripePaymentIntentId: input.stripePaymentIntentId },
    update: {},
    create: {
      bookingId: input.bookingId,
      type: "CHARGE",
      amount: input.amount,
      currency: input.currency,
      status: "PENDING",
      stripePaymentIntentId: input.stripePaymentIntentId,
      metadata: {
        stripeCheckoutSessionId: input.stripeCheckoutSessionId,
        ...input.metadata,
      } as object,
    },
  });
}
