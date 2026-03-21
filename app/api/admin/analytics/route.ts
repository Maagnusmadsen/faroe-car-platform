/**
 * GET /api/admin/analytics – platform analytics, trends, listing performance.
 */

import { NextRequest } from "next/server";
import { requireAuth, requireAdmin } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import {
  getAdminRevenueOverTime,
  getAdminListingPerformance,
  getAdminDashboardMetrics,
} from "@/lib/admin-analytics";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const groupBy = (searchParams.get("groupBy") ?? "month") as "day" | "week" | "month";

    const [revenueMonthly, revenueWeekly, listingPerformance, metrics] = await Promise.all([
      getAdminRevenueOverTime("month", 12),
      getAdminRevenueOverTime("week", 16),
      getAdminListingPerformance(),
      getAdminDashboardMetrics(),
    ]);

    const cancellationRate =
      metrics.totalBookings > 0
        ? Math.round((metrics.cancelledBookings / metrics.totalBookings) * 1000) / 10
        : 0;

    const totalAvailableDays =
      metrics.activeListings * 365 || 1;
    const utilizationRate =
      metrics.completedBookings > 0
        ? Math.min(
            1,
            (metrics.completedBookings * 3) / totalAvailableDays
          )
        : 0;

    return jsonSuccess({
      revenueMonthly,
      revenueWeekly,
      groupBy,
      listingPerformance,
      metrics: {
        ...metrics,
        cancellationRate,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
      },
    });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) return jsonError(e.message, 401);
    if (e.statusCode === 403) return jsonError(e.message, 403);
    return handleApiError(err);
  }
}
