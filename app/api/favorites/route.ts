/**
 * Favorites API.
 *
 * GET /api/favorites
 *   - Without query: return all favorites for current user with car summary.
 *   - With ?carIds=ID1,ID2: return array of carIds that are favorited.
 *
 * POST /api/favorites
 *   Body: { carId }
 *   - Adds a favorite for current user (idempotent).
 *
 * DELETE /api/favorites
 *   Body: { carId }
 *   - Removes a favorite for current user.
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { prisma } from "@/db";
import { AppError, HttpStatus } from "@/lib/utils/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const carIdsParam = searchParams.get("carIds");

    if (carIdsParam) {
      const carIds = carIdsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      if (carIds.length === 0) {
        return jsonSuccess({ carIds: [] });
      }

      const favorites = await prisma.favorite.findMany({
        where: {
          userId: session.user.id,
          carId: { in: carIds },
        },
        select: { carId: true },
      });

      return jsonSuccess({ carIds: favorites.map((f) => f.carId) });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        car: {
          select: {
            id: true,
            brand: true,
            model: true,
            town: true,
            island: true,
            pricePerDay: true,
            ratingAvg: true,
          },
        },
      },
    });

    return jsonSuccess(favorites);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const carId = typeof body?.carId === "string" ? body.carId : "";
    if (!carId) {
      throw new AppError("carId is required", HttpStatus.BAD_REQUEST, "INVALID_REQUEST");
    }

    await prisma.favorite.upsert({
      where: {
        userId_carId: {
          userId: session.user.id,
          carId,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        carId,
      },
    });

    return jsonSuccess({ carId });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const carId = typeof body?.carId === "string" ? body.carId : "";
    if (!carId) {
      throw new AppError("carId is required", HttpStatus.BAD_REQUEST, "INVALID_REQUEST");
    }

    await prisma.favorite.deleteMany({
      where: {
        userId: session.user.id,
        carId,
      },
    });

    return jsonSuccess({ carId });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    return handleApiError(err);
  }
}

