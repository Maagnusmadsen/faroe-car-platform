/**
 * Client fetch helpers for messaging APIs (no server imports).
 */

export type ConversationListItem = {
  id: string;
  booking: {
    id: string;
    status: string;
    car: {
      id: string;
      brand: string;
      model: string;
      town: string;
      island: string;
    };
  };
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    senderId: string;
    readAt: string | null;
  } | null;
  unreadCount: number;
};

export type ApiMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BookingForMessageContext = {
  id: string;
  status: string;
  renterId: string;
  car: {
    id: string;
    title: string | null;
    brand: string;
    model: string;
    town: string;
    island: string;
    ownerId: string;
  };
  renter?: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

export async function fetchConversations(): Promise<ConversationListItem[]> {
  const res = await fetch("/api/conversations", { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load conversations");
  const json = await res.json();
  return json?.data ?? [];
}

export async function fetchMessages(conversationId: string): Promise<ApiMessage[]> {
  const res = await fetch(
    `/api/messages?conversationId=${encodeURIComponent(conversationId)}`,
    { credentials: "include", cache: "no-store" }
  );
  if (res.status === 403) throw new Error("FORBIDDEN");
  if (!res.ok) throw new Error("Failed to load messages");
  const json = await res.json();
  return json?.data ?? [];
}

export async function sendBookingMessage(bookingId: string, body: string): Promise<ApiMessage> {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ bookingId, body }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = typeof json?.error === "string" ? json.error : "Failed to send";
    throw new Error(err);
  }
  return json.data;
}

/** Resolves a booking the user can access (renter or owner) for labels and status. */
export async function fetchBookingForMessaging(
  bookingId: string
): Promise<BookingForMessageContext | null> {
  const [renterRes, ownerRes] = await Promise.all([
    fetch("/api/bookings?role=renter&pageSize=100", { credentials: "include", cache: "no-store" }),
    fetch("/api/bookings?role=owner&pageSize=100", { credentials: "include", cache: "no-store" }),
  ]);
  const renterJson = renterRes.ok ? await renterRes.json() : {};
  const ownerJson = ownerRes.ok ? await ownerRes.json() : {};
  const items: BookingForMessageContext[] = [
    ...(renterJson?.data?.items ?? []),
    ...(ownerJson?.data?.items ?? []),
  ];
  return items.find((b) => b.id === bookingId) ?? null;
}
