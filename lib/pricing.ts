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
 * All monetary values are returned as numbers in the listing's currency (major units, 2 decimals).
 * Persisted values are stored in Decimal columns on Booking/Payment.
 *
 * Rounding strategy:
 * - All calculations done in integer minor units (cents/øre) to avoid floating-point drift.
 * - Financial identity is preserved: totalPrice = platformFeeAmount + ownerPayoutAmount (exact).
 */

import { prisma } from "@/db";
import { AppError, HttpStatus } from "@/lib/utils/errors";
import {
  PLATFORM_COMMISSION_PERCENT,
  SERVICE_FEE_FLAT,
} from "@/lib/platform-fee-config";

/** Minor units per major unit (e.g. 100 øre per DKK). All internal math uses integers. */
const MINOR_PER_MAJOR = 100;

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

/** Convert minor units to major (2 decimal places). */
function minorToMajor(minor: number): number {
  return Math.round(minor) / MINOR_PER_MAJOR;
}

export function calculatePricing(input: PricingInput): PricingBreakdown {
  if (!Number.isFinite(input.pricePerDay) || input.pricePerDay <= 0) {
    throw new AppError(
      "Daily price must be greater than 0",
      HttpStatus.BAD_REQUEST,
      "INVALID_PRICE"
    );
  }
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
  // Work in minor units (integer) to avoid floating-point drift
  const baseAmountMinor = Math.round(baseDailyPrice * days * MINOR_PER_MAJOR);

  const weekly = input.weeklyDiscountPct ?? null;
  const monthly = input.monthlyDiscountPct ?? null;
  let discountPercent = 0;

  if (monthly != null && days >= 28) {
    discountPercent = monthly;
  } else if (weekly != null && days >= 7) {
    discountPercent = weekly;
  }

  const discountAmountMinor = Math.round((baseAmountMinor * discountPercent) / 100);
  const discountedAmountMinor = baseAmountMinor - discountAmountMinor;

  const serviceFeeMinor = Math.round(SERVICE_FEE_FLAT * MINOR_PER_MAJOR);
  const platformFeeMinor = Math.round((discountedAmountMinor * PLATFORM_COMMISSION_PERCENT) / 100);

  // Renter pays discounted amount + service fee
  const renterTotalMinor = discountedAmountMinor + serviceFeeMinor;
  // Owner gets renter total minus platform fee (identity: total = platformFee + ownerPayout)
  const ownerPayoutMinor = renterTotalMinor - platformFeeMinor;

  return {
    currency: input.currency,
    days,
    baseDailyPrice,
    baseAmount: minorToMajor(baseAmountMinor),
    discountPercent,
    discountAmount: minorToMajor(discountAmountMinor),
    discountedAmount: minorToMajor(discountedAmountMinor),
    serviceFeeAmount: minorToMajor(serviceFeeMinor),
    platformFeeAmount: minorToMajor(platformFeeMinor),
    renterTotalAmount: minorToMajor(renterTotalMinor),
    ownerPayoutAmount: minorToMajor(ownerPayoutMinor),
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
  const pricePerDay = Number(car.pricePerDay);
  if (!Number.isFinite(pricePerDay) || pricePerDay <= 0) {
    throw new AppError(
      "Listing has invalid price (must be greater than 0)",
      HttpStatus.BAD_REQUEST,
      "INVALID_PRICE"
    );
  }

  return calculatePricing({
    pricePerDay,
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

