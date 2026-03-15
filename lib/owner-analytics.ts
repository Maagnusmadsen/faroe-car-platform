/**
 * Owner analytics: revenue, financial summaries, car performance, utilization.
 * All queries filter by car.ownerId = ownerId and booking.status === "COMPLETED".
 * Stripe fee is not stored in DB; we use an estimated fee for display/export.
 */

import { prisma } from "@/db";

// Estimated Stripe fee (EU card: ~1.4% + 1.8 DKK per charge) for display/export only
const ESTIMATED_STRIPE_FEE_PERCENT = 1.4;
const ESTIMATED_STRIPE_FEE_FIXED_DKK = 1.8;

function estimatedStripeFee(totalAmount: number): number {
  return Math.round((totalAmount * ESTIMATED_STRIPE_FEE_PERCENT) / 100 + ESTIMATED_STRIPE_FEE_FIXED_DKK);
}

export type PeriodFilter = "month" | "quarter" | "year" | "all" | "custom";

export interface DateRange {
  from: Date; // start of day UTC
  to: Date;   // end of day UTC
}

function getRangeForPeriod(period: PeriodFilter, customFrom?: string, customTo?: string): DateRange {
  const now = new Date();
  const to = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
  let from: Date;

  if (period === "custom" && customFrom && customTo) {
    from = new Date(customFrom + "T00:00:00.000Z");
    const toDate = new Date(customTo + "T23:59:59.999Z");
    return { from, to: toDate };
  }

  switch (period) {
    case "month": {
      from = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
      break;
    }
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3) + 1;
      from = new Date(Date.UTC(now.getFullYear(), (q - 1) * 3, 1, 0, 0, 0, 0));
      break;
    }
    case "year": {
      from = new Date(Date.UTC(now.getFullYear(), 0, 1, 0, 0, 0, 0));
      break;
    }
    default:
      from = new Date(0); // all time
  }
  return { from, to };
}

const ownerCarWhere = (ownerId: string) => ({ car: { ownerId } });
const completedWhere = { status: "COMPLETED" as const };

export interface TopMetrics {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueThisYear: number;
  netEarnings: number;
  netEarningsThisMonth: number;
  netEarningsThisYear: number;
  totalCompletedRentals: number;
  averageRentalPrice: number;
  averageTripDurationDays: number;
  carUtilizationRate: number; // 0-1, days booked / available days (last 365)
  currency: string;
}

/** Top-level metrics from completed bookings only. Utilization uses last 365 days. */
export async function getOwnerTopMetrics(ownerId: string): Promise<TopMetrics> {
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getFullYear(), 0, 1, 0, 0, 0, 0));
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
  const last365Start = new Date(now);
  last365Start.setUTCDate(last365Start.getUTCDate() - 365);
  last365Start.setUTCHours(0, 0, 0, 0);

  const whereBase = { ...ownerCarWhere(ownerId), ...completedWhere };

  const [allTime, thisMonth, thisYear, last365, carCount] = await Promise.all([
    prisma.booking.aggregate({
      where: whereBase,
      _sum: { totalPrice: true, ownerPayoutAmount: true },
      _count: { id: true },
      _avg: { totalPrice: true },
    }),
    prisma.booking.aggregate({
      where: {
        ...whereBase,
        endDate: { gte: monthStart },
      },
      _sum: { totalPrice: true, ownerPayoutAmount: true },
    }),
    prisma.booking.aggregate({
      where: {
        ...whereBase,
        endDate: { gte: yearStart },
      },
      _sum: { totalPrice: true, ownerPayoutAmount: true },
    }),
    prisma.booking.findMany({
      where: {
        ...whereBase,
        endDate: { gte: last365Start },
      },
      select: { startDate: true, endDate: true },
    }),
    prisma.carListing.count({
      where: { ownerId, deletedAt: null },
    }),
  ]);

  const totalRevenue = Number(allTime._sum.totalPrice ?? 0);
  const netEarnings = Number(allTime._sum.ownerPayoutAmount ?? 0);
  const totalCompletedRentals = allTime._count.id;
  const averageRentalPrice = totalCompletedRentals > 0 ? Number(allTime._avg.totalPrice ?? 0) : 0;

  let totalRentalDays = 0;
  for (const b of last365) {
    const start = new Date(b.startDate).getTime();
    const end = new Date(b.endDate).getTime();
    totalRentalDays += Math.max(0, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
  }
  const availableCarDays = carCount * 365;
  const carUtilizationRate = availableCarDays > 0 ? Math.min(1, totalRentalDays / availableCarDays) : 0;

  let totalDurationDays = 0;
  if (totalCompletedRentals > 0) {
    const allBookings = await prisma.booking.findMany({
      where: whereBase,
      select: { startDate: true, endDate: true },
    });
    for (const b of allBookings) {
      const start = new Date(b.startDate).getTime();
      const end = new Date(b.endDate).getTime();
      totalDurationDays += (end - start) / (24 * 60 * 60 * 1000);
    }
  }
  const averageTripDurationDays =
    totalCompletedRentals > 0 ? Math.round((totalDurationDays / totalCompletedRentals) * 10) / 10 : 0;

  return {
    totalRevenue,
    revenueThisMonth: Number(thisMonth._sum.totalPrice ?? 0),
    revenueThisYear: Number(thisYear._sum.totalPrice ?? 0),
    netEarnings,
    netEarningsThisMonth: Number(thisMonth._sum.ownerPayoutAmount ?? 0),
    netEarningsThisYear: Number(thisYear._sum.ownerPayoutAmount ?? 0),
    totalCompletedRentals,
    averageRentalPrice,
    averageTripDurationDays,
    carUtilizationRate,
    currency: "DKK",
  };
}

