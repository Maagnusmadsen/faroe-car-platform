/**
 * GET /api/admin/dashboard – platform overview metrics (admin only).
 */

import { requireAuth, requireAdmin } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import {
  getAdminDashboardMetrics,
  getAdminRecentActivity,
  getAdminIssues,
  getAdminRevenueOverTime,
  getAdminListingPerformance,
} from "@/lib/admin-analytics";

export async function GET() {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const [
      metrics,
      recentActivity,
      issues,
      revenueOverTime,
      listingPerformance,
    ] = await Promise.all([
      getAdminDashboardMetrics(),
      getAdminRecentActivity(10),
      getAdminIssues(),
      getAdminRevenueOverTime("month", 12),
      getAdminListingPerformance(),
    ]);

    return jsonSuccess({
      metrics,
      recentActivity,
      issues,
      revenueOverTime,
      topListings: listingPerformance.slice(0, 10),
    });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) return jsonError(e.message, 401);
    if (e.statusCode === 403) return jsonError(e.message, 403);
    return handleApiError(err);
  }
}
