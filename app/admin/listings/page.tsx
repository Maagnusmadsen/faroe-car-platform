"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import StatusBadge from "@/components/admin/StatusBadge";
import { formatPrice } from "@/lib/utils/price";

type ListingRow = {
  id: string;
  brand: string;
  model: string;
  year: number;
  town: string;
  island: string;
  status: string;
  pricePerDay: number;
  owner: { id: string; email: string; name: string | null };
  createdAt: string;
  bookingCount: number;
};

type ListingsResponse = {
  items: ListingRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export default function AdminListingsPage() {
  const [data, setData] = useState<ListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const statusFilter = searchParams.get("status") ?? "all";

  const fetchListings = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/listings?${params}`);
      if (!res.ok) throw new Error("Failed to load listings");
      const json = await res.json();
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  async function setStatus(listingId: string, newStatus: "ACTIVE" | "PAUSED") {
    setUpdatingId(listingId);
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchListings();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Listings</h1>
          <p className="mt-1 text-sm text-slate-500">All car listings</p>
        </div>
        <div className="flex gap-2">
          {(["all", "ACTIVE", "DRAFT", "PAUSED", "REJECTED"] as const).map((s) => (
            <Link
              key={s}
              href={`/admin/listings?status=${s}${page > 1 ? `&page=${page}` : ""}`}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                statusFilter === s
                  ? "bg-brand text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "all" ? "All" : s === "DRAFT" ? "Draft" : s === "ACTIVE" ? "Active" : s === "PAUSED" ? "Paused" : "Rejected"}
            </Link>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-slate-500">Loading…</p>
      ) : data ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Car</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Location</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Price</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Owner</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Bookings</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/rent-a-car/${l.id}`}
                        className="font-medium text-brand hover:underline"
                      >
                        {l.brand} {l.model} ({l.year})
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {l.town}, {l.island}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatPrice(l.pricePerDay, { perDay: true })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {l.owner?.name ?? l.owner?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.bookingCount}</td>
                    <td className="px-4 py-3">
                      {l.status === "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() => setStatus(l.id, "PAUSED")}
                          disabled={updatingId === l.id}
                          className="rounded border border-amber-200 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                        >
                          {updatingId === l.id ? "…" : "Deactivate"}
                        </button>
                      )}
                      {(l.status === "PAUSED" || l.status === "REJECTED") && (
                        <button
                          type="button"
                          onClick={() => setStatus(l.id, "ACTIVE")}
                          disabled={updatingId === l.id}
                          className="rounded border border-brand/30 px-2 py-1 text-xs font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
                        >
                          {updatingId === l.id ? "…" : "Reactivate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.items.length === 0 && (
            <p className="py-8 text-center text-slate-500">No listings found</p>
          )}

          {data.total > data.pageSize && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing {(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <Link
                  href={page > 1 ? `/admin/listings?status=${statusFilter}&page=${page - 1}` : "#"}
                  className={`rounded border px-3 py-1 text-sm ${page <= 1 ? "cursor-not-allowed border-slate-100 text-slate-400" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                >
                  Previous
                </Link>
                <Link
                  href={data.hasMore ? `/admin/listings?status=${statusFilter}&page=${page + 1}` : "#"}
                  className={`rounded border px-3 py-1 text-sm ${!data.hasMore ? "cursor-not-allowed border-slate-100 text-slate-400" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                >
                  Next
                </Link>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
