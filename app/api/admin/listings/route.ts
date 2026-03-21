/**
 * Admin listings moderation API.
 *
 * GET /api/admin/listings – list listings with pagination and filters.
 */

import { NextRequest } from "next/server";
import { requireAuth, requireAdmin } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { prisma } from "@/db";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize")) || 20));
    const statusFilter = searchParams.get("status")?.trim();

    const where = {
      deletedAt: null,
      ...(statusFilter && statusFilter !== "all"
        ? { status: statusFilter as "DRAFT" | "ACTIVE" | "PAUSED" | "REJECTED" }
        : {}),
    };

    const [listings, total] = await Promise.all([
      prisma.carListing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          brand: true,
          model: true,
          year: true,
          town: true,
          island: true,
          status: true,
          pricePerDay: true,
          owner: {
            select: { id: true, email: true, name: true },
          },
          createdAt: true,
          _count: { select: { bookings: true } },
        },
      }),
      prisma.carListing.count({ where }),
    ]);

    const listingsWithCount = listings.map(({ _count, ...l }) => ({
      ...l,
      bookingCount: _count.bookings,
    }));

    return jsonSuccess({
      items: listingsWithCount,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
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

