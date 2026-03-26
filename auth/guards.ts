/**
 * Auth guards for API routes and server components.
 *
 * Auth resolution happens ONCE per request, in middleware (updateSession).
 * The validated Supabase user is serialized into a request header. Guards
 * here read that header, sync the user to Prisma, and return the app session.
 * No second getUser() call is ever made — this avoids the double refresh-token
 * consumption that caused intermittent logouts.
 */

import { SUPABASE_USER_HEADER } from "@/lib/supabase/middleware";
import { syncSupabaseUserToPrisma } from "@/lib/supabase/sync-user";
import type { SessionUser } from "@/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { headers } from "next/headers";

export interface AuthSession {
  user: SessionUser;
  expires?: string;
}

/**
 * Get current session from the middleware-provided header.
 * Returns null if not authenticated (header absent or invalid).
 */
export async function getSession(): Promise<AuthSession | null> {
  try {
    const headerStore = await headers();
    const raw = headerStore.get(SUPABASE_USER_HEADER);
    if (!raw) return null;

    const supabaseUser: SupabaseUser = JSON.parse(raw);

    const appUser = await syncSupabaseUserToPrisma(supabaseUser);
    if (!appUser) return null;

    return {
      user: {
        id: appUser.id,
        email: appUser.email,
        name: appUser.name,
        role: appUser.role,
      },
    };
  } catch (err) {
    console.error("[Auth] getSession failed — returning null session", {
      error: (err as Error).message,
    });
    return null;
  }
}

/**
 * Require authenticated user. Throws 401 if no session.
 * Use in API route handlers: const session = await requireAuth();
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    const error = new Error("Unauthorized") as Error & { statusCode?: number };
    error.statusCode = 401;
    throw error;
  }
  return session;
}

/**
 * Require specific role. Call after requireAuth().
 * Allowed roles match Prisma UserRole: "USER" | "ADMIN".
 */
export function requireRole(
  session: AuthSession,
  allowedRoles: NonNullable<SessionUser["role"]>[]
): void {
  const role = session.user.role;
  if (!role || !allowedRoles.includes(role)) {
    const error = new Error("Forbidden") as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }
}

/**
 * Require admin role. Throws 403 if session.user.role !== "ADMIN".
 */
export function requireAdmin(session: AuthSession): void {
  requireRole(session, ["ADMIN"]);
}
