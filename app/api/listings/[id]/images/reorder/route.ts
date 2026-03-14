/**
 * PATCH /api/listings/[id]/images/reorder – set image order. Body: { imageIds: string[] }. First = cover.
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { reorderListingImages } from "@/lib/listing-images";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: listingId } = await params;
    const body = await request.json().catch(() => ({}));
    const imageIds = Array.isArray(body.imageIds)
      ? body.imageIds.filter((x: unknown) => typeof x === "string")
      : [];
    const ok = await reorderListingImages(listingId, session.user.id, imageIds);
    if (!ok) {
      return Response.json(
        { error: "Listing not found or not a draft", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    return Response.json({ data: { ok: true } }, { status: 200 });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json(
      { error: "Reorder failed", code: "INTERNAL" },
      { status: 500 }
    );
  }
}
