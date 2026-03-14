/**
 * Reviews API.
 *
 * POST /api/reviews – create a review for a booking
 *   Body: { bookingId, rating, body? }
 *
 * GET /api/reviews?carId=... – list reviews for a listing
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { parseOrThrow } from "@/lib/utils/validate";
import { reviewCreateSchema } from "@/validation";
import { createReviewForBooking, listReviewsForCar } from "@/lib/reviews-server";
import { AppError, HttpStatus } from "@/lib/utils/errors";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const input = parseOrThrow(reviewCreateSchema, body);
    const review = await createReviewForBooking({
      bookingId: input.bookingId,
      reviewerId: session.user.id,
      rating: input.rating,
      body: input.body,
    });
    return jsonSuccess(review);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const carId = searchParams.get("carId") ?? "";
    if (!carId) {
      throw new AppError("carId is required", HttpStatus.BAD_REQUEST, "INVALID_REQUEST");
    }
    const limit = parseInt(searchParams.get("limit") ?? "10", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const reviews = await listReviewsForCar(carId, limit, offset);
    return jsonSuccess(reviews);
  } catch (err) {
    return handleApiError(err);
  }
}

