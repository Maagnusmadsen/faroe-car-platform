/**
 * Car search query layer: availability-aware listing search with filters, sort, pagination.
 * Used by GET /api/cars. Only ACTIVE, non-deleted listings; excludes cars that are:
 * - blocked via CarBlockedDate
 * - booked (PENDING_PAYMENT, CONFIRMED, DISPUTED) on overlapping dates
 * - outside their availability rules (minNoticeDays, advanceBookingDays)
 */

import { prisma } from "@/db";
import type { Car } from "@/lib/cars";
import type { CarsQueryInput } from "@/validation/schemas/car";
import type { SortOption } from "@/lib/filter-cars";
import { getUnavailableCarIdsForRange } from "@/lib/availability-server";

const DEFAULT_PAGE_SIZE = 12;

function listingToCar(listing: {
  id: string;
  title: string | null;
  listingType: string;
  brand: string;
  model: string;
  year: number;
  pricePerDay: unknown;
  location: string;
  ratingAvg: unknown;
  latitude: unknown;
  longitude: unknown;
  island: string;
  town: string;
  pickupLocation: string;
  airportPickup: boolean;
  seats: number;
  transmission: string;
  fuelType: string;
  is4x4: boolean;
  vehicleType: string;
  images: { url: string }[];
}): Car {
  const firstImage =
    listing.images[0]?.url ?? "https://images.unsplash.com/photo-1494976388531-d1058494cd4f?w=800&q=80";

  return {
    id: listing.id,
    title: listing.title ?? undefined,
    type: (listing.listingType === "ride_share" ? "ride_share" : "car_rental") as Car["type"],
    brand: listing.brand,
    model: listing.model,
    year: listing.year,
    pricePerDay: Number(listing.pricePerDay),
    location: listing.location,
    rating: listing.ratingAvg != null ? Number(listing.ratingAvg) : 5,
    imageUrl: firstImage,
    latitude: Number(listing.latitude),
    longitude: Number(listing.longitude),
    island: listing.island,
    town: listing.town,
    pickupLocation: listing.pickupLocation || undefined,
    airportPickup: listing.airportPickup,
    seats: listing.seats,
    transmission: listing.transmission as Car["transmission"],
    fuelType: listing.fuelType as Car["fuelType"],
    is4x4: listing.is4x4,
    vehicleType: listing.vehicleType as Car["vehicleType"],
  };
}

export interface SearchListingsResult {
  items: Car[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Search ACTIVE listings with filters, date-range availability, sort, and pagination.
 * Query strategy:
 * - Base: status ACTIVE, deletedAt null.
 * - If startDate+endDate provided: exclude cars with any CarBlockedDate in range or
 *   any Booking (PENDING_PAYMENT/CONFIRMED/DISPUTED) overlapping the range.
 * - Filters: location (OR on town/location/pickupLocation contains), island, town,
 *   pricePerDay gte/lte, seats gte, transmission, fuelType, is4x4, airportPickup.
 * - Sort: price-asc, price-desc, rating-desc, or relevant (id).
 * - Pagination: skip/take; total from count with same where.
 * Indexes used: status, status+town, island, (latitude,longitude), pricePerDay (composite with status would help).
 */
export async function searchListings(
  params: CarsQueryInput & { sort?: SortOption }
): Promise<SearchListingsResult> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const sort: SortOption = params.sort ?? "relevant";

  let unavailableIds: Set<string> = new Set();
  if (params.startDate && params.endDate) {
    unavailableIds = await getUnavailableCarIdsForRange(
      params.startDate,
      params.endDate
    );
  }

  const where: import("@prisma/client").Prisma.CarListingWhereInput = {
    status: "ACTIVE",
    deletedAt: null,
    ...(unavailableIds.size > 0 ? { id: { notIn: [...unavailableIds] } } : {}),
  };

  if (params.type === "car_rental" || params.type === "ride_share") {
    where.listingType = params.type;
  }
  if (params.location?.trim()) {
    const loc = params.location.trim();
    where.OR = [
      { town: { contains: loc, mode: "insensitive" } },
      { location: { contains: loc, mode: "insensitive" } },
      { pickupLocation: { contains: loc, mode: "insensitive" } },
    ];
  }
  if (params.island?.trim()) where.island = params.island.trim();
  if (params.town?.trim()) where.town = { contains: params.town.trim(), mode: "insensitive" };
  if (params.priceMin != null) where.pricePerDay = { ...((where.pricePerDay as object) || {}), gte: params.priceMin };
  if (params.priceMax != null) where.pricePerDay = { ...((where.pricePerDay as object) || {}), lte: params.priceMax };
  if (params.seats != null) where.seats = { gte: params.seats };
  if (params.transmission) where.transmission = params.transmission;
  if (params.fuelType) where.fuelType = params.fuelType;
  if (params.is4x4 !== undefined && params.is4x4 !== null) where.is4x4 = params.is4x4;
  if (params.airportPickup === true) where.airportPickup = true;

  const orderBy: import("@prisma/client").Prisma.CarListingOrderByWithRelationInput | import("@prisma/client").Prisma.CarListingOrderByWithRelationInput[] =
    sort === "newest"
      ? { createdAt: "desc" }
      : sort === "price-asc"
        ? { pricePerDay: "asc" }
        : sort === "price-desc"
          ? { pricePerDay: "desc" }
          : sort === "rating-desc"
            ? [{ ratingAvg: "desc" }, { id: "asc" }]
            : { id: "asc" };

  const [items, total] = await Promise.all([
    prisma.carListing.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
    prisma.carListing.count({ where }),
  ]);

  const cars = items.map((row) =>
    listingToCar({
      ...row,
      images: row.images,
    })
  );

  return {
    items: cars,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}
