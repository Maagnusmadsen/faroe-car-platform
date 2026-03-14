"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";

type BookingItem = {
  id: string;
  carId: string;
  renterId: string;
  startDate: string;
  endDate: string;
  status: string;
  totalPrice: { toString(): string };
  currency: string;
  hasReviewed?: boolean;
  car: {
    id: string;
    title: string | null;
    brand: string;
    model: string;
    town: string;
    island: string;
    pricePerDay: { toString(): string };
    ownerId: string;
  };
  renter?: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "Pending",
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  PAID: "Paid",
  DISPUTED: "Disputed",
};

export default function BookingsPage() {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"renter" | "owner">("renter");
  const [items, setItems] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace("/login?callbackUrl=/bookings");
      return;
    }
    if (authStatus !== "authenticated" || !user) return;

    let cancelled = false;
    setLoading(true);
    fetch(`/api/bookings?role=${tab}&pageSize=50`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        setItems(json?.data?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load bookings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authStatus, user, tab, router]);

  async function updateStatus(bookingId: string, newStatus: string) {
    setUpdatingId(bookingId);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const effectiveStatus =
          newStatus === "CONFIRMED" ? "PENDING_PAYMENT" : newStatus;
        setItems((prev) =>
          prev.map((b) =>
            b.id === bookingId ? { ...b, status: effectiveStatus } : b
          )
        );
        setError(null);
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json?.error ?? "Failed to update");
      }
    } catch {
      setError("Failed to update");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSubmitReview(bookingId: string) {
    setError(null);
    setReviewSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          rating: reviewRating,
          body: reviewComment.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setReviewingId(null);
        setReviewComment("");
        setReviewRating(5);
        setItems((prev) =>
          prev.map((b) =>
            b.id === bookingId ? { ...b, hasReviewed: true } : b
          )
        );
      } else {
        setError(json?.error ?? "Failed to submit review");
      }
    } catch {
      setError("Failed to submit review");
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function handlePayNow(bookingId: string) {
    setError(null);
    setUpdatingId(bookingId);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.data?.url) {
        window.location.href = json.data.url;
        return;
      }
      setError(json?.error ?? "Could not start payment");
    } catch {
      setError("Could not start payment");
    } finally {
      setUpdatingId(null);
    }
  }

  if (authStatus === "loading" || !user) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-slate-500">Loading…</p>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>

        <div className="mt-6 flex gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTab("renter")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === "renter"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            My requests
          </button>
          <button
            type="button"
            onClick={() => setTab("owner")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === "owner"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Incoming requests
          </button>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-slate-500">Loading bookings…</p>
        ) : items.length === 0 ? (
          <p className="mt-8 text-slate-600">
            {tab === "renter"
              ? "You have no booking requests. "
              : "No incoming requests. "}
            {tab === "renter" && (
              <Link href="/rent-a-car" className="text-emerald-600 hover:underline">
                Browse cars
              </Link>
            )}
          </p>
        ) : (
          <ul className="mt-8 space-y-4">
            {items.map((booking) => {
              const carName =
                booking.car.title?.trim() ||
                `${booking.car.brand} ${booking.car.model}`;
              const start = booking.startDate.slice(0, 10);
              const end = booking.endDate.slice(0, 10);
              const isOwner = tab === "owner";
              const canApprove =
                isOwner && booking.status === "PENDING_APPROVAL";
              const canReject =
                isOwner && booking.status === "PENDING_APPROVAL";
              const canCancel =
                !isOwner &&
                (booking.status === "PENDING_APPROVAL" ||
                  booking.status === "PENDING_PAYMENT");
              const canPay =
                !isOwner && booking.status === "PENDING_PAYMENT";
              const canMarkCompleted =
                isOwner && booking.status === "CONFIRMED";
              const canReview =
                booking.status === "COMPLETED" && !booking.hasReviewed;
              const isUpdating = updatingId === booking.id;
              const isReviewing = reviewingId === booking.id;

              return (
                <li
                  key={booking.id}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{carName}</p>
                    <p className="text-sm text-slate-500">
                      {start} – {end} · {Number(booking.totalPrice).toFixed(0)}{" "}
                      {booking.currency}
                    </p>
                    {isOwner && booking.renter && (
                      <p className="mt-1 text-xs text-slate-600">
                        Request from: {booking.renter.name ?? booking.renter.email ?? "—"}
                      </p>
                    )}
                    <p className="mt-1">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          booking.status === "PENDING_APPROVAL"
                            ? "bg-amber-100 text-amber-800"
                            : booking.status === "PENDING_PAYMENT"
                              ? "bg-sky-100 text-sky-800"
                              : booking.status === "CONFIRMED" || booking.status === "COMPLETED" || booking.status === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : booking.status === "REJECTED" || booking.status === "CANCELLED"
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {STATUS_LABELS[booking.status] ?? booking.status}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Link
                      href={`/rent-a-car/${booking.car.id}`}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View listing
                    </Link>
                    {canPay && (
                      <button
                        type="button"
                        onClick={() => handlePayNow(booking.id)}
                        disabled={isUpdating}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {isUpdating ? "…" : "Pay now"}
                      </button>
                    )}
                    {canApprove && (
                      <button
                        type="button"
                        onClick={() => updateStatus(booking.id, "CONFIRMED")}
                        disabled={isUpdating}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {isUpdating ? "…" : "Approve"}
                      </button>
                    )}
                    {canReject && (
                      <button
                        type="button"
                        onClick={() => updateStatus(booking.id, "REJECTED")}
                        disabled={isUpdating}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {isUpdating ? "…" : "Reject"}
                      </button>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => updateStatus(booking.id, "CANCELLED")}
                        disabled={isUpdating}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {isUpdating ? "…" : "Cancel request"}
                      </button>
                    )}
                    {canMarkCompleted && (
                      <button
                        type="button"
                        onClick={() => updateStatus(booking.id, "COMPLETED")}
                        disabled={isUpdating}
                        className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
                      >
                        {isUpdating ? "…" : "Mark as completed"}
                      </button>
                    )}
                    {canReview && !isReviewing && (
                      <button
                        type="button"
                        onClick={() => setReviewingId(booking.id)}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
                      >
                        Leave review
                      </button>
                    )}
                    {booking.hasReviewed && (
                      <span className="text-xs text-slate-500">Reviewed</span>
                    )}
                  </div>
                  </div>
                  {isReviewing && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="mb-2 text-sm font-medium text-slate-700">
                        Rate this trip
                      </p>
                      <div className="mb-3 flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="text-2xl leading-none text-amber-400 focus:outline-none"
                            aria-label={`${star} stars`}
                          >
                            {reviewRating >= star ? "★" : "☆"}
                          </button>
                        ))}
                      </div>
                      <textarea
                        placeholder="Comment (optional)"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSubmitReview(booking.id)}
                          disabled={reviewSubmitting}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {reviewSubmitting ? "Submitting…" : "Submit review"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingId(null);
                            setReviewComment("");
                            setReviewRating(5);
                          }}
                          disabled={reviewSubmitting}
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
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
