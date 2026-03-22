/**
 * Notification system types.
 */

import type { NotificationChannel, DeliveryStatus } from "@prisma/client";

export type EventType =
  | "booking.requested"
  | "booking.approved"
  | "booking.rejected"
  | "booking.confirmed"
  | "booking.cancelled"
  | "booking.reminder"
  | "trip.started"
  | "trip.ended"
  | "payment.received"
  | "payment.receipt"
  | "payout.sent"
  | "payout.failed"
  | "message.received"
  | "message.digest" // internal: batched digest for throttled messages
  | "review.requested"
  | "listing.published"
  | "renter.approved"
  | "user.welcome";

export interface NotificationEventPayload {
  bookingId?: string;
  carId?: string;
  renterId?: string;
  ownerId?: string;
  recipientId?: string;
  conversationId?: string;
  messageId?: string;
  payoutId?: string;
  listingId?: string;
  userId?: string;
  amount?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  carTitle?: string;
  senderName?: string;
  messagePreview?: string;
  [key: string]: unknown;
}

export interface DispatchNotificationEventInput {
  type: EventType;
  idempotencyKey: string;
  payload: NotificationEventPayload;
  sourceId?: string;
  sourceType?: string;
}

export interface Recipient {
  userId: string;
  email?: string;
}

export interface EventConfig {
  channels: NotificationChannel[];
  critical: boolean;
  userCanDisable: boolean;
}

export type { NotificationChannel, DeliveryStatus };
