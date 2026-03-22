/**
 * Supabase Auth verify: handles email confirmation via token_hash.
 * Use this URL in the "Confirm signup" email template to avoid PKCE issues on mobile.
 *
 * Email template should use: {{ .SiteURL }}/auth/verify?token_hash={{ .TokenHash }}&type=email
 * instead of {{ .ConfirmationURL }}
 *
 * This works when the link is opened in any browser (including email in-app browsers)
 * because verification is done server-side with the token_hash - no code_verifier needed.
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type === "email") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: "email",
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
