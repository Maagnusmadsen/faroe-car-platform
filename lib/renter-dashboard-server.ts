import { prisma } from "@/db";

export async function getRenterUpcomingBookings(renterId: string, limit = 10) {
  const today = new Date();
  const todayStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  return prisma.booking.findMany({
    where: {
      renterId,
      status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
      endDate: { gte: todayStart },
    },
    orderBy: { startDate: "asc" },
    take: limit,
    include: {
      car: {
        select: {
          id: true,
          brand: true,
          model: true,
          town: true,
          island: true,
          pricePerDay: true,
        },
      },
    },
  });
}

export async function getRenterPastBookings(renterId: string, limit = 10) {
  const today = new Date();
  const todayStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getDate())
  );

  return prisma.booking.findMany({
    where: {
      renterId,
      status: "COMPLETED",
      endDate: { lt: todayStart },
    },
    orderBy: { endDate: "desc" },
    take: limit,
    include: {
      car: {
        select: {
          id: true,
          brand: true,
          model: true,
          town: true,
          island: true,
          pricePerDay: true,
        },
      },
    },
  });
}

export async function getRenterSavedCars(renterId: string) {
  return prisma.favorite.findMany({
    where: { userId: renterId },
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
}

/** Completed bookings where renter hasn't left a car review yet. */
export async function getRenterPendingReviews(renterId: string, limit = 10) {
  const today = new Date();
  const todayStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getDate())
  );

  return prisma.booking.findMany({
    where: {
      renterId,
      status: "COMPLETED",
      endDate: { lt: todayStart },
      carReviews: { none: {} },
    },
    orderBy: { endDate: "desc" },
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
    },
  });
}

