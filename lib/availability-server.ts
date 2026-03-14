/**
 * Server-side availability helpers.
 *
 * - Owners define rules via CarAvailabilityRule and CarBlockedDate (wizard Step 6).
 * - Booked dates (blocking statuses) and blocked dates make cars unavailable.
 * - Availability rules (minNoticeDays, advanceBookingDays) are enforced.
 * - Exposes helpers for search and booking flows.
 */

import { prisma } from "@/db";
import { AppError, HttpStatus } from "@/lib/utils/errors";

const BOOKING_STATUSES_BLOCKING = [
  "PENDING_PAYMENT",
  "PENDING_APPROVAL",
  "CONFIRMED",
  "DISPUTED",
] as const;

type BlockingBookingStatus = (typeof BOOKING_STATUSES_BLOCKING)[number];

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

function toStartOfDay(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00.000Z");
}

function toEndOfDay(dateStr: string): Date {
  return new Date(dateStr + "T23:59:59.999Z");
}

/** Inclusive date-range overlap check for Date objects. */
export function dateRangesOverlapDates(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Returns a set of carIds that are unavailable in [startDate,endDate]
 * because of blocked dates, overlapping bookings, or availability rules.
 */
export async function getUnavailableCarIdsForRange(
  startDate: string,
  endDate: string
): Promise<Set<string>> {
  const start = toStartOfDay(startDate);
  const end = toEndOfDay(endDate);

  const today = new Date();
  const todayStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  const [blocked, booked, rules] = await Promise.all([
    prisma.carBlockedDate.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      select: { carId: true },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: [...BOOKING_STATUSES_BLOCKING] },
        car: { deletedAt: null },
        OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
      },
      select: { carId: true },
    }),
    prisma.carAvailabilityRule.findMany({
      select: { carId: true, minNoticeDays: true, advanceBookingDays: true },
    }),
  ]);

  const unavailable = new Set<string>();
  blocked.forEach((b) => unavailable.add(b.carId));
  booked.forEach((b) => unavailable.add(b.carId));

  // Rules: if requested range violates notice or advance window, mark as unavailable.
  for (const rule of rules) {
    const minNoticeMs = rule.minNoticeDays * 24 * 60 * 60 * 1000;
    const advanceMs = rule.advanceBookingDays * 24 * 60 * 60 * 1000;

    const earliestAllowed = new Date(todayStart.getTime() + minNoticeMs);
    const latestAllowed = new Date(todayStart.getTime() + advanceMs);

    // If start is before earliest allowed or end is after latest allowed → cannot book.
    if (start < earliestAllowed || end > latestAllowed) {
      unavailable.add(rule.carId);
    }
  }

  return unavailable;
}

interface PrismaTxn {
  carBlockedDate: typeof prisma.carBlockedDate;
  booking: typeof prisma.booking;
  carAvailabilityRule: typeof prisma.carAvailabilityRule;
}

/**
 * Check if a specific car is available for [startDate,endDate].
 * Considers:
 * - CarBlockedDate rows in range
 * - Bookings with blocking status that overlap the range
 * - Availability rules (minNoticeDays, advanceBookingDays)
 *
 * Optionally ignores a given bookingId (for updates).
 */
export async function isCarAvailableForRangeServer(
  carId: string,
  { startDate, endDate }: DateRange,
  opts?: { tx?: PrismaTxn; ignoreBookingId?: string | null }
): Promise<boolean> {
  if (!startDate || !endDate) return true;

  const start = toStartOfDay(startDate);
  const end = toEndOfDay(endDate);

  const tx = opts?.tx ?? prisma;

  const [blockedCount, bookings, rule] = await Promise.all([
    tx.carBlockedDate.count({
      where: {
        carId,
        date: { gte: start, lte: end },
      },
    }),
    tx.booking.findMany({
      where: {
        carId,
        status: { in: [...BOOKING_STATUSES_BLOCKING] },
        ...(opts?.ignoreBookingId ? { id: { not: opts.ignoreBookingId } } : {}),
        OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
      },
      select: { id: true, startDate: true, endDate: true },
    }),
    tx.carAvailabilityRule.findUnique({
      where: { carId },
    }),
  ]);

  if (blockedCount > 0) return false;

  if (bookings.length > 0) {
    return false;
  }

  if (rule) {
    const today = new Date();
    const todayStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );
    const minNoticeMs = rule.minNoticeDays * 24 * 60 * 60 * 1000;
    const advanceMs = rule.advanceBookingDays * 24 * 60 * 60 * 1000;

    const earliestAllowed = new Date(todayStart.getTime() + minNoticeMs);
    const latestAllowed = new Date(todayStart.getTime() + advanceMs);

    if (start < earliestAllowed || end > latestAllowed) {
      return false;
    }
  }

  return true;
}

/**
 * Throws AppError(CONFLICT) when the car is not available.
 * Intended for use inside booking flows.
 */
export async function assertCarAvailableOrThrow(
  carId: string,
  range: DateRange,
  opts?: { tx?: PrismaTxn; ignoreBookingId?: string | null }
): Promise<void> {
  const ok = await isCarAvailableForRangeServer(carId, range, opts);
  if (!ok) {
    throw new AppError(
      "Car is not available for the selected dates",
      HttpStatus.CONFLICT,
      "CAR_NOT_AVAILABLE",
      { carId, ...range }
    );
  }
}

