/**
 * GET /api/auth/me – current app user (synced from Supabase).
 * Returns 200 + { data: { id, email, name, role } } or 401.
 */

import { jsonError, jsonSuccess } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-response";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { syncSupabaseUserToPrisma } from "@/lib/supabase/sync-user";

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

    // Important: use route-handler client to read request cookies in API context.
    const { supabase } = await createRouteHandlerClient();
    const {
      data: { user: supabaseUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (debug) {
      console.info("[AuthDebug] /api/auth/me supabase.auth.getUser()", {
        hasUser: !!supabaseUser,
        userId: supabaseUser?.id ?? null,
        authError: authError?.message ?? null,
      });
    }

    if (authError || !supabaseUser) {
      if (debug) {
        console.info("[AuthDebug] /api/auth/me unauthorized from Supabase auth read");
      }
      return jsonError("Unauthorized", 401);
    }

    const appUser = await syncSupabaseUserToPrisma(supabaseUser);
    if (!appUser) {
      if (debug) {
        console.error("[AuthDebug] /api/auth/me failed to map supabase user to app user", {
          supabaseUserId: supabaseUser.id,
          email: supabaseUser.email ?? null,
        });
      }
      return jsonError("Authenticated user has no valid app profile", 500);
    }

    if (debug) {
      console.info("[AuthDebug] /api/auth/me authenticated", {
        userId: appUser.id,
        email: appUser.email,
      });
    }
    return jsonSuccess({
      id: appUser.id,
      email: appUser.email,
      name: appUser.name,
      role: appUser.role,
    });
  } catch (err) {
    if (process.env.AUTH_DEBUG === "1") {
      console.error("[AuthDebug] /api/auth/me exception", err);
    }
    return handleApiError(err);
  }
}
