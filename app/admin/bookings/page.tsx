"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import StatusBadge from "@/components/admin/StatusBadge";
import { BOOKING_STATUS_LABELS } from "@/constants/booking-status";
import { formatCurrency } from "@/lib/utils/price";

type BookingRow = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  totalPrice: { toString(): string };
  currency: string;
  platformFeeAmount: { toString(): string };
  ownerPayoutAmount: { toString(): string };
  car: {
    id: string;
    brand: string;
    model: string;
    owner: { email: string; name: string | null };
  };
  renter: { email: string; name: string | null };
};

type BookingsResponse = {
  items: BookingRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  summary?: Record<string, number>;
};

export default function AdminBookingsPage() {
  const [data, setData] = useState<BookingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const statusFilter = searchParams.get("status") ?? "all";

  const fetchBookings = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/bookings?${params}`);
      if (!res.ok) throw new Error("Failed to load bookings");
      const json = await res.json();
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const statuses = ["all", "COMPLETED", "CONFIRMED", "PAID", "PENDING_PAYMENT", "PENDING_APPROVAL", "CANCELLED", "DISPUTED"] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
          <p className="mt-1 text-sm text-slate-500">All platform bookings</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <Link
              key={s}
              href={`/admin/bookings?status=${s}${page > 1 ? `&page=${page}` : ""}`}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                statusFilter === s ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "all" ? "All" : BOOKING_STATUS_LABELS[s] ?? s}
            </Link>
          ))}
        </div>
      </div>

      {data?.summary && (
        <div className="flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <span className="text-sm text-slate-600">
            Total: <strong className="text-slate-900">{data.total}</strong>
          </span>
          {Object.entries(data.summary).map(([status, count]) => (
            <span key={status} className="text-sm text-slate-600">
              {(BOOKING_STATUS_LABELS as Record<string, string>)[status] ?? status}: <strong>{count}</strong>
            </span>
          ))}
        </div>
      )}

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
                  <th className="px-4 py-3 font-medium text-slate-700">Renter</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Owner</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Dates</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Total</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Platform fee</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Owner payout</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/rent-a-car/${b.car.id}`}
                        className="font-medium text-brand hover:underline"
                      >
                        {b.car.brand} {b.car.model}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {b.renter?.name ?? b.renter?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {b.car.owner?.name ?? b.car.owner?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {b.startDate?.slice(0, 10)} – {b.endDate?.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatCurrency(Number(b.totalPrice), b.currency)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatCurrency(Number(b.platformFeeAmount), b.currency)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatCurrency(Number(b.ownerPayoutAmount), b.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.items.length === 0 && (
            <p className="py-8 text-center text-slate-500">No bookings found</p>
          )}

          {data.total > data.pageSize && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing {(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <Link
                  href={page > 1 ? `/admin/bookings?status=${statusFilter}&page=${page - 1}` : "#"}
                  className={`rounded border px-3 py-1 text-sm ${page <= 1 ? "cursor-not-allowed border-slate-100 text-slate-400" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                >
                  Previous
                </Link>
                <Link
                  href={data.hasMore ? `/admin/bookings?status=${statusFilter}&page=${page + 1}` : "#"}
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
