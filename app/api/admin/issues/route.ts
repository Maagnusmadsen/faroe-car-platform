/**
 * GET /api/admin/issues – operational issues, pending approvals, failed payouts.
 */

import { requireAuth, requireAdmin } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { prisma } from "@/db";
import { getAdminIssues } from "@/lib/admin-analytics";

export async function GET() {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const [issues, pendingRenters, pendingListings, failedPayouts, disputedBookings] =
      await Promise.all([
        getAdminIssues(),
        prisma.userProfile.findMany({
          where: { verificationStatus: "PENDING" },
          include: { user: { select: { id: true, email: true, name: true } } },
          take: 50,
        }),
        prisma.carListing.findMany({
          where: { status: "DRAFT", deletedAt: null },
          include: { owner: { select: { id: true, email: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        prisma.payout.findMany({
          where: { status: "FAILED" },
          include: { user: { select: { id: true, email: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        prisma.booking.findMany({
          where: { status: "DISPUTED" },
          include: {
            car: { select: { id: true, brand: true, model: true } },
            renter: { select: { id: true, email: true, name: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        }),
      ]);

    return jsonSuccess({
      issues,
      pendingRenters,
      pendingListings,
      failedPayouts,
      disputedBookings,
    });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) return jsonError(e.message, 401);
    if (e.statusCode === 403) return jsonError(e.message, 403);
    return handleApiError(err);
  }
}