export interface FinancialRow {
  grossRevenue: number;
  platformFees: number;
  stripeFeesEstimate: number;
  netPayout: number;
  estimatedVatOwed: number;
  netIncomeBeforeTax: number;
  bookingCount: number;
}

export interface FinancialSummaryInput {
  ownerId: string;
  period: PeriodFilter;
  customFrom?: string;
  customTo?: string;
  vatPercent?: number; // e.g. 25 for 25%
}

/** Financial summary for accounting/tax. All from completed bookings in range. */
export async function getOwnerFinancialSummary(input: FinancialSummaryInput): Promise<FinancialRow> {
  const { from, to } = getRangeForPeriod(input.period, input.customFrom, input.customTo);

  const where = {
    ...ownerCarWhere(input.ownerId),
    ...completedWhere,
    endDate: { gte: from, lte: to },
  };

  const bookings = await prisma.booking.findMany({
    where,
    select: {
      id: true,
      totalPrice: true,
      platformFeeAmount: true,
      ownerPayoutAmount: true,
    },
  });

  let grossRevenue = 0;
  let platformFees = 0;
  let stripeFeesEstimate = 0;
  let netPayout = 0;

  for (const b of bookings) {
    const total = Number(b.totalPrice);
    const platform = Number(b.platformFeeAmount);
    const net = Number(b.ownerPayoutAmount);
    grossRevenue += total;
    platformFees += platform;
    stripeFeesEstimate += estimatedStripeFee(total);
    netPayout += net;
  }

  const vatPercent = input.vatPercent ?? 0;
  const netBeforeVat = netPayout;
  const estimatedVatOwed = vatPercent > 0 ? Math.round((netBeforeVat * vatPercent) / 100) : 0;
  const netIncomeBeforeTax = netBeforeVat - estimatedVatOwed;

  return {
    grossRevenue,
    platformFees,
    stripeFeesEstimate,
    netPayout,
    estimatedVatOwed,
    netIncomeBeforeTax,
    bookingCount: bookings.length,
  };
}

export interface CarPerformanceRow {
  carId: string;
  carName: string;
  totalRevenue: number;
  totalRentals: number;
  averageRating: number | null;
  utilizationRate: number;
  averageTripDurationDays: number;
  revenuePerMonth: number;
  currency: string;
}

