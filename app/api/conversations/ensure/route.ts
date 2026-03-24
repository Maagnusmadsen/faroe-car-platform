/**
 * POST /api/conversations/ensure – ensure a conversation exists for a booking (participants only).
 * Creates the conversation row if missing. Does not send a message.
 *
 * Body: { bookingId: string }
 * Response: { conversationId: string }
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { prisma } from "@/db";
import { ensureConversationForBooking } from "@/lib/messaging-server";
import { AppError, HttpStatus } from "@/lib/utils/errors";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const bookingId = typeof body?.bookingId === "string" ? body.bookingId : "";
    if (!bookingId) {
      throw new AppError("bookingId is required", HttpStatus.BAD_REQUEST, "INVALID_REQUEST");
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { car: { select: { ownerId: true } } },
    });
    if (!booking) {
      throw new AppError("Booking not found", HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND");
    }
    const allowed =
      session.user.id === booking.renterId || session.user.id === booking.car.ownerId;
    if (!allowed) {
      throw new AppError("Forbidden", HttpStatus.FORBIDDEN, "FORBIDDEN");
    }

    const conversation = await ensureConversationForBooking(bookingId);
    return jsonSuccess({ conversationId: conversation.id });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}
