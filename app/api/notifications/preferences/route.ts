/**
 * Notification preferences API.
 *
 * GET /api/notifications/preferences – list user's preferences
 * PATCH /api/notifications/preferences – update preferences
 *
 * Only optional preferences are exposed. Critical notifications
 * (booking confirmations, payments, payouts, etc.) cannot be disabled.
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { prisma } from "@/db";

/** Optional (eventType, channel) pairs. Must match events with userCanDisable. */
const OPTIONAL_PREFERENCES: Array<{ eventType: string; channel: "EMAIL" | "IN_APP" }> = [
  { eventType: "booking.requested", channel: "EMAIL" },
  { eventType: "booking.requested", channel: "IN_APP" },
  { eventType: "booking.reminder", channel: "EMAIL" },
  { eventType: "booking.reminder", channel: "IN_APP" },
  { eventType: "message.received", channel: "EMAIL" },
  { eventType: "message.received", channel: "IN_APP" },
  { eventType: "review.requested", channel: "EMAIL" },
  { eventType: "review.requested", channel: "IN_APP" },
  { eventType: "listing.published", channel: "IN_APP" },
  { eventType: "trip.started", channel: "IN_APP" },
  { eventType: "trip.ended", channel: "IN_APP" },
];

const OPTIONAL_EVENT_TYPES = [...new Set(OPTIONAL_PREFERENCES.map((p) => p.eventType))];

export async function GET() {
  try {
    const session = await requireAuth();
    const prefs = await prisma.notificationPreference.findMany({
      where: { userId: session.user.id },
    });
    const byKey = Object.fromEntries(
      prefs.map((p) => [`${p.eventType}:${p.channel}`, p.enabled])
    );
    const preferences = OPTIONAL_PREFERENCES.map(({ eventType, channel }) => ({
      eventType,
      channel,
      enabled: byKey[`${eventType}:${channel}`] ?? true,
    }));
    return jsonSuccess({ preferences });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) return jsonError(e.message, 401);
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const updates = Array.isArray(body?.preferences) ? body.preferences : [];
    for (const u of updates) {
      const eventType = u?.eventType;
      const channel = u?.channel;
      const enabled = u?.enabled;
      if (
        typeof eventType !== "string" ||
        (channel !== "EMAIL" && channel !== "IN_APP") ||
        typeof enabled !== "boolean"
      )
        continue;
      if (!OPTIONAL_EVENT_TYPES.includes(eventType)) continue;
      const validChannel = OPTIONAL_PREFERENCES.some(
        (p) => p.eventType === eventType && p.channel === channel
      );
      if (!validChannel) continue;
      await prisma.notificationPreference.upsert({
        where: {
          userId_eventType_channel: {
            userId: session.user.id,
            eventType,
            channel,
          },
        },
        create: {
          userId: session.user.id,
          eventType,
          channel,
          enabled,
        },
        update: { enabled },
      });
    }
    return jsonSuccess({ updated: updates.length });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) return jsonError(e.message, 401);
    return handleApiError(err);
  }
}
