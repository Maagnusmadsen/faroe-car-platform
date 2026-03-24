"use client";

import { useState, useEffect } from "react";

const TEMPLATES = [
  { value: "user.welcome", label: "Welcome (ny bruger)" },
  { value: "booking.requested", label: "Booking requested (til bilist)" },
  { value: "booking.approved", label: "Booking approved (til lejer)" },
  { value: "booking.rejected", label: "Booking rejected (til lejer)" },
  { value: "booking.confirmed", label: "Booking confirmed (til lejer)" },
  { value: "booking.cancelled", label: "Booking cancelled" },
  { value: "booking.reminder", label: "Trip reminder" },
  { value: "payment.received", label: "Payment received (til bilist)" },
  { value: "payment.receipt", label: "Payment receipt (til lejer)" },
  { value: "payout.sent", label: "Payout sent" },
  { value: "payout.failed", label: "Payout failed" },
  { value: "message.received", label: "New message (in-app only; preview)" },
  { value: "review.requested", label: "Review requested" },
];

export default function EmailPreviewPage() {
  const [event, setEvent] = useState("user.welcome");
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setHtml(null);
    fetch(`/api/admin/email-preview?event=${encodeURIComponent(event)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.text();
      })
      .then(setHtml)
      .catch((e) => setError(e.message));
  }, [event]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Email preview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Se hvordan de udgående mails ser ud (booking, betaling, osv.)
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          Template:
          <select
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {TEMPLATES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
          Preview – samme design som i rigtige mails
        </div>
        <div className="min-h-[500px] overflow-auto bg-slate-100 p-6">
          {html ? (
            <iframe
              srcDoc={html}
              title="Email preview"
              className="h-[600px] w-full max-w-2xl rounded-lg border-0 bg-white shadow"
              sandbox="allow-same-origin"
            />
          ) : !error ? (
            <div className="flex h-64 items-center justify-center text-slate-400">
              Indlæser…
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
