/**
 * Admin user management API.
 *
 * GET /api/admin/users – list users (with pagination, owner/renter info)
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
    const search = searchParams.get("search")?.trim() ?? "";
    const filter = searchParams.get("filter") ?? "all";
    const roleFilter = searchParams.get("role") ?? "all";

    const where: Record<string, unknown> = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    if (filter === "pending") {
      where.profile = { verificationStatus: "PENDING" };
    } else if (filter === "verified") {
      where.profile = { verificationStatus: "VERIFIED" };
    }

    if (roleFilter === "ADMIN") {
      where.role = "ADMIN";
    } else if (roleFilter === "USER") {
      where.role = "USER";
    }

    const [users, total, pendingCount] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          profile: {
            select: { verificationStatus: true, licenseImageUrl: true },
          },
          _count: {
            select: { carListings: true, bookingsAsRenter: true },
          },
        },
      }),
      prisma.user.count({ where }),
      prisma.userProfile.count({ where: { verificationStatus: "PENDING" } }),
    ]);

    const usersWithVerification = users.map(({ profile, _count, ...u }) => ({
      ...u,
      verificationStatus: profile?.verificationStatus ?? "UNVERIFIED",
      licenseImageUrl: profile?.licenseImageUrl ?? null,
      listingCount: _count.carListings,
      bookingCount: _count.bookingsAsRenter,
    }));

    return jsonSuccess({
      items: usersWithVerification,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
      pendingApprovals: pendingCount,
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

