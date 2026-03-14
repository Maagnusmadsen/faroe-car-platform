/**
 * PATCH /api/owner/listings/[id]/status – update listing status (ACTIVE/PAUSED) for owner.
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { prisma } from "@/db";
import { AppError, HttpStatus, notFound } from "@/lib/utils/errors";

const ALLOWED_STATUSES = new Set(["ACTIVE", "PAUSED"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = typeof body?.status === "string" ? body.status : "";
    if (!ALLOWED_STATUSES.has(status)) {
      throw new AppError(
        "Invalid status",
        HttpStatus.BAD_REQUEST,
        "INVALID_STATUS"
      );
    }

    const listing = await prisma.carListing.findFirst({
      where: { id, ownerId: session.user.id, deletedAt: null },
    });
    if (!listing) {
      return jsonError(notFound("Listing not found"));
    }
    if (listing.status === "DRAFT" || listing.status === "REJECTED") {
      return jsonError(
        "Only active or paused listings can change status here",
        400
      );
    }

    const updated = await prisma.carListing.update({
      where: { id },
      data: { status },
    });

    return jsonSuccess({ id: updated.id, status: updated.status });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}

