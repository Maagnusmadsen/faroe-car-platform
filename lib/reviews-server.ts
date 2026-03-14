import { prisma } from "@/db";
import { AppError, HttpStatus } from "@/lib/utils/errors";

export async function assertUserCanReviewBooking(
  bookingId: string,
  reviewerId: string
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      car: { select: { ownerId: true } },
    },
  });
  if (!booking) {
    throw new AppError(
      "Booking not found",
      HttpStatus.NOT_FOUND,
      "BOOKING_NOT_FOUND"
    );
  }

  if (booking.status !== "COMPLETED") {
    throw new AppError(
      "Only completed bookings can be reviewed",
      HttpStatus.BAD_REQUEST,
      "BOOKING_NOT_COMPLETED"
    );
  }

  const isRenter = booking.renterId === reviewerId;
  const isOwner = booking.car.ownerId === reviewerId;

  if (!isRenter && !isOwner) {
    throw new AppError(
      "Forbidden",
      HttpStatus.FORBIDDEN,
      "NOT_BOOKING_PARTICIPANT"
    );
  }

  const existing = await prisma.review.findFirst({
    where: { bookingId, reviewerId },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(
      "You have already reviewed this booking",
      HttpStatus.BAD_REQUEST,
      "REVIEW_ALREADY_EXISTS"
    );
  }

  return { booking, isRenter, isOwner };
}

export async function createReviewForBooking(input: {
  bookingId: string;
  reviewerId: string;
  rating: number;
  body?: string;
}) {
  const rating = input.rating;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError(
      "Rating must be between 1 and 5",
      HttpStatus.BAD_REQUEST,
      "INVALID_RATING"
    );
  }

  const { booking, isRenter, isOwner } = await assertUserCanReviewBooking(
    input.bookingId,
    input.reviewerId
  );

  const revieweeId = isRenter ? booking.car.ownerId : booking.renterId;

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        bookingId: booking.id,
        carId: booking.carId,
        reviewerId: input.reviewerId,
        revieweeId,
        rating,
        body: input.body?.trim() || null,
      },
    });

    // Recalculate car ratingAvg and reviewCount
    const agg = await tx.review.aggregate({
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

export async function listReviewsForCar(carId: string, limit = 10, offset = 0) {
  const reviews = await prisma.review.findMany({
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

  return reviews;
}

