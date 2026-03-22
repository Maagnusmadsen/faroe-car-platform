/**
 * POST /api/admin/users/[id]/resend-welcome – resend welcome email (admin only).
 * For testing: triggers user.welcome without needing to delete/re-signup.
 */

import { NextRequest } from "next/server";
import { requireAuth, requireAdmin } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { prisma } from "@/db";
import { dispatchNotificationEvent } from "@/lib/notifications";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    requireAdmin(session);
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, email: true },
    });

    if (!user) {
      return jsonError("User not found", 404);
    }

    await dispatchNotificationEvent({
      type: "user.welcome",
      idempotencyKey: `user-welcome-manual-${user.id}-${Date.now()}`,
      payload: { userId: user.id },
      sourceId: user.id,
      sourceType: "user",
    });

    return jsonSuccess({ sent: true, email: user.email });
  } catch (err) {
    return handleApiError(err);
  }
}
