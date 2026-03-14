/**
 * GET /api/admin/bookings – list all bookings (admin only).
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
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
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
              status: true,
              ownerId: true,
              owner: {
                select: { id: true, email: true, name: true },
              },
            },
          },
          renter: {
            select: { id: true, email: true, name: true },
          },
        },
      }),
      prisma.booking.count(),
    ]);

    return jsonSuccess(
      {
        items: bookings,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      },
      { headers: { "Cache-Control": "private, max-age=30" } }
    );
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) return jsonError(e.message, 401);
    if (e.statusCode === 403) return jsonError(e.message, 403);
    return handleApiError(err);
  }
}
