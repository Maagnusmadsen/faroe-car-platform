/**
 * In-app notifications API.
 *
 * GET /api/notifications – list notifications for current user
 * PATCH /api/notifications – mark notifications as read
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { prisma } from "@/db";

export async function GET() {
  try {
    const session = await requireAuth();
    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return jsonSuccess(notifications, {
      headers: {
        "Cache-Control": "private, max-age=15",
      },
    });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    if (!ids.length) {
      return jsonSuccess({ updated: 0 });
    }
    const result = await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        id: { in: ids as string[] },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return jsonSuccess({ updated: result.count });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}

