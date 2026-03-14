import { prisma } from "@/db";
import type { NotificationType } from "@prisma/client";

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
}

export async function createNotification(input: NotificationPayload) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      data: input.data ?? null,
    },
  });
}

/**
 * Event helpers – thin wrappers for common platform events.
 * These can later fan out to email/SMS/push channels as needed.
 */

export async function notifyUserSignup(userId: string) {
  await createNotification({
    userId,
    type: "SYSTEM",
    title: "Welcome to FaroeRent",
    body: "Your account has been created successfully.",
  });
}

export async function notifyListingPublished(ownerId: string, listingId: string) {
  await createNotification({
    userId: ownerId,
    type: "SYSTEM",
    title: "Listing published",
    body: "Your car listing is now live.",
    data: { listingId },
  });
}

export async function notifyBookingCreated(ownerId: string, bookingId: string, carId: string) {
  await createNotification({
    userId: ownerId,
    type: "BOOKING_REQUEST",
    title: "New booking request",
    body: "You have a new booking request for your car.",
    data: { bookingId, carId },
  });
}

export async function notifyBookingConfirmed(
  renterId: string,
  bookingId: string,
  carId: string
) {
  await createNotification({
    userId: renterId,
    type: "BOOKING_CONFIRMED",
    title: "Booking confirmed",
    body: "Your booking has been confirmed.",
    data: { bookingId, carId },
  });
}

export async function notifyBookingCancelled(
  userId: string,
  bookingId: string,
  carId: string
) {
  await createNotification({
    userId,
    type: "BOOKING_CANCELLED",
    title: "Booking cancelled",
    body: "A booking was cancelled.",
    data: { bookingId, carId },
  });
}

export async function notifyPaymentReceived(ownerId: string, bookingId: string, amount: number) {
  await createNotification({
    userId: ownerId,
    type: "PAYMENT_RECEIVED",
    title: "Payment received",
    body: `A payment was received for one of your bookings.`,
    data: { bookingId, amount },
  });
}

export async function notifyNewMessage(userId: string, conversationId: string, bookingId: string) {
  await createNotification({
    userId,
    type: "MESSAGE",
    title: "New message",
    body: "You have a new message about a booking.",
    data: { conversationId, bookingId },
  });
}

export async function notifyReviewReminder(userId: string, bookingId: string, carId: string) {
  await createNotification({
    userId,
    type: "SYSTEM",
    title: "Please review your trip",
    body: "Your trip is completed. Please leave a review.",
    data: { bookingId, carId, kind: "review_reminder" },
  });
}

export async function notifyPayoutCreated(ownerId: string, payoutId: string, amount: number) {
  await createNotification({
    userId: ownerId,
    type: "PAYOUT_SENT",
    title: "Payout created",
    body: "A payout has been created for your earnings.",
    data: { payoutId, amount },
  });
}

