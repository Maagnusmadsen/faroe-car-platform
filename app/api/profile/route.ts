/**
 * GET /api/profile – return current user's profile (with completion).
 * PATCH /api/profile – update current user's profile (partial update).
 * DELETE /api/profile – delete current user's account (self-deletion).
 * All require authentication.
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/auth/guards";
import { getProfileByUserId, updateProfile } from "@/lib/profile";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { parseOrThrow } from "@/lib/utils/validate";
import { updateProfileSchema } from "@/validation";
import { notFound } from "@/lib/utils/errors";
import { prisma } from "@/db";

export async function GET() {
  try {
    const session = await requireAuth();
    const profile = await getProfileByUserId(session.user.id);
    if (!profile) {
      return jsonError(notFound("Profile not found"));
    }
    return jsonSuccess(profile);
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
    const body = await request.json();
    const input = parseOrThrow(updateProfileSchema, body);
    const profile = await updateProfile(session.user.id, input);
    return jsonSuccess(profile);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    if (e.statusCode === 404) {
      return jsonError(notFound("User not found"));
    }
    return handleApiError(err);
  }
}

export async function DELETE() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true, email: true, supabaseUserId: true },
    });

    if (!user) {
      return jsonError(notFound("User not found"));
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (user.supabaseUserId && supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { error } = await supabase.auth.admin.deleteUser(user.supabaseUserId);
      if (error) {
        return jsonError(`Failed to delete from auth: ${error.message}`, 400);
      }
    }

    const bookingCount = await prisma.booking.count({ where: { renterId: user.id } });
    if (bookingCount > 0) {
      return jsonError(
        `You have ${bookingCount} booking(s). Cancel or complete them first.`,
        400
      );
    }
    const payoutCount = await prisma.payout.count({ where: { userId: user.id } });
    if (payoutCount > 0) {
      return jsonError("You have pending payouts. Contact support.", 400);
    }

    await prisma.user.delete({ where: { id: user.id } });

    return jsonSuccess({ deleted: true });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}
