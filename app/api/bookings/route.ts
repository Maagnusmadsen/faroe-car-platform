/**
 * POST /api/bookings – create a booking for a listing (renter).
 * GET /api/bookings – list bookings for current user (renter or owner).
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonCreated, jsonSuccess, handleApiError } from "@/lib/utils/api-response";
import { parseOrThrow, parseQueryOrThrow } from "@/lib/utils/validate";
import {
  bookingCreateSchema,
  bookingListQuerySchema,
} from "@/validation";
import { createBookingForListing } from "@/lib/bookings-server";
import { prisma } from "@/db";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const input = parseOrThrow(bookingCreateSchema, body);

    const booking = await createBookingForListing({
      listingId: input.listingId,
      renterId: session.user.id,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    return jsonCreated({
      id: booking.id,
      status: booking.status,
      startDate: booking.startDate,
      endDate: booking.endDate,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const query = parseQueryOrThrow(
      bookingListQuerySchema,
      Object.fromEntries(searchParams.entries())
    );

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const role = query.role ?? "renter";

    const where =
      role === "owner"
        ? {
            car: { ownerId: session.user.id },
          }
        : {
            renterId: session.user.id,
          };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          car: {
            select: {
              id: true,
              title: true,
              brand: true,
              model: true,
              town: true,
              island: true,
              pricePerDay: true,
              ownerId: true,
            },
          },
          renter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    const bookingIds = bookings.map((b) => b.id);
    const [carReviews, userReviews] =
      bookingIds.length === 0
        ? [[], []]
        : await Promise.all([
            prisma.carReview.findMany({
              where: { bookingId: { in: bookingIds } },
              select: { bookingId: true },
            }),
            prisma.userReview.findMany({
              where: { bookingId: { in: bookingIds } },
              select: { bookingId: true },
            }),
          ]);
    const carReviewedSet = new Set(carReviews.map((r) => r.bookingId));
    const userReviewedSet = new Set(userReviews.map((r) => r.bookingId));

    const items = bookings.map((b) => ({
      ...b,
      hasCarReviewed: carReviewedSet.has(b.id),
      hasRenterReviewed: userReviewedSet.has(b.id),
    }));

    return jsonSuccess(
      {
        items,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      }
    );
  } catch (err) {
    return handleApiError(err);
  }
}
