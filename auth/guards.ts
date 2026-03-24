/**
 * Auth guards for API routes and server components.
 * Uses Supabase Auth: getSession() returns app user synced from Supabase user.
 * requireAuth/requireRole throw on failure.
 * Owner/renter checks are resource-level (e.g. resource.ownerId === session.user.id), not role-based.
 */

import { createClient, createRouteHandlerClient } from "@/lib/supabase/server";
import { syncSupabaseUserToPrisma } from "@/lib/supabase/sync-user";
import type { SessionUser } from "@/types";
import type { NextResponse } from "next/server";

export interface AuthSession {
  user: SessionUser;
  expires?: string;
}

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Resolve app session from a Supabase server client (shared by getSession and route handlers).
 */
export async function resolveSessionFromSupabase(
  supabase: ServerSupabaseClient
): Promise<AuthSession | null> {
  try {
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
 * Get current session. Returns null if not authenticated.
 * Uses Supabase Auth: getUser() then syncs to Prisma User.
 */
export async function getSession(): Promise<AuthSession | null> {
  try {
    const supabase = await createClient();
    return await resolveSessionFromSupabase(supabase);
  } catch {
    return null;
  }
}

/**
 * Session for Route Handlers: uses the same Supabase client as /api/auth/me so refreshed
 * auth cookies are applied to the response (avoids 401 after token refresh).
 */
export async function getSessionRouteHandler(): Promise<{
  session: AuthSession | null;
  applyCookies: (response: NextResponse) => void;
}> {
  const { supabase, applyCookies } = await createRouteHandlerClient();
  const session = await resolveSessionFromSupabase(supabase);
  return { session, applyCookies };
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
