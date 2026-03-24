/**
 * GET /api/bookings/[id] – single booking for current user (renter or listing owner).
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { prisma } from "@/db";
import { AppError, HttpStatus } from "@/lib/utils/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        OR: [{ renterId: session.user.id }, { car: { ownerId: session.user.id } }],
      },
      include: {
        renter: {
          select: { id: true, name: true, email: true },
        },
        car: {
          select: {
            id: true,
            title: true,
            brand: true,
            model: true,
            town: true,
            island: true,
            ownerId: true,
            owner: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new AppError("Booking not found", HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND");
    }

    return jsonSuccess(booking, {
      headers: { "Cache-Control": "private, max-age=15" },
    });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}
