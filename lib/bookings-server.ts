/**
 * Server-side booking helpers.
 * Booking flows should go through these functions so we can enforce
 * availability rules, pricing, and prevent double-bookings.
 */

import { prisma } from "@/db";
import { assertCarAvailableOrThrow } from "@/lib/availability-server";
import { AppError, HttpStatus } from "@/lib/utils/errors";
import { calculatePricingForListing } from "@/lib/pricing";
import { ensureConversationForBooking } from "@/lib/messaging-server";
import { dispatchNotificationEvent } from "@/lib/notifications";
import { getProfileByUserId } from "@/lib/profile";

/**
 * Create a booking while enforcing availability inside a serializable transaction.
 * This makes the logic safe under concurrent requests:
 * - We re-check availability inside the transaction.
 * - With SERIALIZABLE isolation on Postgres, overlapping attempts will cause one
 *   transaction to fail, preventing double-bookings.
 */
export async function createBookingWithAvailabilityCheck(input: {
  carId: string;
  renterId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  currency: string;
  platformFeeAmount: number;
  ownerPayoutAmount: number;
}) {
  if (!input.startDate || !input.endDate) {
    throw new AppError(
      "Start and end dates are required",
      HttpStatus.BAD_REQUEST,
      "INVALID_DATES"
    );
  }

  if (input.endDate <= input.startDate) {
    throw new AppError(
      "End date must be after start date",
      HttpStatus.BAD_REQUEST,
      "INVALID_DATES"
    );
  }

  const {
    carId,
    renterId,
    startDate,
    endDate,
    totalPrice,
    currency,
    platformFeeAmount,
    ownerPayoutAmount,
  } = input;

  return prisma.$transaction(
    async (tx) => {
      // Ensure car exists and is active
      const car = await tx.carListing.findFirst({
        where: { id: carId, status: "ACTIVE", deletedAt: null },
        select: { id: true, ownerId: true },
      });
      if (!car) {
        throw new AppError(
          "Car not found or not available for booking",
          HttpStatus.NOT_FOUND,
          "CAR_NOT_FOUND"
        );
      }

      // Enforce availability (rules, blocked dates, overlapping bookings)
      await assertCarAvailableOrThrow(
        carId,
        { startDate, endDate },
        { tx }
      );

      // If we reach here, the car is available within this transaction.
      const booking = await tx.booking.create({
        data: {
          carId,
          renterId,
          startDate: new Date(startDate + "T00:00:00.000Z"),
          endDate: new Date(endDate + "T23:59:59.999Z"),
          status: "PENDING_APPROVAL",
          totalPrice,
          currency,
          platformFeeAmount,
          ownerPayoutAmount,
        },
      });

      return { booking, ownerId: car.ownerId, carId };
    },
    {
      isolationLevel: "Serializable",
    }
  ).then(async ({ booking, ownerId, carId }) => {
    await ensureConversationForBooking(booking.id);
    await dispatchNotificationEvent({
      type: "booking.requested",
      idempotencyKey: `booking-${booking.id}-requested`,
      payload: { bookingId: booking.id, ownerId, carId },
      sourceId: booking.id,
      sourceType: "booking",
    });
    return booking;
  });
}

export async function createBookingForListing(input: {
  listingId: string;
  renterId: string;
  startDate: string;
  endDate: string;
}) {
  const renterProfile = await getProfileByUserId(input.renterId);
  if (renterProfile?.verificationStatus !== "VERIFIED") {
    throw new AppError(
      "You need to be approved as a renter before you can book a car. Please complete renter approval first.",
      HttpStatus.FORBIDDEN,
      "RENTER_NOT_VERIFIED"
    );
  }

  const pricing = await calculatePricingForListing(
    input.listingId,
    input.startDate,
    input.endDate
  );
  return createBookingWithAvailabilityCheck({
    carId: input.listingId,
    renterId: input.renterId,
    startDate: input.startDate,
    endDate: input.endDate,
    totalPrice: pricing.renterTotalAmount,
    currency: pricing.currency,
    platformFeeAmount: pricing.platformFeeAmount,
    ownerPayoutAmount: pricing.ownerPayoutAmount,
  });
}


