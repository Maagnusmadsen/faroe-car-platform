/**
 * Supabase server client for Server Components, Route Handlers, and Server Actions.
 * Creates a new client per request using request cookies.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignore: Server Component; cookie set may fail (e.g. in middleware proxy)
        }
      },
    },
  });
}

/**
 * Supabase route-handler client with explicit cookie propagation support.
 * Use this in auth callback/verify routes that return redirects.
 */
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();
  const pendingCookies: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        pendingCookies.push(...cookiesToSet);
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignore: route may not allow direct cookieStore mutation in all runtimes.
        }
      },
    },
  });

  const applyCookies = (response: NextResponse) => {
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
  };

  return { supabase, applyCookies };
}
