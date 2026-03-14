/**
 * GET /api/profile – return current user's profile (with completion).
 * PATCH /api/profile – update current user's profile (partial update).
 * Both require authentication.
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { getProfileByUserId, updateProfile } from "@/lib/profile";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { parseOrThrow } from "@/lib/utils/validate";
import { updateProfileSchema } from "@/validation";
import { notFound } from "@/lib/utils/errors";

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
