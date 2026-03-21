/**
 * Owner analytics API.
 * GET /api/owner/analytics – metrics, financial summary, car performance, utilization, revenue over time, pickup map data.
 * All data scoped to cars owned by the current user.
 */

import { requireAuth } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import {
  getOwnerTopMetrics,
  getOwnerFinancialSummary,
  getOwnerCarPerformance,
  getOwnerRevenueOverTime,
  getOwnerUtilizationDemand,
  getOwnerPickupLocationsForMap,
  getOwnerUpcomingBookings,
  type PeriodFilter,
} from "@/lib/owner-analytics";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const ownerId = session.user.id;

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") ?? "month") as PeriodFilter;
    const customFrom = searchParams.get("from") ?? undefined;
    const customTo = searchParams.get("to") ?? undefined;
    const vatPercent = searchParams.get("vatPercent");
    const chartGroup = (searchParams.get("chartGroup") ?? "month") as "day" | "week" | "month";

    const [
      topMetrics,
      financialSummary,
      carPerformance,
      revenueDaily,
      revenueWeekly,
      revenueMonthly,
      utilizationDemand,
      pickupLocations,
      upcomingBookings,
    ] = await Promise.all([
      getOwnerTopMetrics(ownerId),
      getOwnerFinancialSummary({
        ownerId,
        period,
        customFrom,
        customTo,
        vatPercent: vatPercent != null ? Number(vatPercent) : undefined,
      }),
      getOwnerCarPerformance(ownerId),
      getOwnerRevenueOverTime(ownerId, "day", 31),
      getOwnerRevenueOverTime(ownerId, "week", 16),
      getOwnerRevenueOverTime(ownerId, "month", 12),
      getOwnerUtilizationDemand(ownerId),
      getOwnerPickupLocationsForMap(ownerId),
      getOwnerUpcomingBookings(ownerId),
    ]);

    return jsonSuccess({
      topMetrics,
      financialSummary,
      carPerformance,
      revenueOverTime: {
        daily: revenueDaily,
        weekly: revenueWeekly,
        monthly: revenueMonthly,
        groupBy: chartGroup,
      },
      utilizationDemand,
      pickupLocations,
      upcomingBookings,
    });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}
