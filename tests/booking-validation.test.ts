import { describe, it, expect } from "vitest";
import { bookingCreateSchema } from "@/validation/schemas/booking";

describe("booking validation", () => {
  it("rejects endDate before or equal to startDate", () => {
    const invalid = bookingCreateSchema.safeParse({
      listingId: "listing-1",
      startDate: "2026-03-15",
      endDate: "2026-03-10",
    });
    expect(invalid.success).toBe(false);

    const sameDay = bookingCreateSchema.safeParse({
      listingId: "listing-1",
      startDate: "2026-03-10",
      endDate: "2026-03-10",
    });
    expect(sameDay.success).toBe(false);
  });

  it("accepts valid date range", () => {
    const valid = bookingCreateSchema.safeParse({
      listingId: "listing-1",
      startDate: "2026-03-10",
      endDate: "2026-03-15",
    });
    expect(valid.success).toBe(true);
  });
});
