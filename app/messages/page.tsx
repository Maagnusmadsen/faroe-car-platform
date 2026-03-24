"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { fetchConversations, type ConversationListItem } from "@/lib/messages-client";
import { formatMessageListTime } from "@/lib/utils/messages-ui";

function previewText(last: ConversationListItem["lastMessage"], fallback: string): string {
  if (!last?.body) return fallback;
  const t = last.body.trim();
  if (t.length <= 80) return t;
  return `${t.slice(0, 77)}…`;
}

export default function MessagesInboxPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, status } = useAuth();
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/messages");
      return;
    }
    if (status !== "authenticated" || !user) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchConversations()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setError(t("messages.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, user, router, t]);

  if (status === "loading" || (status === "authenticated" && loading && items.length === 0 && !error)) {
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

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-bold text-slate-900">{t("messages.pageTitle")}</h1>

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {!error && items.length === 0 && (
          <div className="mt-10 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-800">{t("messages.inboxEmpty")}</p>
            <p className="mt-2 text-sm text-slate-600">{t("messages.inboxEmptyHint")}</p>
            <Link
              href="/rent-a-car"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              {t("messages.browseCars")}
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {items.map((row) => {
              const car = row.booking.car;
              const title = `${car.brand} ${car.model}`.trim();
              const sub = `${car.town}, ${car.island}`;
              const time =
                row.lastMessage?.createdAt &&
                formatMessageListTime(row.lastMessage.createdAt, "en", t("messages.dayYesterday"));
              return (
                <li key={row.id}>
                  <Link
                    href={`/messages/${row.id}`}
                    className="flex gap-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-slate-900">{title}</p>
                        {time && (
                          <time
                            dateTime={row.lastMessage?.createdAt}
                            className="shrink-0 text-xs text-slate-500"
                          >
                            {time}
                          </time>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {previewText(row.lastMessage, t("messages.previewFallback"))}
                      </p>
                    </div>
                    {row.unreadCount > 0 && (
                      <span className="flex h-6 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-white">
                        {row.unreadCount > 99 ? "99+" : row.unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Footer />
    </main>
  );
}
