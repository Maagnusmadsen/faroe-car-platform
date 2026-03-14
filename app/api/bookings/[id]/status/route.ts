/**
 * PATCH /api/bookings/[id]/status – update booking status.
 * - Owners can confirm / cancel / dispute (reject).
 * - Renters can cancel their own pending bookings.
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonSuccess, handleApiError, jsonError } from "@/lib/utils/api-response";
import { parseOrThrow } from "@/lib/utils/validate";
import { bookingStatusUpdateSchema } from "@/validation";
import { prisma } from "@/db";
import { notFound } from "@/lib/utils/errors";
import { notifyBookingCancelled, notifyReviewReminder } from "@/lib/notifications-server";

const OWNER_ALLOWED_STATUSES = new Set([
  "CONFIRMED",  // approve
  "REJECTED",   // reject
  "CANCELLED",
  "DISPUTED",
  "COMPLETED",  // mark trip done so both can review
]);

const RENTER_ALLOWED_STATUSES = new Set(["CANCELLED"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const input = parseOrThrow(bookingStatusUpdateSchema, body);

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        car: { select: { ownerId: true } },
      },
    });

    if (!booking) {
      return jsonError(notFound("Booking not found"));
    }

    const isOwner = booking.car.ownerId === session.user.id;
    const isRenter = booking.renterId === session.user.id;

    // Basic permission check
    if (
      (isOwner && !OWNER_ALLOWED_STATUSES.has(input.status)) ||
      (isRenter && !RENTER_ALLOWED_STATUSES.has(input.status)) ||
      (!isOwner && !isRenter)
    ) {
      return jsonError("Forbidden", 403);
    }

    // Simple lifecycle guard: don't mutate completed bookings
    if (booking.status === "COMPLETED") {
      return jsonError("Booking is already completed", 409);
    }

    // Owner can only approve/reject when status is PENDING_APPROVAL
    if (isOwner && (input.status === "CONFIRMED" || input.status === "REJECTED")) {
      if (booking.status !== "PENDING_APPROVAL") {
        return jsonError("Only pending requests can be approved or rejected", 409);
      }
    }

    // Renter can only cancel when pending
    if (isRenter && input.status === "CANCELLED") {
      if (booking.status !== "PENDING_APPROVAL" && booking.status !== "PENDING_PAYMENT") {
        return jsonError("Only pending bookings can be cancelled by the renter", 409);
      }
    }

    // Owner can set COMPLETED only when booking is CONFIRMED (trip done)
    if (isOwner && input.status === "COMPLETED") {
      if (booking.status !== "CONFIRMED") {
        return jsonError("Only confirmed bookings can be marked completed", 409);
      }
    }

    // When owner approves, set PENDING_PAYMENT so renter must pay before booking is confirmed
    const statusToWrite =
      isOwner && input.status === "CONFIRMED"
        ? "PENDING_PAYMENT"
        : input.status;

    const [updated] = await prisma.$transaction([
      prisma.booking.update({
        where: { id },
        data: { status: statusToWrite },
      }),
      prisma.bookingStatusHistory.create({
        data: { bookingId: id, status: statusToWrite },
      }),
    ]);

    // Notifications for cancellation and completion
    if (input.status === "CANCELLED") {
      // Notify both renter and owner
      await Promise.all([
        notifyBookingCancelled(booking.renterId, booking.id, booking.carId),
        notifyBookingCancelled(booking.car.ownerId, booking.id, booking.carId),
      ]);
    } else if (statusToWrite === "PENDING_PAYMENT") {
      // Optional: notify renter that they can now pay (e.g. email "Your booking was approved – complete payment")
    } else if (input.status === "COMPLETED") {
      // Review reminders for both parties
      await Promise.all([
        notifyReviewReminder(booking.renterId, booking.id, booking.carId),
        notifyReviewReminder(booking.car.ownerId, booking.id, booking.carId),
      ]);
    }

    return jsonSuccess(updated);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return Response.json({ error: e.message }, { status: 401 });
    }
    return handleApiError(err);
  }
}

