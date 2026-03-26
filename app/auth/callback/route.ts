/**
 * Supabase Auth callback: handles magic link and OAuth redirects.
 * Supabase redirects here after email confirmation or OAuth sign-in.
 */

import { createRouteHandlerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Path-only redirect target; blocks open redirects. */
function safeNextPath(next: string): string {
  const path = next.trim() || "/";
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const { supabase, applyCookies } = await createRouteHandlerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${safeNextPath(next)}`);
      applyCookies(response);
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
