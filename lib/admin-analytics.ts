/**
 * Admin analytics: platform-wide metrics, earnings, activity.
 * All queries are unscoped — admin sees everything.
 */

import { prisma } from "@/db";

const completedWhere = { status: "COMPLETED" as const };
const paidStatuses: ("PAID" | "CONFIRMED" | "COMPLETED")[] = ["PAID", "CONFIRMED", "COMPLETED"];

export interface AdminDashboardMetrics {
  totalUsers: number;
  activeUsersLast30Days: number;
  totalOwners: number;
  totalRenters: number;
  totalListings: number;
  activeListings: number;
  pendingListings: number;
  draftListings: number;
  rejectedListings: number;
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  cancellationRate: number;
  totalPlatformRevenue: number;
  totalOwnerEarnings: number;
  platformFees: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueThisYear: number;
  averageBookingValue: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  currency: string;
}

/** High-level platform metrics for admin dashboard. */
export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
  const yearStart = new Date(Date.UTC(now.getFullYear(), 0, 1, 0, 0, 0, 0));
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  const lastMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0));
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const [
    totalUsers,
    activeUsersLast30Days,
    newUsersLast7Days,
    newUsersLast30Days,
    ownerIds,
    renterIds,
    listingsByStatus,
    totalBookings,
    upcomingBookings,
    completedAgg,
    completedCount,
    cancelledCount,
    pendingBookingsCount,
    revenueThisMonthAgg,
    revenueLastMonthAgg,
    revenueThisYearAgg,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({
      where: {
        deletedAt: null,
        OR: [
          { createdAt: { gte: thirtyDaysAgo } },
          {
            bookingsAsRenter: {
              some: { endDate: { gte: thirtyDaysAgo } },
            },
          },
          {
            carListings: {
              some: {
                deletedAt: null,
                bookings: { some: { endDate: { gte: thirtyDaysAgo } } },
              },
            },
          },
        ],
      },
    }),
    prisma.user.count({
      where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.user.count({
      where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.user.findMany({
      where: {
        deletedAt: null,
        carListings: { some: { deletedAt: null } },
      },
      select: { id: true },
    }),
    prisma.user.findMany({
      where: {
        deletedAt: null,
        bookingsAsRenter: { some: {} },
      },
      select: { id: true },
    }),
    prisma.carListing.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    prisma.booking.count(),
    prisma.booking.count({
      where: { startDate: { gte: today }, status: { in: paidStatuses } },
    }),
    prisma.booking.aggregate({
      where: completedWhere,
      _sum: { totalPrice: true, ownerPayoutAmount: true, platformFeeAmount: true },
      _count: { id: true },
    }),
    prisma.booking.count({ where: completedWhere }),
    prisma.booking.count({ where: { status: "CANCELLED" } }),
    prisma.booking.count({
      where: {
        status: { in: ["PENDING_PAYMENT", "PENDING_APPROVAL"] },
      },
    }),
    prisma.booking.aggregate({
      where: {
        ...completedWhere,
        endDate: { gte: monthStart },
      },
      _sum: { totalPrice: true, platformFeeAmount: true, ownerPayoutAmount: true },
    }),
    prisma.booking.aggregate({
      where: {
        ...completedWhere,
        endDate: { gte: yearStart },
      },
      _sum: { totalPrice: true, platformFeeAmount: true, ownerPayoutAmount: true },
    }),
    prisma.booking.aggregate({
      where: {
        ...completedWhere,
        endDate: { gte: lastMonthStart, lt: monthStart },
      },
      _sum: { totalPrice: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(
    listingsByStatus.map((s) => [s.status, s._count.id])
  );

  const totalPlatformRevenue = Number(completedAgg._sum.totalPrice ?? 0);
  const platformFees = Number(completedAgg._sum.platformFeeAmount ?? 0);
  const totalOwnerEarnings = Number(completedAgg._sum.ownerPayoutAmount ?? 0);
  const revenueThisMonth = Number(revenueThisMonthAgg._sum.totalPrice ?? 0);
  const revenueLastMonth = Number(revenueLastMonthAgg._sum.totalPrice ?? 0);
  const cancellationRate =
    totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 1000) / 10 : 0;
  const averageBookingValue =
    completedCount > 0 ? Math.round(totalPlatformRevenue / completedCount) : 0;

  return {
    totalUsers,
    activeUsersLast30Days,
    totalOwners: ownerIds.length,
    totalRenters: renterIds.length,
    totalListings: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    activeListings: statusCounts.ACTIVE ?? 0,
    pendingListings: statusCounts.DRAFT ?? 0,
    draftListings: statusCounts.DRAFT ?? 0,
    rejectedListings: statusCounts.REJECTED ?? 0,
    totalBookings,
    upcomingBookings,
    completedBookings: completedCount,
    cancelledBookings: cancelledCount,
    pendingBookings: pendingBookingsCount,
    cancellationRate,
    totalPlatformRevenue,
    totalOwnerEarnings,
    platformFees,
    revenueThisMonth,
    revenueLastMonth,
    revenueThisYear: Number(revenueThisYearAgg._sum.totalPrice ?? 0),
    averageBookingValue,
    newUsersLast7Days,
    newUsersLast30Days,
    currency: "DKK",
  };
}

export interface OwnerEarningsRow {
  userId: string;
  email: string;
  name: string | null;
  totalRevenue: number;
  platformFees: number;
  netEarnings: number;
  bookingCount: number;
  listingCount: number;
}

/** Earnings per owner (platform-wide). */
export async function getAdminOwnerEarnings(): Promise<OwnerEarningsRow[]> {
  const owners = await prisma.user.findMany({
    where: {
      deletedAt: null,
      carListings: { some: { deletedAt: null } },
    },
    select: {
      id: true,
      email: true,
      name: true,
      carListings: {
        where: { deletedAt: null },
        select: { id: true },
      },
    },
  });

  const rows: OwnerEarningsRow[] = [];

  for (const owner of owners) {
    const carIds = owner.carListings.map((c) => c.id);
    const agg = await prisma.booking.aggregate({
      where: {
        carId: { in: carIds },
        ...completedWhere,
      },
      _sum: { totalPrice: true, platformFeeAmount: true, ownerPayoutAmount: true },
      _count: { id: true },
    });

    rows.push({
      userId: owner.id,
      email: owner.email,
      name: owner.name,
      totalRevenue: Number(agg._sum.totalPrice ?? 0),
      platformFees: Number(agg._sum.platformFeeAmount ?? 0),
      netEarnings: Number(agg._sum.ownerPayoutAmount ?? 0),
      bookingCount: agg._count.id,
      listingCount: owner.carListings.length,
    });
  }

  return rows.sort((a, b) => b.netEarnings - a.netEarnings);
}

export interface RevenueOverTimeBucket {
  period: string;
  revenue: number;
  platformFees: number;
  ownerPayout: number;
  rentalCount: number;
}

/** Platform revenue over time (completed bookings only). */
export async function getAdminRevenueOverTime(
  groupBy: "day" | "week" | "month",
  limit = 12
): Promise<RevenueOverTimeBucket[]> {
  const bookings = await prisma.booking.findMany({
    where: completedWhere,
    select: { endDate: true, totalPrice: true, platformFeeAmount: true, ownerPayoutAmount: true },
    orderBy: { endDate: "desc" },
    take: 2000,
  });

  const buckets = new Map<
    string,
    { revenue: number; platformFees: number; ownerPayout: number; count: number }
  >();

  for (const b of bookings) {
    const d = new Date(b.endDate);
    let key: string;
    if (groupBy === "day") {
      key = d.toISOString().slice(0, 10);
    } else if (groupBy === "week") {
      const week = getWeek(d);
      key = `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
    } else {
      key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    const prev = buckets.get(key) ?? { revenue: 0, platformFees: 0, ownerPayout: 0, count: 0 };
    prev.revenue += Number(b.totalPrice);
    prev.platformFees += Number(b.platformFeeAmount);
    prev.ownerPayout += Number(b.ownerPayoutAmount);
    prev.count += 1;
    buckets.set(key, prev);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-limit)
    .map(([period, v]) => ({
      period,
      revenue: v.revenue,
      platformFees: v.platformFees,
      ownerPayout: v.ownerPayout,
      rentalCount: v.count,
    }));
}

function getWeek(d: Date): number {
  const onejan = new Date(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7);
}

export interface AdminActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  userEmail: string | null;
  createdAt: string;
}

/** Recent admin audit log entries. */
export async function getAdminRecentActivity(limit = 20): Promise<AdminActivityItem[]> {
  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { email: true } },
    },
  });

  return logs.map((l) => ({
    id: l.id,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    userId: l.userId,
    userEmail: l.user?.email ?? null,
    createdAt: l.createdAt.toISOString(),
  }));
}

export interface AdminIssues {
  pendingRenterApprovals: number;
  pendingListings: number;
  failedPayouts: number;
  pendingPayouts: number;
  disputedBookings: number;
  recentCancellations: number;
}

/** Operational issues requiring attention. */
export async function getAdminIssues(): Promise<AdminIssues> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const [
    pendingRenterApprovals,
    pendingListings,
    failedPayouts,
    pendingPayouts,
    disputedBookings,
    recentCancellations,
  ] = await Promise.all([
    prisma.userProfile.count({ where: { verificationStatus: "PENDING" } }),
    prisma.carListing.count({ where: { status: "DRAFT", deletedAt: null } }),
    prisma.payout.count({ where: { status: "FAILED" } }),
    prisma.payout.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: "DISPUTED" } }),
    prisma.booking.count({
      where: {
        status: "CANCELLED",
        updatedAt: { gte: weekAgo },
      },
    }),
  ]);

  return {
    pendingRenterApprovals,
    pendingListings,
    failedPayouts,
    pendingPayouts,
    disputedBookings,
    recentCancellations,
  };
}

export interface AdminListingPerformance {
  listingId: string;
  brand: string;
  model: string;
  year: number;
  town: string;
  island: string;
  status: string;
  pricePerDay: number;
  ownerEmail: string;
  ownerName: string | null;
  totalBookings: number;
  totalRevenue: number;
  utilizationRate: number;
}

/** Listing performance across platform. */
export async function getAdminListingPerformance(): Promise<AdminListingPerformance[]> {
  const now = new Date();
  const last365 = new Date(now);
  last365.setUTCDate(last365.getUTCDate() - 365);

  const listings = await prisma.carListing.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      brand: true,
      model: true,
      year: true,
      town: true,
      island: true,
      status: true,
      pricePerDay: true,
      owner: { select: { email: true, name: true } },
    },
  });

  const result: AdminListingPerformance[] = [];

  for (const l of listings) {
    const [agg, last365Bookings] = await Promise.all([
      prisma.booking.aggregate({
        where: { carId: l.id, ...completedWhere },
        _sum: { totalPrice: true },
        _count: { id: true },
      }),
      prisma.booking.findMany({
        where: { carId: l.id, ...completedWhere, endDate: { gte: last365 } },
        select: { startDate: true, endDate: true },
      }),
    ]);

    let rentalDays = 0;
    for (const b of last365Bookings) {
      const s = new Date(b.startDate).getTime();
      const e = new Date(b.endDate).getTime();
      rentalDays += Math.ceil((e - s) / (24 * 60 * 60 * 1000));
    }
    const utilizationRate = Math.min(1, rentalDays / 365);

    result.push({
      listingId: l.id,
      brand: l.brand,
      model: l.model,
      year: l.year,
      town: l.town,
      island: l.island,
      status: l.status,
      pricePerDay: Number(l.pricePerDay),
      ownerEmail: l.owner.email,
      ownerName: l.owner.name,
      totalBookings: agg._count.id,
      totalRevenue: Number(agg._sum.totalPrice ?? 0),
      utilizationRate,
    });
  }

  return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
}
