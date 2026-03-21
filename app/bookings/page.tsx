"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { BOOKING_STATUS_LABELS } from "@/constants/booking-status";
import { formatPrice } from "@/lib/utils/price";

type BookingItem = {
  id: string;
  carId: string;
  renterId: string;
  startDate: string;
  endDate: string;
  status: string;
  totalPrice: { toString(): string };
  currency: string;
  hasCarReviewed?: boolean;
  hasRenterReviewed?: boolean;
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

type ListingRow = {
  id: string;
  title: string | null;
  listingType: string;
  brand: string;
  model: string;
  status: string;
  pricePerDay: { toString(): string };
  town: string;
  island: string;
  reviewCount: number;
  ratingAvg: { toString(): string } | null;
  createdAt: string;
  updatedAt: string;
};

function friendlyConnectError(raw: string | undefined): string {
  if (!raw) return "Could not start payment setup.";
  if (/connect|signed up/i.test(raw)) return "Payment setup is being configured. Please try again in a moment.";
  return raw;
}

function BookingsContent() {
  const { t } = useLanguage();
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get("payment") === "success";
  const paymentCancelled = searchParams.get("payment") === "cancelled";
  const stripeSuccess = searchParams.get("stripe") === "success";
  const publishedParam = searchParams.get("published") === "1";

  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "listings" ? "listings" : tabParam === "owner" ? "owner" : "renter";
  const [tab, setTab] = useState<"renter" | "owner" | "listings">(initialTab);

  const [items, setItems] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [listings, setListings] = useState<ListingRow[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  const setTabAndUrl = (newTab: "renter" | "owner" | "listings") => {
    setTab(newTab);
    setError(null);
    const url = newTab === "renter" ? "/bookings" : `/bookings?tab=${newTab}`;
    router.replace(url, { scroll: false });
  };

  useEffect(() => {
    if (tabParam === "listings" && tab !== "listings") setTab("listings");
    if (tabParam === "owner" && tab !== "owner") setTab("owner");
    if (!tabParam && tab !== "renter") setTab("renter");
  }, [tabParam]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace("/login?callbackUrl=/bookings");
      return;
    }
    if (authStatus !== "authenticated" || !user) return;
    if (tab === "listings") return;

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

  const fetchListings = useCallback(() => {
    if (authStatus !== "authenticated" || !user) return;
    setError(null);
    setListingsLoading(true);
    fetch("/api/owner/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        setListings(json?.data?.listings ?? []);
        setStripeConnected(!!json?.data?.stripeConnected);
      })
      .catch(() => setError("Failed to load listings"))
      .finally(() => setListingsLoading(false));
  }, [authStatus, user]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !user || tab !== "listings") return;
    fetchListings();
  }, [tab, authStatus, user, fetchListings]);

  useEffect(() => {
    if (tab === "listings" && authStatus === "authenticated" && user) {
      const onFocus = () => fetchListings();
      window.addEventListener("focus", onFocus);
      return () => window.removeEventListener("focus", onFocus);
    }
  }, [tab, authStatus, user, fetchListings]);

  async function handleDeleteListing(id: string) {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (res.ok) setListings((prev) => prev.filter((l) => l.id !== id));
      else setError("Failed to delete listing");
    } catch {
      setError("Failed to delete listing");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleConnectStripe() {
    setError(null);
    setConnectLoading(true);
    try {
      const res = await fetch("/api/stripe/connect/onboard", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.data?.url) {
        window.location.href = json.data.url;
        return;
      }
      setError(friendlyConnectError(json?.error));
    } catch {
      setError("Could not start payment setup.");
    } finally {
      setConnectLoading(false);
    }
  }

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
      const reviewType = tab === "renter" ? "car" : "renter";
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          type: reviewType,
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setReviewingId(null);
        setReviewComment("");
        setReviewRating(5);
        setItems((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  ...(reviewType === "car"
                    ? { hasCarReviewed: true }
                    : { hasRenterReviewed: true }),
                }
              : b
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
        <h1 className="text-2xl font-bold text-slate-900">{t("bookings.pageTitle")}</h1>

        <div className="mt-6 flex gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTabAndUrl("renter")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === "renter"
                ? "border-brand text-brand"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("bookings.tabMyRequests")}
          </button>
          <button
            type="button"
            onClick={() => setTabAndUrl("owner")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === "owner"
                ? "border-brand text-brand"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("bookings.tabIncoming")}
          </button>
          <button
            type="button"
            onClick={() => setTabAndUrl("listings")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === "listings"
                ? "border-brand text-brand"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("bookings.tabMyListings")}
          </button>
        </div>

        {tab !== "listings" && (
          <p className="mt-3 text-sm text-slate-600">
            <Link href="/cancellation" className="text-brand hover:underline">
              {t("cancellation.needToCancel")} {t("cancellation.linkText")}
            </Link>
          </p>
        )}

        {paymentSuccess && (
          <div
            className="mt-6 rounded-2xl border border-brand/30 bg-brand-light p-6"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-2xl text-white" aria-hidden>
                ✓
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {t("rent.bookingConfirmedTitle")}
                </h2>
                <p className="mt-2 text-slate-800">
                  {t("rent.bookingConfirmedMessage")}
                </p>
                <button
                  type="button"
                  onClick={() => router.replace("/bookings", { scroll: false })}
                  className="mt-4 text-sm font-medium text-brand underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {paymentCancelled && !paymentSuccess && (
          <div
            className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4"
            role="status"
          >
            <p className="text-sm text-amber-800">
              {t("rent.paymentCancelled")}
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {tab === "listings" && (
          <>
            {stripeSuccess && (
              <p className="mt-4 rounded-lg border border-brand/30 bg-brand-light px-4 py-2 text-sm text-slate-800" role="status">
                Bank account connected. You can now receive payouts when someone books your car.
              </p>
            )}
            {publishedParam && !stripeSuccess && (
              <p className="mt-4 rounded-lg border border-brand/30 bg-brand-light px-4 py-2 text-sm text-slate-800" role="status">
                Your listing is live. Connect your bank below to get paid when someone books.
              </p>
            )}
            {!stripeConnected && listings.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
                <p className="text-sm text-sky-800">
                  Get paid when someone books – connect your bank (about 1 min).
                </p>
                <button
                  type="button"
                  onClick={handleConnectStripe}
                  disabled={connectLoading}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {connectLoading ? "Redirecting…" : "Connect with Stripe"}
                </button>
              </div>
            )}
            {stripeConnected && listings.length > 0 && (
              <p className="mt-4 text-sm text-brand">
                Bank connected – you can receive payouts from bookings.
              </p>
            )}
            {listingsLoading ? (
              <p className="mt-8 text-slate-500">Loading your listings…</p>
            ) : listings.length === 0 ? (
              <p className="mt-8 text-slate-600">{t("bookings.noListings")}</p>
            ) : (
              <ul className="mt-8 space-y-4">
                {listings.map((listing) => {
                  const displayName =
                    listing.title?.trim() ||
                    (listing.status === "DRAFT" ? "Untitled draft" : `${listing.brand} ${listing.model}`);
                  const typeLabel = listing.listingType === "ride_share" ? "Ride share" : "Car rental";
                  const priceDisplay =
                    listing.status === "DRAFT" && Number(listing.pricePerDay) === 0
                      ? "—"
                      : formatPrice(Number(listing.pricePerDay), { perDay: true });
                  return (
                    <li
                      key={listing.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{displayName}</p>
                        <p className="text-sm text-slate-500">
                          {typeLabel} · {listing.town}, {listing.island} · {priceDisplay} ·{" "}
                          <span
                            className={
                              listing.status === "ACTIVE"
                                ? "text-brand"
                                : listing.status === "DRAFT"
                                  ? "text-amber-600"
                                  : "text-slate-500"
                            }
                          >
                            {listing.status}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        {listing.status === "ACTIVE" && (
                          <Link
                            href={`/rent-a-car/${listing.id}`}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </Link>
                        )}
                        <Link
                          href={`/list-your-car?draft=${listing.id}`}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteListing(listing.id)}
                          disabled={deletingId === listing.id}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === listing.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {tab !== "listings" && (
          <>
            {loading ? (
              <p className="mt-8 text-slate-500">Loading bookings…</p>
            ) : items.length === 0 ? (
              <p className="mt-8 text-slate-600">
                {tab === "renter"
                  ? t("bookings.noRequestsRenter")
                  : t("bookings.noRequestsOwner")}{" "}
                {tab === "renter" && (
                  <Link href="/rent-a-car" className="text-brand hover:underline">
                    {t("bookings.browseCars")}
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
              const canReviewCar =
                !isOwner &&
                booking.status === "COMPLETED" &&
                !booking.hasCarReviewed;
              const canReviewRenter =
                isOwner &&
                booking.status === "COMPLETED" &&
                !booking.hasRenterReviewed;
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
                                ? "bg-brand-light text-slate-800"
                                : booking.status === "REJECTED" || booking.status === "CANCELLED"
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
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
                        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                      >
                        {isUpdating ? "…" : "Pay now"}
                      </button>
                    )}
                    {canApprove && (
                      <button
                        type="button"
                        onClick={() => updateStatus(booking.id, "CONFIRMED")}
                        disabled={isUpdating}
                        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
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
                    {canReviewCar && !isReviewing && (
                      <button
                        type="button"
                        onClick={() => setReviewingId(booking.id)}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
                      >
                        Review car
                      </button>
                    )}
                    {canReviewRenter && !isReviewing && (
                      <button
                        type="button"
                        onClick={() => setReviewingId(booking.id)}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
                      >
                        Review renter
                      </button>
                    )}
                    {booking.hasCarReviewed && !isOwner && (
                      <span className="text-xs text-slate-500">Car reviewed</span>
                    )}
                    {booking.hasRenterReviewed && isOwner && (
                      <span className="text-xs text-slate-500">Renter reviewed</span>
                    )}
                  </div>
                  </div>
                  {isReviewing && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="mb-2 text-sm font-medium text-slate-700">
                        {tab === "renter"
                          ? "Rate the car and your trip"
                          : "Rate the renter"}
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
                          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
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
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50">Loading…</div>}>
      <BookingsContent />
    </Suspense>
  );
}
