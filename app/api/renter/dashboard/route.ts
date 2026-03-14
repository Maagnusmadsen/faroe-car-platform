/**
 * Renter dashboard summary API.
 *
 * GET /api/renter/dashboard – summary of upcoming/past bookings, favorites, conversations, profile, and pending reviews.
 */

import { requireAuth } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import {
  getRenterUpcomingBookings,
  getRenterPastBookings,
  getRenterSavedCars,
  getRenterPendingReviews,
} from "@/lib/renter-dashboard-server";
import { getProfileByUserId } from "@/lib/profile";
import { listConversationsForUser } from "@/lib/messaging-server";

export async function GET() {
  try {
    const session = await requireAuth();
    const renterId = session.user.id;

    const [
      upcomingBookings,
      pastBookings,
      savedCars,
      conversations,
      profile,
      pendingReviews,
    ] = await Promise.all([
      getRenterUpcomingBookings(renterId, 10),
      getRenterPastBookings(renterId, 10),
      getRenterSavedCars(renterId),
      listConversationsForUser(renterId),
      getProfileByUserId(renterId),
      getRenterPendingReviews(renterId, 10),
    ]);

    return jsonSuccess({
      upcomingBookings,
      pastBookings,
      savedCars,
      conversations,
      profile,
      pendingReviews,
    });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}

