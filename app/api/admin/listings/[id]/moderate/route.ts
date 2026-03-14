/**
 * PATCH /api/admin/listings/[id]/moderate – admin moderation of listing status.
 * Allows setting status to ACTIVE, PAUSED, or REJECTED.
 */

import { NextRequest } from "next/server";
import { requireAuth, requireAdmin } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { prisma } from "@/db";
import { AppError, HttpStatus, notFound } from "@/lib/utils/errors";
import { logAdminAction } from "@/lib/admin-audit";

const ALLOWED_STATUSES = new Set(["ACTIVE", "PAUSED", "REJECTED"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    requireAdmin(session);
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

    const listing = await prisma.carListing.findUnique({
      where: { id },
      select: { id: true, ownerId: true, status: true },
    });
    if (!listing) {
      return jsonError(notFound("Listing not found"));
    }

    const updated = await prisma.carListing.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, ownerId: true },
    });

    await logAdminAction({
      userId: session.user.id,
      action: "listing_moderated",
      entityType: "CarListing",
      entityId: updated.id,
      payload: {
        previousStatus: listing.status,
        newStatus: updated.status,
        ownerId: updated.ownerId,
      },
    });

    return jsonSuccess(updated);
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

