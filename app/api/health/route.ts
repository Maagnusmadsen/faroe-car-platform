/**
 * Health check endpoint for API and deployment probes.
 * Returns 200 with minimal payload. No auth required.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "faroe-rent-api",
    },
    { status: 200 }
  );
}
