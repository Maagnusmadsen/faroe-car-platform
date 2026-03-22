/**
 * Event type definitions: recipients, channels, criticality.
 */

import type { EventType, Recipient, EventConfig, NotificationEventPayload } from "./types";
import type { NotificationChannel } from "@prisma/client";
import { prisma } from "@/db";

const EVENT_CONFIG: Record<
  EventType,
  { channels: NotificationChannel[]; critical: boolean; userCanDisable: boolean }
> = {
  "booking.requested": { channels: ["IN_APP", "EMAIL"], critical: false, userCanDisable: true },
  "booking.approved": { channels: ["IN_APP", "EMAIL"], critical: true, userCanDisable: false },
  "booking.rejected": { channels: ["IN_APP", "EMAIL"], critical: true, userCanDisable: false },
  "booking.confirmed": { channels: ["IN_APP", "EMAIL"], critical: true, userCanDisable: false },
  "booking.cancelled": { channels: ["IN_APP", "EMAIL"], critical: true, userCanDisable: false },
  "booking.reminder": { channels: ["IN_APP", "EMAIL"], critical: false, userCanDisable: true },
  "trip.started": { channels: ["IN_APP"], critical: false, userCanDisable: true },
  "trip.ended": { channels: ["IN_APP"], critical: false, userCanDisable: true },
  "payment.received": { channels: ["IN_APP", "EMAIL"], critical: true, userCanDisable: false },
  "payment.receipt": { channels: ["IN_APP", "EMAIL"], critical: true, userCanDisable: false },
  "payout.sent": { channels: ["IN_APP", "EMAIL"], critical: true, userCanDisable: false },
  "payout.failed": { channels: ["IN_APP", "EMAIL"], critical: true, userCanDisable: false },
  "message.received": { channels: ["IN_APP", "EMAIL"], critical: false, userCanDisable: true },
  "message.digest": { channels: ["EMAIL"], critical: false, userCanDisable: false },
  "review.requested": { channels: ["IN_APP", "EMAIL"], critical: false, userCanDisable: true },
  "listing.published": { channels: ["IN_APP"], critical: false, userCanDisable: true },
  "renter.approved": { channels: ["IN_APP", "EMAIL"], critical: true, userCanDisable: false },
  "user.welcome": { channels: ["IN_APP", "EMAIL"], critical: false, userCanDisable: false },
};

export function getEventConfig(type: EventType): EventConfig {
  const cfg = EVENT_CONFIG[type];
  if (!cfg) throw new Error(`Unknown event type: ${type}`);
  return cfg;
}

function collectRecipientIds(type: EventType, payload: NotificationEventPayload): string[] {
  const ids = new Set<string>();

  switch (type) {
    case "booking.requested":
    case "payment.received":
    case "payout.sent":
    case "payout.failed":
      if (payload.ownerId) ids.add(payload.ownerId);
      break;
    case "booking.approved":
    case "booking.rejected":
    case "payment.receipt":
      if (payload.renterId) ids.add(payload.renterId);
      break;
    case "booking.confirmed":
      if (payload.renterId) ids.add(payload.renterId);
      break;
    case "booking.cancelled":
    case "booking.reminder":
    case "review.requested":
    case "trip.started":
    case "trip.ended":
      if (payload.renterId) ids.add(payload.renterId);
      if (payload.ownerId) ids.add(payload.ownerId);
      break;
    case "message.received":
      if (payload.recipientId) ids.add(payload.recipientId as string);
      break;
    case "message.digest":
      if (payload.userId) ids.add(payload.userId as string);
      break;
    case "listing.published":
      if (payload.ownerId) ids.add(payload.ownerId);
      if (payload.userId) ids.add(payload.userId as string);
      break;
    case "renter.approved":
    case "user.welcome":
      if (payload.userId) ids.add(payload.userId as string);
      break;
    default:
      break;
  }

  return Array.from(ids);
}

/**
 * Resolve recipients from event type and payload.
 */
export async function resolveRecipients(
  type: EventType,
  payload: NotificationEventPayload
): Promise<Recipient[]> {
  const ids = collectRecipientIds(type, payload);
  if (ids.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: { id: true, email: true },
  });

  return users.map((u) => ({
    userId: u.id,
    email: u.email ?? undefined,
  }));
}
