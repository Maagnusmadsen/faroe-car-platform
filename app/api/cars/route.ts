/**
 * GET /api/cars – search ACTIVE listings with filters, dates, sort, pagination.
 * Query params: location, island, town, startDate, endDate, priceMin, priceMax,
 * seats, transmission, fuelType, is4x4, airportPickup, sort, page, pageSize.
 * Returns availability-aware results (excludes blocked/overlapping bookings).
 */

import { NextRequest } from "next/server";
import { carsQuerySchema } from "@/validation/schemas/car";
import { searchListings } from "@/lib/car-search";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import type { SortOption } from "@/lib/filter-cars";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = carsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return jsonError(parsed.error.message, 400);
    }
    const query = parsed.data;
    const sort = (query.sort ?? "newest") as SortOption;
    const result = await searchListings({ ...query, sort });
    return jsonSuccess(result, {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
