/**
 * GET /api/admin/email-preview?event=user.welcome
 * Returns rendered HTML for the given email template (admin only).
 * Use for previewing how transactional emails look.
 */

import { NextRequest } from "next/server";
import { requireAuth, requireAdmin } from "@/auth/guards";
import { jsonError } from "@/lib/utils/api-response";
import { renderEmailTemplate } from "@/lib/notifications/templates";
import type { EventType } from "@/lib/notifications/types";

const EVENT_TYPES: EventType[] = [
  "user.welcome",
  "booking.requested",
  "booking.approved",
  "booking.rejected",
  "booking.confirmed",
  "booking.cancelled",
  "booking.reminder",
  "payment.received",
  "payment.receipt",
  "payout.sent",
  "payout.failed",
  "message.received",
  "review.requested",
];

const SAMPLE_PAYLOAD: Record<string, Record<string, unknown>> = {
  "user.welcome": {},
  "booking.requested": {
    bookingId: "preview-booking-1",
    carId: "preview-car-1",
    carTitle: "Toyota Yaris 2022",
    startDate: "15. maj 2025",
    endDate: "18. maj 2025",
  },
  "booking.approved": {
    bookingId: "preview-booking-1",
    carId: "preview-car-1",
    carTitle: "Toyota Yaris 2022",
    startDate: "15. maj 2025",
    endDate: "18. maj 2025",
  },
  "booking.rejected": {
    bookingId: "preview-booking-1",
    carTitle: "Toyota Yaris 2022",
    startDate: "15. maj 2025",
    endDate: "18. maj 2025",
  },
  "booking.confirmed": {
    bookingId: "preview-booking-1",
    carTitle: "Toyota Yaris 2022",
    startDate: "15. maj 2025",
    endDate: "18. maj 2025",
  },
  "booking.cancelled": {
    bookingId: "preview-booking-1",
    carTitle: "Toyota Yaris 2022",
    startDate: "15. maj 2025",
    endDate: "18. maj 2025",
  },
  "booking.reminder": {
    bookingId: "preview-booking-1",
    carTitle: "Toyota Yaris 2022",
    startDate: "15. maj 2025",
  },
  "payment.received": {
    bookingId: "preview-booking-1",
    carTitle: "Toyota Yaris 2022",
    amount: "1.200",
    currency: "DKK",
  },
  "payment.receipt": {
    bookingId: "preview-booking-1",
    carTitle: "Toyota Yaris 2022",
    amount: "1.200",
    currency: "DKK",
  },
  "payout.sent": {
    amount: "850",
    currency: "DKK",
  },
  "payout.failed": {
    amount: "850",
    currency: "DKK",
  },
  "message.received": {
    bookingId: "preview-booking-1",
    conversationId: "preview-conv-1",
    senderName: "Kari",
    messagePreview: "Hej, kan jeg hente bilen kl. 10 ved lufthavnen?",
  },
  "review.requested": {
    bookingId: "preview-booking-1",
    carTitle: "Toyota Yaris 2022",
  },
};

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const event = request.nextUrl.searchParams.get("event") as EventType | null;
    if (!event || !EVENT_TYPES.includes(event)) {
      return jsonError("Invalid or missing event parameter", 400);
    }

    const payload = SAMPLE_PAYLOAD[event] ?? {};
    const recipientRole = event.startsWith("booking.") && event !== "booking.requested" ? "renter" : event === "booking.requested" || event === "payment.received" || event.startsWith("payout.") ? "owner" : "user";

    const result = renderEmailTemplate(event, payload, recipientRole);
    if (!result) {
      return jsonError(`No template for event: ${event}`, 404);
    }

    return new Response(result.html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) return jsonError("Unauthorized", 401);
    if (e.statusCode === 403) return jsonError("Forbidden", 403);
    throw err;
  }
}
