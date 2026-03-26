/**
 * Inngest functions: booking lifecycle maintenance.
 * - Auto-cancel stale PENDING_PAYMENT bookings (48h TTL)
 * - Detect payment/booking state inconsistencies (money moved, booking not confirmed)
 */

import { inngest } from "../client";
import { prisma } from "@/db";

const PENDING_PAYMENT_TTL_HOURS = 48;

/**
 * Auto-cancel bookings stuck in PENDING_PAYMENT for longer than the TTL.
 * Frees up car availability and prevents indefinite holds.
 */
export const cancelStalePendingPaymentsFn = inngest.createFunction(
  {
    id: "booking-cancel-stale-pending-payments",
    retries: 2,
    concurrency: { limit: 1 },
    triggers: [{ cron: "0 * * * *" }],
  },
  async () => {
    const cutoff = new Date(Date.now() - PENDING_PAYMENT_TTL_HOURS * 60 * 60 * 1000);

    const staleBookings = await prisma.booking.findMany({
      where: {
        status: "PENDING_PAYMENT",
        updatedAt: { lt: cutoff },
      },
      select: { id: true, updatedAt: true },
    });

    if (staleBookings.length === 0) {
      return { cancelled: 0 };
    }

    const ids = staleBookings.map((b) => b.id);

    await prisma.$transaction([
      prisma.booking.updateMany({
        where: { id: { in: ids }, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED" },
      }),
      ...ids.map((id) =>
        prisma.bookingStatusHistory.create({
          data: { bookingId: id, status: "CANCELLED", note: `Auto-cancelled: no payment within ${PENDING_PAYMENT_TTL_HOURS}h` },
        })
      ),
    ]);

    console.info("[Booking Maintenance] Auto-cancelled stale PENDING_PAYMENT bookings", {
      count: staleBookings.length,
      bookingIds: ids,
      cutoff: cutoff.toISOString(),
    });

    return { cancelled: staleBookings.length, bookingIds: ids };
  }
);

/**
 * Detect payment/booking state inconsistencies:
 * a SUCCEEDED CHARGE payment whose booking is not CONFIRMED or COMPLETED.
 * This catches the race where money moved but the booking was cancelled.
 */
export const detectPaymentBookingMismatchFn = inngest.createFunction(
  {
    id: "booking-detect-payment-mismatch",
    retries: 2,
    concurrency: { limit: 1 },
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async () => {
    const mismatches = await prisma.payment.findMany({
      where: {
        type: "CHARGE",
        status: "SUCCEEDED",
        booking: {
          status: { notIn: ["CONFIRMED", "COMPLETED"] },
        },
      },
      select: {
        id: true,
        stripePaymentIntentId: true,
        amount: true,
        booking: {
          select: { id: true, status: true },
        },
      },
    });

    if (mismatches.length > 0) {
      console.error("[ALERT] Payment/booking state mismatch detected — manual review required", {
        count: mismatches.length,
        mismatches: mismatches.map((m) => ({
          paymentId: m.id,
          paymentIntentId: m.stripePaymentIntentId,
          amount: Number(m.amount),
          bookingId: m.booking?.id,
          bookingStatus: m.booking?.status,
        })),
      });
    }

    return { mismatchCount: mismatches.length };
  }
);
