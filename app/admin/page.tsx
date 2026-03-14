"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";

type Tab = "users" | "listings" | "bookings";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
};

type ListingRow = {
  id: string;
  brand: string;
  model: string;
  town: string;
  island: string;
  status: string;
  owner: { id: string; email: string; name: string | null };
  createdAt: string;
};

type BookingRow = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  totalPrice: { toString(): string };
  currency: string;
  car: {
    id: string;
    title: string | null;
    brand: string;
    model: string;
    town: string;
    island: string;
    status: string;
    ownerId: string;
    owner: { id: string; email: string; name: string | null };
  };
  renter: { id: string; email: string; name: string | null };
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "Pending",
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  DISPUTED: "Disputed",
};

export default function AdminPage() {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [bookingsData, setBookingsData] = useState<{
    items: BookingRow[];
    total: number;
    page: number;
    pageSize: number;
  }>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [updatingListingId, setUpdatingListingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (!res.ok) throw new Error("Failed to load users");
    const json = await res.json();
    setUsers(json?.data ?? []);
  }, []);

  const fetchListings = useCallback(async () => {
    const res = await fetch("/api/admin/listings");
    if (!res.ok) throw new Error("Failed to load listings");
    const json = await res.json();
    setListings(json?.data ?? []);
  }, []);

  const fetchBookings = useCallback(async (page = 1) => {
    const res = await fetch(`/api/admin/bookings?page=${page}&pageSize=20`);
    if (!res.ok) throw new Error("Failed to load bookings");
    const json = await res.json();
    setBookingsData({
      items: json?.data?.items ?? [],
      total: json?.data?.total ?? 0,
      page: json?.data?.page ?? 1,
      pageSize: json?.data?.pageSize ?? 20,
    });
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace("/login?callbackUrl=/admin");
      return;
    }
    if (authStatus !== "authenticated" || !user) return;
    if (user.role !== "ADMIN") {
      router.replace("/");
      return;
    }

    setError(null);
    setLoading(true);
    const load = async () => {
      try {
        if (tab === "users") await fetchUsers();
        else if (tab === "listings") await fetchListings();
        else await fetchBookings();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authStatus, user, router, tab, fetchUsers, fetchListings, fetchBookings]);

  async function setListingStatus(listingId: string, newStatus: "ACTIVE" | "PAUSED") {
    setUpdatingListingId(listingId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setListings((prev) =>
          prev.map((l) => (l.id === listingId ? { ...l, status: newStatus } : l))
        );
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json?.error ?? "Failed to update");
      }
    } catch {
      setError("Failed to update");
    } finally {
      setUpdatingListingId(null);
    }
  }

  if (authStatus === "loading" || !user) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-slate-500">Loading…</p>
        </div>
        <Footer />
      </main>
    );
  }

  if (user.role !== "ADMIN") {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-900">Admin</h1>

        <div className="mt-6 flex gap-2 border-b border-slate-200">
          {(["users", "listings", "bookings"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-slate-500">Loading…</p>
        ) : tab === "users" ? (
          <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Email</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Name</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Role</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-900">{u.email}</td>
                    <td className="px-4 py-3 text-slate-600">{u.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.role === "ADMIN" ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="px-4 py-8 text-center text-slate-500">No users</p>
            )}
          </div>
        ) : tab === "listings" ? (
          <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Car</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Location</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Owner</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/rent-a-car/${l.id}`}
                        className="font-medium text-emerald-600 hover:underline"
                      >
                        {l.brand} {l.model}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {l.town}, {l.island}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          l.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : l.status === "PAUSED"
                              ? "bg-amber-100 text-amber-800"
                              : l.status === "REJECTED"
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {l.owner?.name ?? l.owner?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {l.status === "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() => setListingStatus(l.id, "PAUSED")}
                          disabled={updatingListingId === l.id}
                          className="rounded border border-amber-200 bg-white px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                        >
                          {updatingListingId === l.id ? "…" : "Deactivate"}
                        </button>
                      )}
                      {(l.status === "PAUSED" || l.status === "REJECTED") && (
                        <button
                          type="button"
                          onClick={() => setListingStatus(l.id, "ACTIVE")}
                          disabled={updatingListingId === l.id}
                          className="rounded border border-emerald-200 bg-white px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {updatingListingId === l.id ? "…" : "Reactivate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {listings.length === 0 && (
              <p className="px-4 py-8 text-center text-slate-500">No listings</p>
            )}
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-slate-600">
              {bookingsData.total} booking{bookingsData.total !== 1 ? "s" : ""}
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-700">Car</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Renter</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Dates</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingsData.items.map((b) => (
                    <tr key={b.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`/rent-a-car/${b.car.id}`}
                          className="font-medium text-emerald-600 hover:underline"
                        >
                          {b.car.brand} {b.car.model}
                        </Link>
                        <span className="ml-1 text-slate-500">
                          ({b.car.owner?.name ?? b.car.owner?.email ?? "—"})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {b.renter?.name ?? b.renter?.email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {b.startDate?.slice(0, 10)} – {b.endDate?.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            b.status === "COMPLETED" || b.status === "CONFIRMED"
                              ? "bg-emerald-100 text-emerald-800"
                              : b.status === "PENDING_APPROVAL" || b.status === "PENDING_PAYMENT"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {STATUS_LABELS[b.status] ?? b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {Number(b.totalPrice).toFixed(0)} {b.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bookingsData.items.length === 0 && (
                <p className="px-4 py-8 text-center text-slate-500">No bookings</p>
              )}
            </div>
            {bookingsData.total > bookingsData.pageSize && (
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchBookings(bookingsData.page - 1)}
                  disabled={bookingsData.page <= 1}
                  className="rounded border border-slate-200 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="py-1 text-sm text-slate-600">
                  Page {bookingsData.page} of {Math.ceil(bookingsData.total / bookingsData.pageSize)}
                </span>
                <button
                  type="button"
                  onClick={() => fetchBookings(bookingsData.page + 1)}
                  disabled={bookingsData.page * bookingsData.pageSize >= bookingsData.total}
                  className="rounded border border-slate-200 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
