/**
 * GET /api/conversations – list conversations for current user.
 */

import { requireAuth } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { listConversationsForUser } from "@/lib/messaging-server";

export async function GET() {
  try {
    const session = await requireAuth();
    const data = await listConversationsForUser(session.user.id);
    return jsonSuccess(data);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}

