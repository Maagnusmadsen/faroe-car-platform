/**
 * Messaging API for booking conversations.
 *
 * POST /api/messages – send a message for a booking
 *   Body: { bookingId: string, body: string }
 *
 * GET /api/messages?conversationId=... – list messages in a conversation (only participants)
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { sendMessageForBooking, listMessagesForConversation } from "@/lib/messaging-server";
import { AppError, HttpStatus } from "@/lib/utils/errors";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const bookingId = typeof body?.bookingId === "string" ? body.bookingId : "";
    const text = typeof body?.body === "string" ? body.body : "";
    if (!bookingId) {
      throw new AppError("bookingId is required", HttpStatus.BAD_REQUEST, "INVALID_REQUEST");
    }
    const message = await sendMessageForBooking({
      bookingId,
      senderId: session.user.id,
      body: text,
    });
    return jsonSuccess(message);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId") ?? "";
    if (!conversationId) {
      throw new AppError("conversationId is required", HttpStatus.BAD_REQUEST, "INVALID_REQUEST");
    }
    const messages = await listMessagesForConversation(conversationId, session.user.id);
    return jsonSuccess(messages);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}

