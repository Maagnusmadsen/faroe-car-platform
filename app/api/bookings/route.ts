/**
 * POST /api/bookings – create a booking for a listing (renter).
 * GET /api/bookings – list bookings for current user (renter or owner).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionRouteHandler } from "@/auth/guards";
import { jsonCreated, jsonSuccess, handleApiError } from "@/lib/utils/api-response";
import { parseOrThrow, parseQueryOrThrow } from "@/lib/utils/validate";
import {
  bookingCreateSchema,
  bookingListQuerySchema,
} from "@/validation";
import { createBookingForListing } from "@/lib/bookings-server";
import { prisma } from "@/db";

export async function POST(request: NextRequest) {
  const { session, applyCookies } = await getSessionRouteHandler();
  if (!session) {
    const res = NextResponse.json(
      {
        error: "You need to sign in to book a car.",
        code: "UNAUTHENTICATED",
      },
      { status: 401 }
    );
    applyCookies(res);
    return res;
  }

  try {
    const body = await request.json();
    const input = parseOrThrow(bookingCreateSchema, body);

    const booking = await createBookingForListing({
      listingId: input.listingId,
      renterId: session.user.id,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    const res = jsonCreated({
      id: booking.id,
      status: booking.status,
      startDate: booking.startDate,
      endDate: booking.endDate,
    });
    applyCookies(res);
    return res;
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      const res = NextResponse.json(
        { error: e.message, code: "UNAUTHENTICATED" },
        { status: 401 }
      );
      applyCookies(res);
      return res;
    }
    const res = handleApiError(err);
    applyCookies(res);
    return res;
  }
}

export async function GET(request: NextRequest) {
  const { session, applyCookies } = await getSessionRouteHandler();
  if (!session) {
    const res = NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
    applyCookies(res);
    return res;
  }

  try {
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

    const res = jsonSuccess(
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
    applyCookies(res);
    return res;
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      const res = NextResponse.json(
        { error: e.message, code: "UNAUTHENTICATED" },
        { status: 401 }
      );
      applyCookies(res);
      return res;
    }
    const res = handleApiError(err);
    applyCookies(res);
    return res;
  }
}
