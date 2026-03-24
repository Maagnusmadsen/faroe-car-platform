"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { openConversationForBooking } from "@/lib/messages-client";
import Link from "next/link";

export default function OpenConversationForBookingPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { status, user } = useAuth();
  const bookingId = typeof params.bookingId === "string" ? params.bookingId : "";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=" + encodeURIComponent(`/messages/booking/${bookingId}`));
      return;
    }
    if (status !== "authenticated" || !user || !bookingId) return;

    let cancelled = false;
    setError(null);
    openConversationForBooking(bookingId)
      .then((conversationId) => {
        if (!cancelled) router.replace(`/messages/${conversationId}`);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("messages.threadLoadError"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status, user, bookingId, router, t]);

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-red-600" role="alert">
            {error}
          </p>
          <Link href="/bookings" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
            {t("messages.viewBooking")}
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-slate-500">
        <p>{t("messages.openingConversation")}</p>
      </div>
      <Footer />
    </main>
  );
}
