/**
 * Server-side messaging helpers.
 *
 * Conversations are always tied to a Booking (one conversation per booking).
 * Participants are:
 * - the renter (booking.renterId)
 * - the owner  (booking.car.ownerId)
 *
 * This module provides:
 * - conversation creation/lookup for a booking
 * - sending messages with access control
 * - listing conversations and messages with basic unread logic
 */

import { prisma } from "@/db";
import { AppError, HttpStatus } from "@/lib/utils/errors";
import { dispatchNotificationEvent } from "@/lib/notifications";

export async function ensureConversationForBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { car: { select: { ownerId: true } } },
  });
  if (!booking) {
    throw new AppError(
      "Booking not found",
      HttpStatus.NOT_FOUND,
      "BOOKING_NOT_FOUND"
    );
  }

  let conversation = await prisma.conversation.findUnique({
    where: { bookingId },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        bookingId,
        participants: {
          create: [
            { userId: booking.renterId },
            { userId: booking.car.ownerId },
          ],
        },
      },
    });
  }

  return conversation;
}

export async function sendMessageForBooking(input: {
  bookingId: string;
  senderId: string;
  body: string;
}) {
  const trimmed = input.body.trim();
  if (!trimmed) {
    throw new AppError(
      "Message body is required",
      HttpStatus.BAD_REQUEST,
      "EMPTY_MESSAGE"
    );
  }
  if (trimmed.length > 2000) {
    throw new AppError(
      "Message is too long",
      HttpStatus.BAD_REQUEST,
      "MESSAGE_TOO_LONG"
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { car: { select: { ownerId: true } } },
  });
  if (!booking) {
    throw new AppError(
      "Booking not found",
      HttpStatus.NOT_FOUND,
      "BOOKING_NOT_FOUND"
    );
  }

  const isParticipant =
    input.senderId === booking.renterId ||
    input.senderId === booking.car.ownerId;
  if (!isParticipant) {
    throw new AppError(
      "Forbidden",
      HttpStatus.FORBIDDEN,
      "NOT_CONVERSATION_PARTICIPANT"
    );
  }

  const conversation = await ensureConversationForBooking(input.bookingId);

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: input.senderId,
      body: trimmed,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  // Notify the other participant
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId: conversation.id },
  });
  const recipient = participants.find((p) => p.userId !== input.senderId);
  if (recipient) {
    const sender = await prisma.user.findUnique({
      where: { id: input.senderId },
      select: { name: true },
    });
    await dispatchNotificationEvent({
      type: "message.received",
      idempotencyKey: `message-${message.id}-to-${recipient.userId}`,
      payload: {
        bookingId: input.bookingId,
        conversationId: conversation.id,
        messageId: message.id,
        recipientId: recipient.userId,
        senderName: sender?.name ?? "Someone",
        messagePreview: trimmed.slice(0, 100),
      },
      sourceId: conversation.id,
      sourceType: "conversation",
    });
  }

  return message;
}

export async function listConversationsForUser(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { userId } },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      booking: {
        select: {
          id: true,
          status: true,
          car: {
            select: {
              id: true,
              brand: true,
              model: true,
              town: true,
              island: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          body: true,
          createdAt: true,
          senderId: true,
          readAt: true,
        },
      },
      participants: {
        select: {
          userId: true,
        },
      },
    },
  });

  const convIds = conversations.map((c) => c.id);
  if (convIds.length === 0) return [];

  const unreadGrouped = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: convIds },
      senderId: { not: userId },
      readAt: null,
    },
    _count: { _all: true },
  });

  const unreadMap = new Map<string, number>();
  for (const row of unreadGrouped) {
    unreadMap.set(row.conversationId, row._count._all);
  }

  return conversations.map((conv) => {
    const lastMessage = conv.messages[0] ?? null;
    const unreadCount = unreadMap.get(conv.id) ?? 0;
    return {
      id: conv.id,
      booking: conv.booking,
      lastMessage,
      unreadCount,
    };
  });
}

export async function listMessagesForConversation(
  conversationId: string,
  userId: string
) {
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId },
    select: { id: true },
  });
  if (!participant) {
    throw new AppError(
      "Forbidden",
      HttpStatus.FORBIDDEN,
      "NOT_CONVERSATION_PARTICIPANT"
    );
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  // Mark incoming unread messages as read
  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return messages;
}

