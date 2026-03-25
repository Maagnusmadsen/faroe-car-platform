/**
 * Owner dashboard summary API.
 *
 * GET /api/owner/dashboard – summary of listings, bookings, payouts, and reviews for current owner.
 */

import { requireAuth } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { getOwnerRecentBookings, getOwnerReviews } from "@/lib/owner-dashboard-server";
import { prisma } from "@/db";
import { previewPayoutForOwner } from "@/lib/payouts-server";
import { isStripeConnectReady } from "@/lib/stripe-connect";

export async function GET() {
  try {
    const session = await requireAuth();
    const ownerId = session.user.id;
    const ownerEmail = session.user.email?.trim().toLowerCase();

    // Listings where you are owner by id OR by same email (so same person always sees their listings)
    const listingWhere =
      ownerEmail != null && ownerEmail !== ""
        ? {
            deletedAt: null,
            OR: [
              { ownerId },
              { owner: { email: { equals: ownerEmail, mode: "insensitive" as const }, deletedAt: null } },
            ],
          }
        : { ownerId, deletedAt: null };

    const [user, allListings, bookings, payouts, payoutPreview, reviews] = await Promise.all([
      prisma.user.findUnique({
        where: { id: ownerId },
        select: { stripeConnectAccountId: true },
      }),
      prisma.carListing.findMany({
        where: listingWhere,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          listingType: true,
          brand: true,
          model: true,
          status: true,
          pricePerDay: true,
          town: true,
          island: true,
          reviewCount: true,
          ratingAvg: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      getOwnerRecentBookings(ownerId, 10),
      prisma.payout.findMany({
        where: { userId: ownerId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      previewPayoutForOwner(ownerId),
      getOwnerReviews(ownerId, 10),
    ]);

    const listings = allListings;
    const stripeConnected = await isStripeConnectReady(user?.stripeConnectAccountId ?? null);

    return jsonSuccess({
      listings,
      bookings,
      payouts,
      pendingPayout: payoutPreview,
      reviews,
      stripeConnected,
    });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}

