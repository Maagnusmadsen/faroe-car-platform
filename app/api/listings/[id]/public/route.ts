/**
 * GET /api/listings/[id]/public – get a published (ACTIVE) listing for display.
 * No auth required. Returns Car-shaped object or 404.
 */

import { NextRequest } from "next/server";
import { getPublicListing } from "@/lib/listings-server";
import { jsonSuccess, jsonError } from "@/lib/utils/api-response";
import { notFound } from "@/lib/utils/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const car = await getPublicListing(id);
  if (!car) {
    return jsonError(notFound("Listing not found"));
  }
  return jsonSuccess(car);
}
