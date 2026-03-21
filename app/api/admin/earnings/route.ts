/**
 * GET /api/admin/earnings – platform-wide earnings, owner breakdown, revenue over time.
 */

import { NextRequest } from "next/server";
import { requireAuth, requireAdmin } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import {
  getAdminOwnerEarnings,
  getAdminRevenueOverTime,
  getAdminDashboardMetrics,
  getAdminIssues,
} from "@/lib/admin-analytics";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const groupBy = (searchParams.get("groupBy") ?? "month") as "day" | "week" | "month";
    const limit = Math.min(24, Math.max(6, Number(searchParams.get("limit")) || 12));

    const [
      ownerEarnings,
      revenueOverTime,
      { totalPlatformRevenue, platformFees, totalOwnerEarnings },
      issues,
    ] = await Promise.all([
      getAdminOwnerEarnings(),
      getAdminRevenueOverTime(groupBy, limit),
      getAdminDashboardMetrics(),
      getAdminIssues(),
    ]);

    return jsonSuccess({
      summary: {
        totalPlatformRevenue,
        platformFees,
        totalOwnerEarnings,
        currency: "DKK",
      },
      payouts: {
        pending: issues.pendingPayouts,
        failed: issues.failedPayouts,
      },
      ownerEarnings,
      revenueOverTime,
    });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) return jsonError(e.message, 401);
    if (e.statusCode === 403) return jsonError(e.message, 403);
    return handleApiError(err);
  }
}
