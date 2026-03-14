/**
 * PATCH /api/admin/users/[id]/role – change user role (USER/ADMIN).
 */

import { NextRequest } from "next/server";
import { requireAuth, requireAdmin } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { prisma } from "@/db";
import { AppError, HttpStatus } from "@/lib/utils/errors";
import { logAdminAction } from "@/lib/admin-audit";

const ALLOWED_ROLES = new Set(["USER", "ADMIN"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    requireAdmin(session);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const role = typeof body?.role === "string" ? body.role : "";
    if (!ALLOWED_ROLES.has(role)) {
      throw new AppError(
        "Invalid role",
        HttpStatus.BAD_REQUEST,
        "INVALID_ROLE"
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: role as "USER" | "ADMIN" },
      select: { id: true, email: true, role: true },
    });

    await logAdminAction({
      userId: session.user.id,
      action: "user_role_updated",
      entityType: "User",
      entityId: updated.id,
      payload: { newRole: updated.role },
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

