import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => {
  return {
    prisma: {
      booking: { findUnique: vi.fn() },
      carReview: {
        findUnique: vi.fn(),
        create: vi.fn(),
        aggregate: vi.fn(),
      },
      userReview: { findUnique: vi.fn(), create: vi.fn() },
      carListing: { update: vi.fn() },
    },
  };
});

import { prisma } from "@/db";
import { createCarReview, createUserReview } from "@/lib/reviews-server";

describe("review eligibility and creation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects invalid rating for car review", async () => {
    (prisma.booking.findUnique as any).mockResolvedValue({
      id: "b1",
      status: "COMPLETED",
      renterId: "renter-1",
      carId: "car-1",
      car: { ownerId: "owner-1" },
    });
    (prisma.carReview.findUnique as any).mockResolvedValue(null);

    await expect(
      createCarReview({
        bookingId: "b1",
        reviewerId: "renter-1",
        rating: 6,
      })
    ).rejects.toThrow(/Rating must be between 1 and 5/);
  });

  it("rejects car review when one already exists for booking", async () => {
    (prisma.booking.findUnique as any).mockResolvedValue({
      id: "b1",
      status: "COMPLETED",
      renterId: "renter-1",
      carId: "car-1",
      car: { ownerId: "owner-1" },
    });
    (prisma.carReview.findUnique as any).mockResolvedValue({ id: "existing" });

    await expect(
      createCarReview({
        bookingId: "b1",
        reviewerId: "renter-1",
        rating: 5,
      })
    ).rejects.toMatchObject({ code: "CAR_REVIEW_ALREADY_EXISTS" });
  });

  it("rejects car review when non-renter tries to review", async () => {
    (prisma.booking.findUnique as any).mockResolvedValue({
      id: "b1",
      status: "COMPLETED",
      renterId: "renter-1",
      carId: "car-1",
      car: { ownerId: "owner-1" },
    });
    (prisma.carReview.findUnique as any).mockResolvedValue(null);

    await expect(
      createCarReview({
        bookingId: "b1",
        reviewerId: "owner-1",
        rating: 5,
      })
    ).rejects.toMatchObject({ code: "ONLY_RENTER_CAN_REVIEW_CAR" });
  });

  it("rejects renter review when non-owner tries to review", async () => {
    (prisma.booking.findUnique as any).mockResolvedValue({
      id: "b1",
      status: "COMPLETED",
      renterId: "renter-1",
      carId: "car-1",
      car: { ownerId: "owner-1" },
    });
    (prisma.userReview.findUnique as any).mockResolvedValue(null);

    await expect(
      createUserReview({
        bookingId: "b1",
        reviewerId: "renter-1",
        rating: 5,
      })
    ).rejects.toMatchObject({ code: "ONLY_OWNER_CAN_REVIEW_RENTER" });
  });
});
