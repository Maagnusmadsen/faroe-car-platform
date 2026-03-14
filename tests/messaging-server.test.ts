import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => {
  return {
    prisma: {
      booking: {
        findUnique: vi.fn(),
      },
      conversation: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      conversationParticipant: {
        findMany: vi.fn(),
      },
      message: {
        create: vi.fn(),
      },
    },
  };
});

import { prisma } from "@/db";
import { sendMessageForBooking } from "@/lib/messaging-server";

describe("messaging access control", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects non-participants", async () => {
    (prisma.booking.findUnique as any).mockResolvedValue({
      id: "b1",
      renterId: "renter-1",
      car: { ownerId: "owner-1" },
    });
    await expect(
      sendMessageForBooking({
        bookingId: "b1",
        senderId: "other-user",
        body: "Hello",
      })
    ).rejects.toMatchObject({
      code: "NOT_CONVERSATION_PARTICIPANT",
    });
  });

  it("allows renter to send message", async () => {
    (prisma.booking.findUnique as any).mockResolvedValue({
      id: "b1",
      renterId: "renter-1",
      car: { ownerId: "owner-1" },
    });
    (prisma.conversation.findUnique as any).mockResolvedValue({
      id: "c1",
    });
    (prisma.message.create as any).mockResolvedValue({
      id: "m1",
      conversationId: "c1",
      senderId: "renter-1",
      body: "Hello",
    });
    (prisma.conversationParticipant.findMany as any).mockResolvedValue([
      { userId: "renter-1" },
      { userId: "owner-1" },
    ]);

    const msg = await sendMessageForBooking({
      bookingId: "b1",
      senderId: "renter-1",
      body: "Hello",
    });
    expect(msg).toMatchObject({
      id: "m1",
      senderId: "renter-1",
      body: "Hello",
    });
  });
});

