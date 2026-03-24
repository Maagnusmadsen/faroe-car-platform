/**
 * GET /api/auth/me – current app user (synced from Supabase).
 * Returns 200 + { data: { id, email, name, role } } or 401.
 */

import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { syncSupabaseUserToPrisma } from "@/lib/supabase/sync-user";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { supabase, applyCookies } = await createRouteHandlerClient();
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
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      applyCookies(response);
      return response;
    }

    const appUser = await syncSupabaseUserToPrisma(supabaseUser);
    if (!appUser) {
      if (debug) {
        console.error("[AuthDebug] /api/auth/me failed to map supabase user to app user", {
          supabaseUserId: supabaseUser.id,
          email: supabaseUser.email ?? null,
        });
      }
      const response = NextResponse.json(
        { error: "Authenticated user has no valid app profile" },
        { status: 500 }
      );
      applyCookies(response);
      return response;
    }

    if (debug) {
      console.info("[AuthDebug] /api/auth/me authenticated", {
        userId: appUser.id,
        email: appUser.email,
      });
    }
    const response = NextResponse.json(
      {
        data: {
          id: appUser.id,
          email: appUser.email,
          name: appUser.name,
          role: appUser.role,
        },
      },
      { status: 200 }
    );
    applyCookies(response);
    return response;
  } catch (err) {
    if (process.env.AUTH_DEBUG === "1") {
      console.error("[AuthDebug] /api/auth/me exception", err);
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    const response = NextResponse.json({ error: message }, { status: 500 });
    applyCookies(response);
    return response;
  }
}
