/**
 * Notification preference checks.
 * Critical events bypass preferences; optional events respect user settings.
 */

import { prisma } from "@/db";
import type { EventType } from "./types";
import type { NotificationChannel } from "@prisma/client";
import { getEventConfig } from "./events";

export async function isChannelEnabledForUser(
  userId: string,
  eventType: EventType,
  channel: NotificationChannel
): Promise<boolean> {
  const config = getEventConfig(eventType);
  if (config.critical || !config.userCanDisable) return true;

  const pref = await prisma.notificationPreference.findUnique({
    where: {
      userId_eventType_channel: { userId, eventType, channel },
    },
  });

  if (!pref) return true;
  return pref.enabled;
}
