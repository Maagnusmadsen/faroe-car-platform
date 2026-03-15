/**
 * Reviews API.
 *
 * POST /api/reviews – create a review for a completed booking
 *   Body: { bookingId, type: "car" | "renter", rating, body? | comment? }
 *   - type "car": renter reviews the car (only renter can call)
 *   - type "renter": owner reviews the renter (only owner can call)
 *
 * GET /api/reviews?carId=... – list car reviews for a listing (public)
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { parseOrThrow } from "@/lib/utils/validate";
import { reviewCreateSchema } from "@/validation";
import { createCarReview, createUserReview, listCarReviewsForCar } from "@/lib/reviews-server";
import { AppError, HttpStatus } from "@/lib/utils/errors";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const input = parseOrThrow(reviewCreateSchema, body);
    const comment = input.comment ?? input.body;
    if (input.type === "car") {
      const review = await createCarReview({
        bookingId: input.bookingId,
        reviewerId: session.user.id,
        rating: input.rating,
        comment,
      });
      return jsonSuccess(review);
    }
    const review = await createUserReview({
      bookingId: input.bookingId,
      reviewerId: session.user.id,
      rating: input.rating,
      comment,
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
    const reviews = await listCarReviewsForCar(carId, limit, offset);
    return jsonSuccess(reviews);
  } catch (err) {
    return handleApiError(err);
  }
}
