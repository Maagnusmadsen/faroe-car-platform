/**
 * GET /api/admin/notifications/observability – notification system health and failures.
 * Admin only.
 */

import { requireAuth, requireAdmin } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import {
  getNotificationObservabilitySummary,
  getEnqueueFailures,
  getFailedDeliveries,
  getPendingRetries,
  getExhaustedRetries,
  getRecentEmailFailures,
} from "@/lib/notifications/observability";

export async function GET() {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const [
      summary,
      enqueueFailures,
      failedDeliveries,
      pendingRetries,
      exhaustedRetries,
      recentEmailFailures,
    ] = await Promise.all([
      getNotificationObservabilitySummary(),
      getEnqueueFailures(),
      getFailedDeliveries(),
      getPendingRetries(),
      getExhaustedRetries(),
      getRecentEmailFailures(),
    ]);

    return jsonSuccess({
      summary,
      enqueueFailures,
      failedDeliveries,
      pendingRetries,
      exhaustedRetries,
      recentEmailFailures,
    });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) return jsonError(e.message, 401);
    if (e.statusCode === 403) return jsonError(e.message, 403);
    return handleApiError(err);
  }
}
