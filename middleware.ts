/**
 * Middleware: refresh Supabase session and protect /list-your-car, /profile.
 */

import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/list-your-car",
  "/profile",
  "/bookings",
  "/messages",
  "/owner",
  "/admin",
  "/renter-approval",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  try {
    const response = await updateSession(request);

    const pathname = request.nextUrl.pathname;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key && isProtected(pathname)) {
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
      if (!user) {
        const login = new URL("/login", request.url);
        login.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(login);
      }
    }

    return response;
  } catch (_err) {
    return NextResponse.next({ request: { headers: request.headers } });
  }
}

export const config = {
  matcher: [
    "/list-your-car/:path*",
    "/profile/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
