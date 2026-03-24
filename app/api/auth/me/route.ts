/**
 * GET /api/auth/me – current app user (synced from Supabase).
 * Returns 200 + { data: { id, email, name, role } } or 401.
 */

import { getSession } from "@/auth/guards";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-response";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const debug = process.env.AUTH_DEBUG === "1";
    if (debug) {
      const store = await cookies();
      const cookieNames = store.getAll().map((c) => c.name);
      const sbCookies = cookieNames.filter((n) => n.includes("sb-"));
      console.info("[AuthDebug] /api/auth/me cookies", {
        totalCookies: cookieNames.length,
        supabaseCookies: sbCookies,
      });
    }

    const session = await getSession();
    if (!session) {
      if (debug) {
        console.info("[AuthDebug] /api/auth/me getSession returned null");
      }
      return jsonError("Unauthorized", 401);
    }
    if (debug) {
      console.info("[AuthDebug] /api/auth/me authenticated", {
        userId: session.user.id,
        email: session.user.email,
      });
    }
    return jsonSuccess(session.user);
  } catch (err) {
    if (process.env.AUTH_DEBUG === "1") {
      console.error("[AuthDebug] /api/auth/me exception", err);
    }
    return handleApiError(err);
  }
}