/** Per-car performance (completed bookings only). Utilization = rental days / days in last 365. */
export async function getOwnerCarPerformance(ownerId: string): Promise<CarPerformanceRow[]> {
  const now = new Date();
  const last365Start = new Date(now);
  last365Start.setUTCDate(last365Start.getUTCDate() - 365);
  last365Start.setUTCHours(0, 0, 0, 0);

  const cars = await prisma.carListing.findMany({
    where: { ownerId, deletedAt: null },
    select: {
      id: true,
      title: true,
      brand: true,
      model: true,
      year: true,
      ratingAvg: true,
      createdAt: true,
    },
  });

  const result: CarPerformanceRow[] = [];

  for (const car of cars) {
    const carWhere = { carId: car.id, ...completedWhere };
    const [agg, last365Bookings] = await Promise.all([
      prisma.booking.aggregate({
        where: carWhere,
        _sum: { totalPrice: true, ownerPayoutAmount: true },
        _count: { id: true },
      }),
      prisma.booking.findMany({
        where: { ...carWhere, endDate: { gte: last365Start } },
        select: { startDate: true, endDate: true },
      }),
    ]);

    const totalRevenue = Number(agg._sum.totalPrice ?? 0);
    const totalRentals = agg._count.id;

    let rentalDays365 = 0;
    for (const b of last365Bookings) {
      const start = new Date(b.startDate).getTime();
      const end = new Date(b.endDate).getTime();
      rentalDays365 += Math.max(0, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
    }
    const utilizationRate = 365 > 0 ? Math.min(1, rentalDays365 / 365) : 0;

    let totalDurationDays = 0;
    const carBookings = await prisma.booking.findMany({
      where: carWhere,
      select: { startDate: true, endDate: true },
    });
    for (const b of carBookings) {
      const start = new Date(b.startDate).getTime();
      const end = new Date(b.endDate).getTime();
      totalDurationDays += (end - start) / (24 * 60 * 60 * 1000);
    }
    const averageTripDurationDays =
      totalRentals > 0 ? Math.round((totalDurationDays / totalRentals) * 10) / 10 : 0;

    const carCreated = new Date(car.createdAt);
    const monthsActive = Math.max(1, (now.getTime() - carCreated.getTime()) / (30 * 24 * 60 * 60 * 1000));
    const revenuePerMonth = totalRentals > 0 ? Math.round((totalRevenue / monthsActive) * 100) / 100 : 0;

    const carName = car.title?.trim() || `${car.brand} ${car.model} (${car.year})`;

    result.push({
      carId: car.id,
      carName,
      totalRevenue,
      totalRentals,
      averageRating: car.ratingAvg != null ? Number(car.ratingAvg) : null,
      utilizationRate,
      averageTripDurationDays,
      revenuePerMonth,
      currency: "DKK",
    });
  }

  return result;
}

export interface RevenueOverTimeBucket {
  period: string; // YYYY-MM-DD or YYYY-MM or YYYY-Www
  revenue: number;
  rentalCount: number;
  avgPrice: number;
}

/** Revenue over time for charts. Group by day / week / month. */
export async function getOwnerRevenueOverTime(
  ownerId: string,
  groupBy: "day" | "week" | "month",
  limit = 24
): Promise<RevenueOverTimeBucket[]> {
  const where = { ...ownerCarWhere(ownerId), ...completedWhere };

  const bookings = await prisma.booking.findMany({
    where,
    select: { endDate: true, totalPrice: true },
    orderBy: { endDate: "desc" },
    take: 2000,
  });

  const buckets = new Map<string, { revenue: number; count: number }>();

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
    const prev = buckets.get(key) ?? { revenue: 0, count: 0 };
    prev.revenue += Number(b.totalPrice);
    prev.count += 1;
    buckets.set(key, prev);
  }

  const sorted = [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-limit)
    .map(([period, v]) => ({
      period,
      revenue: v.revenue,
      rentalCount: v.count,
      avgPrice: v.count > 0 ? Math.round((v.revenue / v.count) * 100) / 100 : 0,
    }));

  return sorted;
}

function getWeek(d: Date): number {
  const onejan = new Date(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7);
}

export interface UtilizationDemand {
  utilizationRate: number;
  totalRentalDays: number;
  availableCarDays: number;
  popularDaysOfWeek: { day: number; dayName: string; bookings: number }[];
  monthlyTrend: { month: string; rentalDays: number }[];
}

