/**
 * Client fetch helpers for messaging APIs (no server imports).
 */

export type ConversationListItem = {
  id: string;
  booking: {
    id: string;
    status: string;
    renterId: string;
    renter: { name: string | null } | null;
    car: {
      id: string;
      brand: string;
      model: string;
      town: string;
      island: string;
      ownerId: string;
      owner: { name: string | null } | null;
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
  counterpartyName: string | null;
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
    owner: { id: string; name: string | null } | null;
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

/** Single booking for the current user (renter or owner); includes owner + renter names. */
export async function fetchBookingById(bookingId: string): Promise<BookingForMessageContext | null> {
  const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? null;
}

export async function openConversationForBooking(bookingId: string): Promise<string> {
  const res = await fetch("/api/conversations/ensure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ bookingId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = typeof json?.error === "string" ? json.error : "Failed to open conversation";
    throw new Error(err);
  }
  return json.data.conversationId as string;
}
