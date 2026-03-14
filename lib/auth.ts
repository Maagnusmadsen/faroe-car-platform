/**
 * Current-user helper for app-wide use.
 * Server: use getCurrentUser() or getSession() from @/auth/guards.
 * Client: use useAuth() hook or Supabase client for sign out.
 */

import { getSession } from "@/auth/guards";
import type { SessionUser } from "@/types";

/**
 * Server-only. Returns the current session user or null.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session?.user ?? null;
}
