/**
 * Supabase Auth verify: handles email confirmation via token_hash.
 * Use this URL in the "Confirm signup" email template to avoid PKCE issues on mobile.
 *
 * Email template should use: {{ .SiteURL }}/auth/verify?token_hash={{ .TokenHash }}&type=signup
 * instead of {{ .ConfirmationURL }}
 *
 * This works when the link is opened in any browser (including email in-app browsers)
 * because verification is done server-side with the token_hash - no code_verifier needed.
 */

import { createRouteHandlerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Path-only redirect target; blocks open redirects. */
function safeNextPath(next: string): string {
  const path = next.trim() || "/";
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

/** Redirect after verify; append ?welcome=1 only for signup confirmation (not magic-link login). */
function postVerifyRedirectUrl(origin: string, next: string, showWelcome: boolean): string {
  const path = safeNextPath(next);
  const url = new URL(path, origin);
  if (showWelcome) {
    url.searchParams.set("welcome", "1");
  }
  return url.toString();
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  // type=signup for "Confirm signup" template; type=email for magic link
  const validType = type === "signup" || type === "email";
  if (token_hash && validType) {
    const { supabase, applyCookies } = await createRouteHandlerClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: (type as "signup" | "email") ?? "signup",
    });
    if (!error) {
      const target = postVerifyRedirectUrl(origin, next, type === "signup");
      const response = NextResponse.redirect(target);
      applyCookies(response);
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
