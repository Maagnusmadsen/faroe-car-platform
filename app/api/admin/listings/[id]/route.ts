/**
 * DELETE /api/admin/listings/[id] – delete a listing (admin only).
 * Soft-deletes the listing.
 */

import { NextRequest } from "next/server";
import { requireAuth, requireAdmin } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { deleteListingAsAdmin } from "@/lib/listings-server";
import { notFound } from "@/lib/utils/errors";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    requireAdmin(session);
    const { id } = await params;

    const deleted = await deleteListingAsAdmin(id);
    if (!deleted) {
      return jsonError(notFound("Listing not found"));
    }
    return jsonSuccess({ deleted: true });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    if (e.statusCode === 403) {
      return jsonError(e.message, 403);
    }
    return handleApiError(err);
  }
}