/** Utilization and demand insights (last 365 days). */
export async function getOwnerUtilizationDemand(ownerId: string): Promise<UtilizationDemand> {
  const now = new Date();
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - 365);
  from.setUTCHours(0, 0, 0, 0);

  const where = {
    ...ownerCarWhere(ownerId),
    ...completedWhere,
    endDate: { gte: from },
  };

  const [bookings, carCount] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: { startDate: true, endDate: true },
    }),
    prisma.carListing.count({ where: { ownerId, deletedAt: null } }),
  ]);

  let totalRentalDays = 0;
  const dayCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const monthCount = new Map<string, number>();

  for (const b of bookings) {
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    totalRentalDays += days;
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      dayCount[d.getUTCDay()] = (dayCount[d.getUTCDay()] ?? 0) + 1;
      const mKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      monthCount.set(mKey, (monthCount.get(mKey) ?? 0) + 1);
    }
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const popularDaysOfWeek = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    dayName: dayNames[day],
    bookings: dayCount[day] ?? 0,
  }));

  const monthlyTrend = [...monthCount.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([month, rentalDays]) => ({ month, rentalDays }));

  const availableCarDays = carCount * 365;
  const utilizationRate = availableCarDays > 0 ? Math.min(1, totalRentalDays / availableCarDays) : 0;

  return {
    utilizationRate,
    totalRentalDays,
    availableCarDays,
    popularDaysOfWeek,
    monthlyTrend,
  };
}

/** Export-friendly rows for CSV: completed bookings with fees. */
export async function getOwnerExportRows(
  ownerId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<
  {
    booking_id: string;
    car_name: string;
    renter_name: string;
    trip_start: string;
    trip_end: string;
    rental_price: number;
    platform_fee: number;
    stripe_fee: number;
    net_payout: number;
  }[]
> {
  const from = dateFrom ? new Date(dateFrom + "T00:00:00.000Z") : new Date(0);
  const to = dateTo ? new Date(dateTo + "T23:59:59.999Z") : new Date(9999, 11, 31);

  const bookings = await prisma.booking.findMany({
    where: {
      ...ownerCarWhere(ownerId),
      ...completedWhere,
      endDate: { gte: from, lte: to },
    },
    orderBy: { endDate: "asc" },
    include: {
      car: { select: { id: true, title: true, brand: true, model: true, year: true } },
      renter: { select: { name: true, email: true } },
    },
  });

  return bookings.map((b) => {
    const total = Number(b.totalPrice);
    const car = b.car;
    const carName = car.title?.trim() || `${car.brand} ${car.model} (${car.year})`;
    const renterName = b.renter.name ?? b.renter.email ?? "—";
    return {
      booking_id: b.id,
      car_name: carName,
      renter_name: renterName,
      trip_start: new Date(b.startDate).toISOString().slice(0, 10),
      trip_end: new Date(b.endDate).toISOString().slice(0, 10),
      rental_price: total,
      platform_fee: Number(b.platformFeeAmount),
      stripe_fee: estimatedStripeFee(total),
      net_payout: Number(b.ownerPayoutAmount),
    };
  });
}

/** Pickup locations for map: one per car (lat/lng from CarListing) for completed bookings. */
export async function getOwnerPickupLocationsForMap(ownerId: string): Promise<
  { carId: string; carName: string; latitude: number; longitude: number; completedBookings: number }[]
> {
  const cars = await prisma.carListing.findMany({
    where: { ownerId, deletedAt: null },
    select: {
      id: true,
      title: true,
      brand: true,
      model: true,
      year: true,
      latitude: true,
      longitude: true,
    },
  });

  const completedCounts = await prisma.booking.groupBy({
    by: ["carId"],
    where: { car: { ownerId }, status: "COMPLETED" },
    _count: { id: true },
  });
  const countMap = new Map(completedCounts.map((c) => [c.carId, c._count.id]));

  return cars.map((c) => ({
    carId: c.id,
    carName: c.title?.trim() || `${c.brand} ${c.model} (${c.year})`,
    latitude: Number(c.latitude),
    longitude: Number(c.longitude),
    completedBookings: countMap.get(c.id) ?? 0,
  }));
}
