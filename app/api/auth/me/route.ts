/**
 * GET /api/auth/me – current app user (synced from Supabase).
 * Returns 200 + { data: { id, email, name, role } } or 401.
 */

import { getSession } from "@/auth/guards";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return jsonError("Unauthorized", 401);
    }
    return jsonSuccess(session.user);
  } catch (err) {
    return handleApiError(err);
  }
}
