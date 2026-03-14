import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => {
  return {
    prisma: {
      booking: {
        findUnique: vi.fn(),
      },
      review: {
        findFirst: vi.fn(),
        create: vi.fn(),
        aggregate: vi.fn(),
      },
      carListing: {
        update: vi.fn(),
      },
    },
  };
});

import { prisma } from "@/db";
import { createReviewForBooking } from "@/lib/reviews-server";

describe("review eligibility and creation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects invalid rating", async () => {
    await expect(
      createReviewForBooking({
        bookingId: "b1",
        reviewerId: "u1",
        rating: 6,
      })
    ).rejects.toThrow(/Rating must be between 1 and 5/);
  });

  it("rejects duplicate review by same user", async () => {
    (prisma.booking.findUnique as any).mockResolvedValue({
      id: "b1",
      status: "COMPLETED",
      renterId: "renter-1",
      carId: "car-1",
      car: { ownerId: "owner-1" },
    });
    (prisma.review.findFirst as any).mockResolvedValue({ id: "existing" });

    await expect(
      createReviewForBooking({
        bookingId: "b1",
        reviewerId: "renter-1",
        rating: 5,
      })
    ).rejects.toMatchObject({ code: "REVIEW_ALREADY_EXISTS" });
  });
});

