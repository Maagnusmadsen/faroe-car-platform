import { prisma } from "@/db";

export async function getOwnerListings(ownerId: string) {
  return prisma.carListing.findMany({
    where: { ownerId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      listingType: true,
      brand: true,
      model: true,
      status: true,
      pricePerDay: true,
      town: true,
      island: true,
      reviewCount: true,
      ratingAvg: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getOwnerRecentBookings(ownerId: string, limit = 10) {
  return prisma.booking.findMany({
    where: { car: { ownerId } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      car: {
        select: {
          id: true,
          brand: true,
          model: true,
          town: true,
          island: true,
        },
      },
      renter: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

/** Car reviews left on the owner's listings (renter → car). */
export async function getOwnerReviews(ownerId: string, limit = 10) {
  return prisma.carReview.findMany({
    where: { car: { ownerId } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      booking: {
        select: {
          id: true,
          car: {
            select: { id: true, brand: true, model: true, town: true, island: true },
          },
        },
      },
      reviewer: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

