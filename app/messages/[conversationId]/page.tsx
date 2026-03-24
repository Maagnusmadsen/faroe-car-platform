"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MessageComposer from "@/components/messages/MessageComposer";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import {
  fetchConversations,
  fetchMessages,
  fetchBookingForMessaging,
  sendBookingMessage,
  type ApiMessage,
  type ConversationListItem,
  type BookingForMessageContext,
} from "@/lib/messages-client";
import {
  groupMessagesByDay,
  formatMessageTimestamp,
  dayHeadingLabel,
} from "@/lib/utils/messages-ui";
import { BOOKING_STATUS_LABELS } from "@/constants/booking-status";

function renterFirstName(renter?: { name: string | null } | null): string {
  const n = renter?.name?.trim();
  if (!n) return "";
  return n.split(/\s+/)[0] ?? "";
}

function senderLabel(
  senderId: string,
  meId: string,
  renterId: string,
  renterName: string,
  t: (k: string) => string
) {
  if (senderId === meId) return t("messages.you");
  if (!renterId) return t("messages.otherParty");
  if (senderId === renterId) return renterName || t("messages.guest");
  return t("messages.host");
}

export default function ConversationThreadPage() {
  const params = useParams();
  const conversationId = typeof params.conversationId === "string" ? params.conversationId : "";
  const router = useRouter();
  const { t } = useLanguage();
  const { user, status } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [conv, setConv] = useState<ConversationListItem | null>(null);
  const [booking, setBooking] = useState<BookingForMessageContext | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadThread = useCallback(async () => {
    if (!conversationId) return;
    setError(null);
    setNotFound(false);
    const convs = await fetchConversations();
    const c = convs.find((x) => x.id === conversationId);
    if (!c) {
      setNotFound(true);
      setConv(null);
      return;
    }
    setConv(c);
    const [msgs, book] = await Promise.all([
      fetchMessages(conversationId),
      fetchBookingForMessaging(c.booking.id),
    ]);
    setMessages(msgs);
    setBooking(book);
  }, [conversationId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(`/messages/${conversationId || ""}`)}`);
      return;
    }
    if (status !== "authenticated" || !user) return;

    if (!conversationId) {
      setNotFound(true);
      setConv(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadThread()
      .catch((e: unknown) => {
        if (!cancelled) {
          if (e instanceof Error && e.message === "FORBIDDEN") {
            setError(t("messages.forbidden"));
          } else {
            setError(t("messages.threadLoadError"));
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, user, conversationId, router, loadThread, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(body: string) {
    if (!conv) return;
    setSendError(null);
    try {
      await sendBookingMessage(conv.booking.id, body);
      const msgs = await fetchMessages(conversationId);
      setMessages(msgs);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : t("messages.threadLoadError"));
    }
  }

  if (status === "loading" || (status === "authenticated" && loading && !error && !notFound)) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <p className="text-slate-500">{t("messages.loading")}</p>
        </div>
        <Footer />
      </main>
    );
  }

  if (!user && status === "unauthenticated") {
    return null;
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <p className="text-slate-800">{t("messages.notFound")}</p>
          <Link href="/messages" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
            {t("messages.backToInbox")}
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  if (error || !conv) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <p className="text-red-600" role="alert">
            {error ?? t("messages.threadLoadError")}
          </p>
          <Link href="/messages" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
            {t("messages.backToInbox")}
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const car = conv.booking.car;
  const title = `${car.brand} ${car.model}`.trim();
  const renterId = booking?.renterId ?? "";
  const guestName = renterFirstName(booking?.renter);
  const groups = groupMessagesByDay(messages);
  const bookingStatusText =
    (booking?.status && BOOKING_STATUS_LABELS[booking.status]) ||
    BOOKING_STATUS_LABELS[conv.booking.status] ||
    conv.booking.status;

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col min-h-0 px-0 sm:px-6">
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:rounded-t-xl sm:border sm:border-b-0 sm:border-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <Link
                href="/messages"
                className="text-sm font-medium text-brand hover:underline"
              >
                ← {t("messages.backToInbox")}
              </Link>
              <h1 className="mt-2 text-lg font-semibold text-slate-900">{title}</h1>
              <p className="text-xs text-slate-500">
                {car.town}, {car.island}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {t("messages.bookingLabel")}: {bookingStatusText}
              </p>
            </div>
            <Link
              href="/bookings"
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              {t("messages.viewBooking")}
            </Link>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col border-slate-200 bg-white sm:border sm:border-t-0 sm:rounded-b-xl">
          {sendError && (
            <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
              {sendError}
            </p>
          )}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {messages.length === 0 && (
              <p className="text-center text-sm text-slate-500">{t("messages.previewFallback")}</p>
            )}
            {groups.map((g) => (
              <div key={g.dayKey} className="mb-6 last:mb-0">
                <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
                  {dayHeadingLabel(g.items[0]?.createdAt ?? "", "en", {
                    today: t("messages.dayToday"),
                    yesterday: t("messages.dayYesterday"),
                  })}
                </p>
                <ul className="space-y-3">
                  {g.items.map((m) => {
                    const mine = user?.id === m.senderId;
                    const label = senderLabel(m.senderId, user?.id ?? "", renterId, guestName, t);
                    return (
                      <li
                        key={m.id}
                        className={`flex flex-col gap-0.5 ${mine ? "items-end" : "items-start"}`}
                      >
                        <span className="text-xs font-medium text-slate-600">{label}</span>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                            mine
                              ? "bg-brand text-white"
                              : "border border-slate-200 bg-slate-50 text-slate-900"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        </div>
                        <time
                          dateTime={m.createdAt}
                          className="text-[11px] text-slate-400"
                        >
                          {formatMessageTimestamp(m.createdAt, "en")}
                        </time>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <MessageComposer
            placeholder={t("messages.placeholder")}
            sendLabel={t("messages.send")}
            sendingLabel={t("messages.sending")}
            onSend={handleSend}
          />
        </div>
      </div>
      <Footer />
    </main>
  );
}
