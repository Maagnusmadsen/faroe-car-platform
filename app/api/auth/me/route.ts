/**
 * GET /api/auth/me – current app user (synced from Supabase).
 * Returns 200 + { data: { id, email, name, role } } or 401.
 *
 * Auth is resolved once by middleware (getUser + cookie refresh).
 * This handler reads the middleware-provided session — no second
 * Supabase client or getUser() call.
 */

import { getSession } from "@/auth/guards";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ data: session.user }, { status: 200 });
}
