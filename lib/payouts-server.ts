/**
 * Server-side payout helpers.
 *
 * Responsibilities:
 * - Determine how much each owner should receive from completed, paid bookings.
 * - Create Payout records linked to owners and bookings.
 * - Track payout status for future Stripe Connect transfers.
 *
 * This does NOT talk to Stripe directly; it only prepares and records payouts.
 */

import { prisma } from "@/db";
import { AppError, HttpStatus } from "@/lib/utils/errors";
import { notifyPayoutCreated } from "@/lib/notifications-server";

export interface OwnerEarning {
  bookingId: string;
  carId: string;
  startDate: Date;
  endDate: Date;
  ownerPayoutAmount: number;
  currency: string;
}

export interface PayoutPreview {
  ownerId: string;
  currency: string;
  totalAmount: number;
  bookings: OwnerEarning[];
}

/**
 * Find unpaid, paid bookings for an owner that are eligible for payout.
 * Criteria:
 * - Booking.car.ownerId = ownerId
 * - Booking.status = COMPLETED
 * - Booking.ownerPayoutAmount > 0
 * - Booking.payoutId IS NULL (not yet included in a payout)
 * - At least one SUCCEEDED Payment of type CHARGE linked to the booking
 */
export async function findUnpaidBookingsForOwner(
  ownerId: string
): Promise<OwnerEarning[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      car: { ownerId },
      status: "COMPLETED",
      ownerPayoutAmount: { gt: 0 },
      payoutId: null,
      payments: {
        some: {
          type: "CHARGE",
          status: "SUCCEEDED",
        },
      },
    },
    select: {
      id: true,
      carId: true,
      startDate: true,
      endDate: true,
      ownerPayoutAmount: true,
      currency: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return bookings.map((b) => ({
    bookingId: b.id,
    carId: b.carId,
    startDate: b.startDate,
    endDate: b.endDate,
    ownerPayoutAmount: Number(b.ownerPayoutAmount),
    currency: b.currency,
  }));
}

/**
 * Preview payout for an owner: sum of unpaid earnings by currency.
 * Currently we assume all payouts are in a single currency per owner.
 */
export async function previewPayoutForOwner(
  ownerId: string
): Promise<PayoutPreview | null> {
  const earnings = await findUnpaidBookingsForOwner(ownerId);
  if (earnings.length === 0) return null;

  const currency = earnings[0].currency;
  const totalAmount = earnings
    .filter((e) => e.currency === currency)
    .reduce((sum, e) => sum + e.ownerPayoutAmount, 0);

  return {
    ownerId,
    currency,
    totalAmount,
    bookings: earnings,
  };
}

/**
 * Create a Payout for an owner and attach all eligible bookings to it.
 * This is idempotent per booking: only bookings with payoutId = null are included.
 */
export async function createPayoutForOwner(ownerId: string) {
  const preview = await previewPayoutForOwner(ownerId);
  if (!preview) {
    throw new AppError(
      "No completed, paid bookings eligible for payout",
      HttpStatus.BAD_REQUEST,
      "NO_PAYOUT_DUE"
    );
  }

  return prisma.$transaction(async (tx) => {
    // Re-check inside TX to avoid race conditions
    const freshBookings = await tx.booking.findMany({
      where: {
        car: { ownerId },
        status: "COMPLETED",
        ownerPayoutAmount: { gt: 0 },
        payoutId: null,
        payments: {
          some: {
            type: "CHARGE",
            status: "SUCCEEDED",
          },
        },
      },
      select: {
        id: true,
        ownerPayoutAmount: true,
        currency: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (freshBookings.length === 0) {
      throw new AppError(
        "No completed, paid bookings eligible for payout",
        HttpStatus.BAD_REQUEST,
        "NO_PAYOUT_DUE"
      );
    }

    const currency = freshBookings[0].currency;
    const totalAmount = freshBookings.reduce(
      (sum, b) => sum + Number(b.ownerPayoutAmount),
      0
    );

    const payout = await tx.payout.create({
      data: {
        userId: ownerId,
        amount: totalAmount,
        currency,
        status: "PENDING", // later: mark COMPLETED when Stripe transfer settles
      },
    });

    // Attach bookings to this payout
    await tx.booking.updateMany({
      where: {
        id: { in: freshBookings.map((b) => b.id) },
      },
      data: { payoutId: payout.id },
    });

    await notifyPayoutCreated(ownerId, payout.id, totalAmount);

    return payout;
  });
}

