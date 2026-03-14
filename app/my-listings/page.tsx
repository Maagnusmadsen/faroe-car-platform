"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";

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

export default function MyListingsPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(() => {
    if (status !== "authenticated" || !user) return;
    setError(null);
    fetch("/api/owner/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        setListings(json?.data?.listings ?? []);
        setStripeConnected(!!json?.data?.stripeConnected);
      })
      .catch(() => setError("Failed to load listings"))
      .finally(() => setLoading(false));
  }, [status, user]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status !== "authenticated" || !user) return;
    setLoading(true);
    fetchListings();
  }, [status, user, router, fetchListings]);

  // Refetch when user returns to this tab (e.g. after creating a listing in another tab)
  useEffect(() => {
    const onFocus = () => {
      if (status === "authenticated" && user) fetchListings();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [status, user, fetchListings]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setListings((prev) => prev.filter((l) => l.id !== id));
      } else {
        setError("Failed to delete listing");
      }
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
      setError(json?.error ?? "Could not start Stripe setup");
    } catch {
      setError("Could not start Stripe setup");
    } finally {
      setConnectLoading(false);
    }
  }

  if (status === "loading" || (user && loading)) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-slate-500">Loading your listings…</p>
        </div>
        <Footer />
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">My listings</h1>
          <button
            type="button"
            onClick={() => { setLoading(true); fetchListings(); }}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {!stripeConnected && listings.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-sm text-sky-800">
              Connect Stripe to receive payouts when renters pay for bookings. Same system as Gomore and Turo.
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

        {stripeConnected && (
          <p className="mt-4 text-sm text-emerald-600">
            Stripe connected – you can receive payouts from bookings.
          </p>
        )}

        {listings.length === 0 && !loading && (
          <p className="mt-8 text-slate-600">
            You have no listings yet.
          </p>
        )}

        <ul className="mt-8 space-y-4">
          {listings.map((listing) => {
            const displayName =
              listing.title?.trim() ||
              (listing.status === "DRAFT" ? "Untitled draft" : `${listing.brand} ${listing.model}`);
            const typeLabel =
              listing.listingType === "ride_share" ? "Ride share" : "Car rental";
            const priceDisplay =
              listing.status === "DRAFT" && Number(listing.pricePerDay) === 0
                ? "—"
                : `${Number(listing.pricePerDay).toFixed(0)} DKK/day`;
            return (
              <li
                key={listing.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{displayName}</p>
                  <p className="text-sm text-slate-500">
                    {typeLabel} · {listing.town}, {listing.island} ·{" "}
                    {priceDisplay} ·{" "}
                    <span
                      className={
                        listing.status === "ACTIVE"
                          ? "text-emerald-600"
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
                    onClick={() => handleDelete(listing.id)}
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
      </div>
      <Footer />
    </main>
  );
}
