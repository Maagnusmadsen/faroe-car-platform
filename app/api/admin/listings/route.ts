/**
 * Admin listings moderation API.
 *
 * GET /api/admin/listings – list listings with basic moderation info.
 */

import { requireAuth, requireAdmin } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { prisma } from "@/db";

export async function GET() {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const listings = await prisma.carListing.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        brand: true,
        model: true,
        town: true,
        island: true,
        status: true,
        owner: {
          select: { id: true, email: true, name: true },
        },
        createdAt: true,
      },
    });

    return jsonSuccess(listings);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    if (e.statusCode === 403) {
      return jsonError(e.message, 403);
    }
    return handleApiError(err);
  }
}

