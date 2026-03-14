/**
 * POST /api/listings/[id]/images – upload one image (multipart/form-data, field "file").
 * Validates type (jpeg, png, webp) and size (max 5MB). Returns { data: { id, url, sortOrder } }.
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { addListingImage } from "@/lib/listing-images";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: listingId } = await params;
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: "Missing or invalid file", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "image/jpeg";
    const result = await addListingImage(
      listingId,
      session.user.id,
      buffer,
      contentType
    );
    if (!result) {
      return Response.json(
        { error: "Listing not found or not a draft", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    return Response.json({ data: result }, { status: 201 });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e.statusCode === 400) {
      return Response.json({ error: e.message, code: "VALIDATION" }, { status: 400 });
    }
    return Response.json(
      { error: "Upload failed", code: "INTERNAL" },
      { status: 500 }
    );
  }
}
