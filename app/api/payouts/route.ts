/**
 * GET /api/payouts – list payouts for current owner (for dashboards).
 * POST /api/payouts – (optional) create a new payout for current owner.
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { prisma } from "@/db";
import { createPayoutForOwner, previewPayoutForOwner } from "@/lib/payouts-server";

export async function GET() {
  try {
    const session = await requireAuth();
    const ownerId = session.user.id;

    const [payouts, preview] = await Promise.all([
      prisma.payout.findMany({
        where: { userId: ownerId },
        orderBy: { createdAt: "desc" },
      }),
      previewPayoutForOwner(ownerId),
    ]);

    const totalPaidOut = payouts
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const currency = payouts[0]?.currency ?? preview?.currency ?? "DKK";

    return jsonSuccess({
      payouts,
      pendingPayout: preview,
      totalPaidOut: { amount: totalPaidOut, currency },
    });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}

export async function POST(_request: NextRequest) {
  try {
    const session = await requireAuth();
    const ownerId = session.user.id;
    const payout = await createPayoutForOwner(ownerId);
    return jsonSuccess(payout);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}

