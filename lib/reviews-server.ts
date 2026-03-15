/**
 * Review server: CarReview (renter → car) and UserReview (owner → renter).
 * Booking is source of truth. Only COMPLETED bookings. One car review and one renter review per booking.
 */

import { prisma } from "@/db";
import { AppError, HttpStatus } from "@/lib/utils/errors";

export type ReviewType = "car" | "renter";

/** Load booking and validate that the reviewer can create the given review type. */
export async function assertCanCreateReview(
  bookingId: string,
  reviewerId: string,
  type: ReviewType
): Promise<{ booking: { id: string; carId: string; renterId: string; status: string; car: { ownerId: string } } }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { car: { select: { ownerId: true } } },
  });
  if (!booking) {
    throw new AppError("Booking not found", HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND");
  }
  if (booking.status !== "COMPLETED") {
    throw new AppError(
      "Only completed bookings can be reviewed",
      HttpStatus.BAD_REQUEST,
      "BOOKING_NOT_COMPLETED"
    );
  }

  const ownerId = booking.car.ownerId;
  const renterId = booking.renterId;

  if (type === "car") {
    if (reviewerId !== renterId) {
      throw new AppError(
        "Only the renter can review the car",
        HttpStatus.FORBIDDEN,
        "ONLY_RENTER_CAN_REVIEW_CAR"
      );
    }
    const existing = await prisma.carReview.findUnique({
      where: { bookingId },
      select: { id: true },
    });
    if (existing) {
      throw new AppError(
        "This booking already has a car review",
        HttpStatus.BAD_REQUEST,
        "CAR_REVIEW_ALREADY_EXISTS"
      );
    }
  } else {
    if (reviewerId !== ownerId) {
      throw new AppError(
        "Only the car owner can review the renter",
        HttpStatus.FORBIDDEN,
        "ONLY_OWNER_CAN_REVIEW_RENTER"
      );
    }
    if (reviewerId === renterId) {
      throw new AppError("You cannot review yourself", HttpStatus.BAD_REQUEST, "CANNOT_REVIEW_SELF");
    }
    const existing = await prisma.userReview.findUnique({
      where: { bookingId },
      select: { id: true },
    });
    if (existing) {
      throw new AppError(
        "This booking already has a renter review",
        HttpStatus.BAD_REQUEST,
        "RENTER_REVIEW_ALREADY_EXISTS"
      );
    }
  }

  return { booking: booking as { id: string; carId: string; renterId: string; status: string; car: { ownerId: string } } };
}

function validateRating(rating: number): void {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError(
      "Rating must be between 1 and 5",
      HttpStatus.BAD_REQUEST,
      "INVALID_RATING"
    );
  }
}

/** Create car review (renter → car). One per booking. */
export async function createCarReview(input: {
  bookingId: string;
  reviewerId: string;
  rating: number;
  comment?: string | null;
}) {
  validateRating(input.rating);
  const { booking } = await assertCanCreateReview(input.bookingId, input.reviewerId, "car");

  return prisma.$transaction(async (tx) => {
    const review = await tx.carReview.create({
      data: {
        bookingId: booking.id,
        reviewerId: input.reviewerId,
        carId: booking.carId,
        rating: input.rating,
        comment: input.comment?.trim() || null,
      },
    });
    const agg = await tx.carReview.aggregate({
      where: { carId: booking.carId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await tx.carListing.update({
      where: { id: booking.carId },
      data: {
        ratingAvg: agg._avg.rating ?? null,
        reviewCount: agg._count.rating,
      },
    });
    return review;
  });
}

/** Create user review (owner → renter). One per booking. */
export async function createUserReview(input: {
  bookingId: string;
  reviewerId: string;
  rating: number;
  comment?: string | null;
}) {
  validateRating(input.rating);
  const { booking } = await assertCanCreateReview(input.bookingId, input.reviewerId, "renter");

  return prisma.userReview.create({
    data: {
      bookingId: booking.id,
      reviewerId: input.reviewerId,
      revieweeId: booking.renterId,
      rating: input.rating,
      comment: input.comment?.trim() || null,
    },
  });
}

/** List car reviews for a listing (for public car page). */
export async function listCarReviewsForCar(carId: string, limit = 10, offset = 0) {
  return prisma.carReview.findMany({
    where: { carId },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: limit,
    include: {
      reviewer: {
        select: { id: true, name: true, image: true },
      },
    },
  });
}
