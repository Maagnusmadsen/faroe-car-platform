/**
 * POST /api/listings/claim-ownership – move a listing to the current user (same person, different account).
 * Body: { listingId: string }.
 * Allowed only if listing owner's email or name matches current user's (case-insensitive).
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonSuccess, handleApiError } from "@/lib/utils/api-response";
import { AppError, HttpStatus } from "@/lib/utils/errors";
import { prisma } from "@/db";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const listingId = typeof body?.listingId === "string" ? body.listingId.trim() : "";
    if (!listingId) {
      throw new AppError("listingId is required", HttpStatus.BAD_REQUEST, "INVALID_REQUEST");
    }

    const listing = await prisma.carListing.findFirst({
      where: { id: listingId, deletedAt: null },
      include: { owner: { select: { id: true, email: true, name: true } } },
    });
    if (!listing) {
      throw new AppError("Listing not found", HttpStatus.NOT_FOUND, "LISTING_NOT_FOUND");
    }

    const currentId = session.user.id;
    if (listing.ownerId === currentId) {
      return jsonSuccess({ ok: true, message: "Already yours" });
    }

    const currentEmail = session.user.email?.trim().toLowerCase();
    const currentName = session.user.name?.trim();
    const ownerEmail = listing.owner.email?.trim().toLowerCase();
    const ownerName = listing.owner.name?.trim();

    const emailMatch = currentEmail && ownerEmail && currentEmail === ownerEmail;
    const nameMatch =
      currentName &&
      ownerName &&
      currentName.length >= 2 &&
      currentName.toLowerCase() === ownerName.toLowerCase();

    if (!emailMatch && !nameMatch) {
      throw new AppError(
        "You can only claim listings owned by an account with the same email or name",
        HttpStatus.FORBIDDEN,
        "CLAIM_NOT_ALLOWED"
      );
    }

    await prisma.carListing.update({
      where: { id: listingId },
      data: { ownerId: currentId },
    });

    return jsonSuccess({ ok: true });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return Response.json({ error: e.message }, { status: 401 });
    }
    return handleApiError(err);
  }
}
