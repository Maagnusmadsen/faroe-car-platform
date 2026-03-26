/**
 * Supabase client for middleware. Refreshes session and writes cookies to the response.
 * The authenticated Supabase user is serialized into a request header so that
 * downstream Route Handlers and Server Components can read it without making a
 * second getUser() call (which would read stale cookies and trigger a duplicate
 * refresh-token round-trip).
 */

import { createServerClient } from "@supabase/ssr";
import { type User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export const SUPABASE_USER_HEADER = "x-supabase-user";

export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(SUPABASE_USER_HEADER);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return { response, user: null };
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      response.headers.set(SUPABASE_USER_HEADER, JSON.stringify(user));
    }

    return { response, user };
  } catch {
    return { response, user: null };
  }
}
