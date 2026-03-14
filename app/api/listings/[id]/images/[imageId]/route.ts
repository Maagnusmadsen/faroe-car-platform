/**
 * DELETE /api/listings/[id]/images/[imageId] – remove image from draft listing and storage.
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { deleteListingImage } from "@/lib/listing-images";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const session = await requireAuth();
    const { imageId } = await params;
    const deleted = await deleteListingImage(imageId, session.user.id);
    if (!deleted) {
      return Response.json(
        { error: "Image or listing not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json(
      { error: "Delete failed", code: "INTERNAL" },
      { status: 500 }
    );
  }
}
