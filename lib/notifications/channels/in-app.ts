/**
 * In-app notification channel.
 * Creates Notification records for the existing in-app UI.
 */

import { prisma } from "@/db";
import { Prisma, type NotificationType } from "@prisma/client";
import type { EventType, NotificationEventPayload } from "../types";

const EVENT_TO_LEGACY_TYPE: Record<EventType, NotificationType> = {
  "booking.requested": "BOOKING_REQUEST",
  "booking.approved": "BOOKING_REQUEST",
  "booking.rejected": "BOOKING_CANCELLED",
  "booking.confirmed": "BOOKING_CONFIRMED",
  "booking.cancelled": "BOOKING_CANCELLED",
  "booking.reminder": "SYSTEM",
  "trip.started": "SYSTEM",
  "trip.ended": "SYSTEM",
  "payment.received": "PAYMENT_RECEIVED",
  "payment.receipt": "BOOKING_CONFIRMED",
  "payout.sent": "PAYOUT_SENT",
  "payout.failed": "PAYOUT_SENT",
  "message.received": "MESSAGE",
  "message.digest": "MESSAGE", // digest delivery disabled; kept for EventType exhaustiveness
  "review.requested": "REVIEW_RECEIVED",
  "listing.published": "SYSTEM",
  "renter.approved": "SYSTEM",
  "user.welcome": "SYSTEM",
};

function buildInAppTitleAndBody(
  eventType: EventType,
  payload: NotificationEventPayload
): { title: string; body: string } {
  const carTitle = (payload.carTitle as string) ?? "your car";
  const amount = payload.amount != null ? `${payload.amount} ${payload.currency ?? "DKK"}` : "";

  switch (eventType) {
    case "booking.requested":
      return {
        title: "New booking request",
        body: `You have a new booking request for ${carTitle}.`,
      };
    case "booking.approved":
      return {
        title: "Booking approved",
        body: `Your booking for ${carTitle} has been approved. Complete payment to confirm.`,
      };
    case "booking.rejected":
      return {
        title: "Booking request declined",
        body: `Your booking request for ${carTitle} was declined.`,
      };
    case "booking.confirmed":
      return {
        title: "Booking confirmed",
        body: `Your booking for ${carTitle} has been confirmed.`,
      };
    case "booking.cancelled":
      return {
        title: "Booking cancelled",
        body: `A booking for ${carTitle} was cancelled.`,
      };
    case "booking.reminder":
      return {
        title: "Upcoming trip",
        body: `Your rental for ${carTitle} starts soon.`,
      };
    case "payment.received":
      return {
        title: "Payment received",
        body: `You received ${amount} for a booking.`,
      };
    case "payment.receipt":
      return {
        title: "Payment confirmed",
        body: `Your payment of ${amount} for ${carTitle} has been confirmed.`,
      };
    case "payout.sent":
      return {
        title: "Payout sent",
        body: `A payout of ${amount} has been sent to your account.`,
      };
    case "payout.failed":
      return {
        title: "Payout failed",
        body: `We were unable to process a payout of ${amount}. Please check your bank details.`,
      };
    case "message.received":
      return {
        title: "New message",
        body: "You have a new message about a booking.",
      };
    case "review.requested":
      return {
        title: "Leave a review",
        body: `How was your trip? Share your experience for ${carTitle}.`,
      };
    case "listing.published":
      return {
        title: "Listing published",
        body: "Your car listing is now live.",
      };
    case "renter.approved":
      return {
        title: "You're approved to rent",
        body: "Your driving licence has been verified. You can now book cars on RentLocal.",
      };
    case "user.welcome":
      return {
        title: "Welcome to RentLocal",
        body: "Your account has been created successfully.",
      };
    case "trip.started":
    case "trip.ended":
      return {
        title: eventType === "trip.started" ? "Trip started" : "Trip ended",
        body: `Your rental for ${carTitle} ${eventType === "trip.started" ? "has started" : "has ended"}.`,
      };
    default:
      return { title: "Notification", body: "" };
  }
}

export interface CreateInAppNotificationInput {
  userId: string;
  eventType: EventType;
  payload: NotificationEventPayload;
  eventId?: string;
  deliveryId?: string;
}

/**
 * Creates an in-app notification. Idempotent when deliveryId is provided:
 * uses upsert so concurrent workers create at most one Notification per delivery.
 */
export async function createInAppNotification(
  input: CreateInAppNotificationInput
): Promise<string> {
  const { title, body } = buildInAppTitleAndBody(input.eventType, input.payload);
  const legacyType = EVENT_TO_LEGACY_TYPE[input.eventType] ?? "SYSTEM";
  const data = {
    userId: input.userId,
    type: legacyType,
    title,
    body,
    data: input.payload as Prisma.InputJsonValue,
    eventId: input.eventId,
    deliveryId: input.deliveryId,
  };

  if (input.deliveryId) {
    const notification = await prisma.notification.upsert({
      where: { deliveryId: input.deliveryId },
      create: data,
      update: {}, // idempotent: if exists, return it without changes
    });
    return notification.id;
  }

  try {
    const notification = await prisma.notification.create({ data });
    return notification.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.notification.findFirst({
        where: { userId: input.userId, eventId: input.eventId },
        select: { id: true },
      });
      return existing?.id ?? "duplicate";
    }
    throw err;
  }
}
