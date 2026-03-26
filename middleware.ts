/**
 * Middleware: refresh Supabase session and protect routes.
 * Fail-closed: any auth error on a protected route redirects to /login.
 */

import { updateSession } from "@/lib/supabase/middleware";
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

function redirectToLogin(request: NextRequest, pathname: string): NextResponse {
  const login = new URL("/login", request.url);
  login.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(login);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = isProtected(pathname);

  try {
    const { response, user } = await updateSession(request);
    if (isProtectedRoute && !user) return redirectToLogin(request, pathname);
    return response;
  } catch {
    if (isProtectedRoute) return redirectToLogin(request, pathname);
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
