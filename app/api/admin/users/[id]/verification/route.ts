/**
 * PATCH /api/admin/users/[id]/verification – set a user's verification status (admin only).
 * Body: { verificationStatus: "VERIFIED" | "PENDING" | "UNVERIFIED" }
 * Used to approve renters (set VERIFIED).
 */

import { NextRequest } from "next/server";
import { requireAuth, requireAdmin } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { prisma } from "@/db";
import { notFound } from "@/lib/utils/errors";
import { dispatchNotificationEvent } from "@/lib/notifications";

const ALLOWED = new Set(["VERIFIED", "PENDING", "UNVERIFIED"]);

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    requireAdmin(session);
    const { id: userId } = await params;

    const body = await _request.json().catch(() => ({}));
    const status = body?.verificationStatus;
    if (typeof status !== "string" || !ALLOWED.has(status)) {
      return jsonError("Invalid verificationStatus. Use VERIFIED, PENDING, or UNVERIFIED.", 400);
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      return jsonError(notFound("User profile not found").message, 404);
    }

    await prisma.userProfile.update({
      where: { userId },
      data: { verificationStatus: status as "VERIFIED" | "PENDING" | "UNVERIFIED" },
    });

    if (status === "VERIFIED") {
      await dispatchNotificationEvent({
        type: "renter.approved",
        idempotencyKey: `renter-approved-${userId}`,
        payload: { userId },
        sourceId: userId,
        sourceType: "user",
      }).catch(() => {
        // ignore notification failure
      });
    }

    return jsonSuccess({ verificationStatus: status });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) return jsonError(e.message, 401);
    if (e.statusCode === 403) return jsonError(e.message, 403);
    return handleApiError(err);
  }
}
