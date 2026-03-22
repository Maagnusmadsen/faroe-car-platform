/**
 * DELETE /api/admin/users/[id] – delete a user (admin only).
 * Admins can delete USERs. Only super admin (SUPER_ADMIN_EMAIL) can delete other admins.
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, requireAdmin } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { prisma } from "@/db";
import { AppError, HttpStatus } from "@/lib/utils/errors";
import { logAdminAction } from "@/lib/admin-audit";
import { env } from "@/config/env";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    requireAdmin(session);
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, email: true, role: true, supabaseUserId: true },
    });

    if (!user) {
      return jsonError("User not found", 404);
    }

    const isSuperAdmin =
      session.user.email?.toLowerCase() === env.superAdminEmail().toLowerCase();
    if (user.role === "ADMIN" && !isSuperAdmin) {
      return jsonError("Only the super admin can delete other admins", 403);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (user.supabaseUserId && supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { error } = await supabase.auth.admin.deleteUser(user.supabaseUserId);
      // "User not found" = already gone from Auth (orphaned Prisma record) – proceed with DB delete
      if (error && !/user.?not.?found|not_found/i.test(error.message)) {
        return jsonError(`Failed to delete from auth: ${error.message}`, 400);
      }
    }

    const bookingCount = await prisma.booking.count({ where: { renterId: user.id } });
    if (bookingCount > 0) {
      return jsonError(
        `User has ${bookingCount} booking(s). Remove bookings first.`,
        HttpStatus.BAD_REQUEST
      );
    }
    const payoutCount = await prisma.payout.count({ where: { userId: user.id } });
    if (payoutCount > 0) {
      return jsonError(
        `User has ${payoutCount} payout(s). Cannot delete.`,
        HttpStatus.BAD_REQUEST
      );
    }

    await prisma.user.delete({ where: { id: user.id } });

    await logAdminAction({
      userId: session.user.id,
      action: "user_deleted",
      entityType: "User",
      entityId: user.id,
      payload: { email: user.email },
    });

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
