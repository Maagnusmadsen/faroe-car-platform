/**
 * GET /api/auth/me – current app user (synced from Supabase).
 * Returns 200 + { data: { id, email, name, role } } or 401.
 */

import { createRouteHandlerClient } from "@/lib/supabase/server";
import { syncSupabaseUserToPrisma } from "@/lib/supabase/sync-user";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { supabase, applyCookies } = await createRouteHandlerClient();
  try {
    const {
      data: { user: supabaseUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !supabaseUser) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      applyCookies(response);
      return response;
    }

    const appUser = await syncSupabaseUserToPrisma(supabaseUser);
    if (!appUser) {
      const response = NextResponse.json(
        { error: "Authenticated user has no valid app profile" },
        { status: 500 }
      );
      applyCookies(response);
      return response;
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
    const message = err instanceof Error ? err.message : "Internal Server Error";
    const response = NextResponse.json({ error: message }, { status: 500 });
    applyCookies(response);
    return response;
  }
}
