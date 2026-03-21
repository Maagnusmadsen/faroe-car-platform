import { describe, it, expect } from "vitest";
import { calculatePricing } from "@/lib/pricing";

describe("pricing engine", () => {
  it("calculates base price without discounts or fees", () => {
    const result = calculatePricing({
      pricePerDay: 500,
      currency: "DKK",
      minRentalDays: 1,
      startDate: "2026-03-10",
      endDate: "2026-03-11", // 1 night
    });

    expect(result.days).toBe(1);
    expect(result.baseAmount).toBe(500);
    expect(result.discountAmount).toBe(0);
    expect(result.discountedAmount).toBe(500);
    expect(result.platformFeeAmount).toBeGreaterThan(0);
    expect(result.renterTotalAmount).toBeGreaterThan(0);
    expect(result.ownerPayoutAmount).toBeGreaterThan(0);
    // Financial identity: totalPrice = platformFee + ownerPayout (exact, no rounding drift)
    expect(result.renterTotalAmount).toBe(result.platformFeeAmount + result.ownerPayoutAmount);
  });

  it("preserves financial identity after rounding (total = platformFee + ownerPayout)", () => {
    const result = calculatePricing({
      pricePerDay: 333.33,
      currency: "DKK",
      minRentalDays: 1,
      weeklyDiscountPct: 7,
      startDate: "2026-03-10",
      endDate: "2026-03-17", // 7 days
    });
    expect(result.renterTotalAmount).toBe(result.platformFeeAmount + result.ownerPayoutAmount);
    expect(result.renterTotalAmount).toBeGreaterThan(0);
    expect(result.ownerPayoutAmount).toBeGreaterThan(0);
    expect(result.platformFeeAmount).toBeGreaterThan(0);
  });

  it("applies weekly discount for long rentals", () => {
    const result = calculatePricing({
      pricePerDay: 400,
      currency: "DKK",
      minRentalDays: 1,
      weeklyDiscountPct: 10,
      startDate: "2026-03-10",
      endDate: "2026-03-17", // 7 nights
    });

    expect(result.days).toBe(7);
    expect(result.baseAmount).toBe(2800);
    expect(result.discountPercent).toBe(10);
    expect(result.discountAmount).toBe(280); // 10% of 2800
    expect(result.discountedAmount).toBe(2520);
  });

  it("rejects rentals shorter than minimum", () => {
    expect(() =>
      calculatePricing({
        pricePerDay: 400,
        currency: "DKK",
        minRentalDays: 3,
        startDate: "2026-03-10",
        endDate: "2026-03-11", // 1 night
      })
    ).toThrow(/Minimum rental is 3 day/);
  });

  it("rejects zero or negative daily price", () => {
    expect(() =>
      calculatePricing({
        pricePerDay: 0,
        currency: "DKK",
        minRentalDays: 1,
        startDate: "2026-03-10",
        endDate: "2026-03-11",
      })
    ).toThrow(/Daily price must be greater than 0/);
    expect(() =>
      calculatePricing({
        pricePerDay: -10,
        currency: "DKK",
        minRentalDays: 1,
        startDate: "2026-03-10",
        endDate: "2026-03-11",
      })
    ).toThrow(/Daily price must be greater than 0/);
  });
});

