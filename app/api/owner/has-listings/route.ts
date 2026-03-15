/**
 * Lightweight check: does the current user have at least one listing?
 * GET /api/owner/has-listings → { hasListings: boolean }
 */

import { requireAuth } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { prisma } from "@/db";

export async function GET() {
  try {
    const session = await requireAuth();
    const ownerId = session.user.id;

    const count = await prisma.carListing.count({
      where: { ownerId, deletedAt: null },
    });

    return jsonSuccess(
      { hasListings: count > 0 },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}
