/**
 * Auth guards for API routes and server components.
 * Uses Supabase Auth: getSession() returns app user synced from Supabase user.
 * requireAuth/requireRole throw on failure.
 * Owner/renter checks are resource-level (e.g. resource.ownerId === session.user.id), not role-based.
 */

import { createClient } from "@/lib/supabase/server";
import { syncSupabaseUserToPrisma } from "@/lib/supabase/sync-user";
import type { SessionUser } from "@/types";

export interface AuthSession {
  user: SessionUser;
  expires?: string;
}

/**
 * Get current session. Returns null if not authenticated.
 * Uses Supabase Auth: getUser() then syncs to Prisma User.
 */
export async function getSession(): Promise<AuthSession | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser();
    if (error || !supabaseUser) return null;

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
  } catch {
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
