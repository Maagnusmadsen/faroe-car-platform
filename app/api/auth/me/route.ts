/**
 * GET /api/auth/me – current app user (synced from Supabase).
 * Returns 200 + { data: { id, email, name, role } } or 401.
 */

import { getSessionRouteHandler } from "@/auth/guards";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { session, applyCookies } = await getSessionRouteHandler();

  if (!session) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    applyCookies(response);
    return response;
  }

  const response = NextResponse.json({ data: session.user }, { status: 200 });
  applyCookies(response);
  return response;
}
