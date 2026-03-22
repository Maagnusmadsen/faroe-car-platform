"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type PreferenceItem = {
  eventType: string;
  channel: "EMAIL" | "IN_APP";
  enabled: boolean;
};

const EVENT_LABELS: Record<string, string> = {
  "booking.requested": "notificationPrefs.bookingRequested",
  "booking.reminder": "notificationPrefs.bookingReminder",
  "message.received": "notificationPrefs.messageReceived",
  "review.requested": "notificationPrefs.reviewRequested",
  "listing.published": "notificationPrefs.listingPublished",
  "trip.started": "notificationPrefs.tripStarted",
  "trip.ended": "notificationPrefs.tripEnded",
};

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: "notificationPrefs.channelEmail",
  IN_APP: "notificationPrefs.channelInApp",
};

function prefKey(p: PreferenceItem) {
  return `${p.eventType}:${p.channel}`;
}

export default function NotificationPreferencesPage() {
  const { t } = useLanguage();
  const { user: sessionUser, status } = useAuth();
  const [preferences, setPreferences] = useState<PreferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/notifications/preferences");
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setPreferences(json.data?.preferences ?? []);
    } catch {
      setError("Failed to load preferences");
      setPreferences([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !sessionUser) return;
    fetchPreferences();
  }, [status, sessionUser, fetchPreferences]);

  function togglePref(eventType: string, channel: "EMAIL" | "IN_APP", enabled: boolean) {
    setPreferences((prev) =>
      prev.map((p) =>
        p.eventType === eventType && p.channel === channel ? { ...p, enabled } : p
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: preferences.map((p) => ({
            eventType: p.eventType,
            channel: p.channel,
            enabled: p.enabled,
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: json?.error ?? t("notificationPrefs.saveError") });
        setSaving(false);
        return;
      }
      setMessage({ type: "success", text: t("notificationPrefs.saveSuccess") });
    } catch {
      setMessage({ type: "error", text: t("notificationPrefs.saveError") });
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <section className="mx-auto max-w-lg px-4 py-16 text-center text-slate-500">
          {t("notificationPrefs.loading")}
        </section>
        <Footer />
      </main>
    );
  }

  if (!sessionUser) {
    return null;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <section className="mx-auto max-w-lg px-4 py-10">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm text-red-800">{error}</p>
            <button
              type="button"
              onClick={fetchPreferences}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
          <Link
            href="/profile"
            className="mt-6 inline-block text-sm font-medium text-brand hover:underline"
          >
            {t("notificationPrefs.backToProfile")}
          </Link>
        </section>
        <Footer />
      </main>
    );
  }

  const grouped = preferences.reduce(
    (acc, p) => {
      const key = p.eventType;
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    },
    {} as Record<string, PreferenceItem[]>
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <section className="mx-auto max-w-lg px-4 py-10 sm:py-12">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5 sm:px-8 sm:py-6">
            <h1 className="text-2xl font-bold text-slate-900">{t("notificationPrefs.title")}</h1>
            <p className="mt-1 text-sm text-slate-600">{t("notificationPrefs.subtitle")}</p>
          </div>

          <div className="px-6 py-5 sm:px-8 sm:py-6">
            {message && (
              <div
                className={`mb-5 rounded-lg px-4 py-3 text-sm ${
                  message.type === "success" ? "bg-brand-light text-slate-800" : "bg-red-50 text-red-800"
                }`}
                role="alert"
              >
                {message.text}
              </div>
            )}

            {preferences.length === 0 ? (
              <p className="text-slate-500">{t("notificationPrefs.empty")}</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(grouped).map(([eventType, items]) => (
                  <div
                    key={eventType}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">
                        {t(EVENT_LABELS[eventType] ?? eventType)}
                      </p>
                      {items.length > 1 && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {items.map((i) => t(CHANNEL_LABELS[i.channel])).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {items.map((p) => (
                        <label
                          key={prefKey(p)}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          {items.length > 1 && (
                            <span className="text-sm text-slate-600">
                              {t(CHANNEL_LABELS[p.channel])}
                            </span>
                          )}
                          <span
                            role="switch"
                            aria-checked={p.enabled}
                            tabIndex={0}
                            onClick={() => togglePref(p.eventType, p.channel, !p.enabled)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                togglePref(p.eventType, p.channel, !p.enabled);
                              }
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
                              p.enabled ? "bg-brand" : "bg-slate-200"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                                p.enabled ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {preferences.length > 0 && (
              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                >
                  {saving ? "…" : "Save"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <Link
            href="/profile"
            className="text-sm font-medium text-brand hover:underline"
          >
            {t("notificationPrefs.backToProfile")}
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
