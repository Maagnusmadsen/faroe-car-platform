/**
 * Pricing engine for bookings.
 *
 * Responsibilities:
 * - Base daily price * number of days
 * - Optional weekly / monthly discounts
 * - Optional service / admin fees
 * - Platform commission
 * - Split between renter total and owner payout
 *
 * All monetary values are returned as numbers in the listing's currency.
 * Persisted values are stored in Decimal columns on Booking/Payment.
 */

import { prisma } from "@/db";
import { AppError, HttpStatus } from "@/lib/utils/errors";

// PLATFORM CONFIG
const PLATFORM_COMMISSION_PERCENT = 15; // % of discounted rental amount
const SERVICE_FEE_FLAT = 0; // flat fee per booking in listing currency (can be tuned later)

export interface PricingInput {
  pricePerDay: number;
  currency: string;
  minRentalDays: number;
  weeklyDiscountPct?: number | null;
  monthlyDiscountPct?: number | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface PricingBreakdown {
  currency: string;
  days: number;
  baseDailyPrice: number;
  baseAmount: number;
  discountPercent: number;
  discountAmount: number;
  discountedAmount: number;
  serviceFeeAmount: number;
  platformFeeAmount: number;
  renterTotalAmount: number;
  ownerPayoutAmount: number;
}

function diffInDays(start: string, end: string): number {
  const startDate = new Date(start + "T00:00:00.000Z");
  const endDate = new Date(end + "T00:00:00.000Z");
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((endDate.getTime() - startDate.getTime()) / msPerDay);
}

function roundAmount(value: number): number {
  return Math.round(value);
}

export function calculatePricing(input: PricingInput): PricingBreakdown {
  const days = diffInDays(input.startDate, input.endDate);
  if (days <= 0) {
    throw new AppError(
      "End date must be after start date",
      HttpStatus.BAD_REQUEST,
      "INVALID_DATES"
    );
  }
  if (days < input.minRentalDays) {
    throw new AppError(
      `Minimum rental is ${input.minRentalDays} day(s)`,
      HttpStatus.BAD_REQUEST,
      "MIN_RENTAL_DAYS",
      { minRentalDays: input.minRentalDays }
    );
  }

  const baseDailyPrice = input.pricePerDay;
  const baseAmount = baseDailyPrice * days;

  // Choose the best available duration discount (month > week)
  const weekly = input.weeklyDiscountPct ?? null;
  const monthly = input.monthlyDiscountPct ?? null;
  let discountPercent = 0;

  if (monthly != null && days >= 28) {
    discountPercent = monthly;
  } else if (weekly != null && days >= 7) {
    discountPercent = weekly;
  }

  const discountAmount = roundAmount((baseAmount * discountPercent) / 100);
  const discountedAmount = baseAmount - discountAmount;

  const serviceFeeAmount = SERVICE_FEE_FLAT;

  // Platform commission on discounted rental amount
  const commissionAmount = roundAmount(
    (discountedAmount * PLATFORM_COMMISSION_PERCENT) / 100
  );

  // Platform keeps commission + service fee
  const platformFeeAmount = commissionAmount + serviceFeeAmount;

  const renterTotalAmount = discountedAmount + serviceFeeAmount;
  const ownerPayoutAmount = renterTotalAmount - platformFeeAmount;

  return {
    currency: input.currency,
    days,
    baseDailyPrice,
    baseAmount: roundAmount(baseAmount),
    discountPercent,
    discountAmount,
    discountedAmount: roundAmount(discountedAmount),
    serviceFeeAmount,
    platformFeeAmount,
    renterTotalAmount,
    ownerPayoutAmount,
  };
}

/**
 * Convenience helper: load listing pricing config and compute breakdown.
 */
export async function calculatePricingForListing(
  listingId: string,
  startDate: string,
  endDate: string
): Promise<PricingBreakdown> {
  const car = await prisma.carListing.findFirst({
    where: { id: listingId, status: "ACTIVE", deletedAt: null },
    select: {
      pricePerDay: true,
      currency: true,
      minRentalDays: true,
      weeklyDiscountPct: true,
      monthlyDiscountPct: true,
    },
  });
  if (!car) {
    throw new AppError(
      "Listing not found or not active",
      HttpStatus.NOT_FOUND,
      "LISTING_NOT_FOUND"
    );
  }

  return calculatePricing({
    pricePerDay: Number(car.pricePerDay),
    currency: car.currency,
    minRentalDays: car.minRentalDays,
    weeklyDiscountPct: car.weeklyDiscountPct
      ? Number(car.weeklyDiscountPct)
      : null,
    monthlyDiscountPct: car.monthlyDiscountPct
      ? Number(car.monthlyDiscountPct)
      : null,
    startDate,
    endDate,
  });
}

