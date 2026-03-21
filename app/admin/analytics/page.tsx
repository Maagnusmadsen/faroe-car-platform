"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StatCard from "@/components/admin/StatCard";
import { formatCurrency, formatPrice } from "@/lib/utils/price";

type AnalyticsData = {
  revenueMonthly: Array<{
    period: string;
    revenue: number;
    platformFees: number;
    ownerPayout: number;
    rentalCount: number;
  }>;
  revenueWeekly: Array<{
    period: string;
    revenue: number;
    rentalCount: number;
  }>;
  listingPerformance: Array<{
    listingId: string;
    brand: string;
    model: string;
    year: number;
    town: string;
    island: string;
    status: string;
    pricePerDay: number;
    ownerEmail: string;
    ownerName: string | null;
    totalBookings: number;
    totalRevenue: number;
    utilizationRate: number;
  }>;
  metrics: {
    totalListings: number;
    activeListings: number;
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    cancellationRate: number;
    utilizationRate: number;
    totalPlatformRevenue: number;
    revenueThisMonth: number;
    revenueThisYear: number;
    newUsersLast7Days?: number;
    newUsersLast30Days?: number;
    currency: string;
  };
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) throw new Error("Failed to load analytics");
      const json = await res.json();
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error ?? "Failed to load"}</p>
      </div>
    );
  }

  const { revenueMonthly, listingPerformance, metrics } = data;
  const maxRev = Math.max(...revenueMonthly.map((r) => r.revenue), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Platform insights and trends</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard label="Total revenue" value={formatCurrency(metrics.totalPlatformRevenue)} variant="success" />
        <StatCard label="This month" value={formatCurrency(metrics.revenueThisMonth)} />
        <StatCard label="This year" value={formatCurrency(metrics.revenueThisYear)} />
        <StatCard label="Cancellation rate" value={`${metrics.cancellationRate}%`} variant="muted" />
        {metrics.newUsersLast7Days != null && (
          <StatCard label="New users (7d)" value={metrics.newUsersLast7Days} />
        )}
        {metrics.newUsersLast30Days != null && (
          <StatCard label="New users (30d)" value={metrics.newUsersLast30Days} />
        )}
      </div>

      {/* Revenue & bookings trend */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-slate-900">Revenue & bookings (last 12 months)</h2>
        <p className="mb-4 text-sm text-slate-500">
          {formatCurrency(revenueMonthly.reduce((s, r) => s + r.revenue, 0))} total revenue · {revenueMonthly.reduce((s, r) => s + r.rentalCount, 0)} bookings
        </p>
        <div className="flex h-40 items-end gap-1">
          {revenueMonthly.map((r) => (
            <div
              key={r.period}
              className="flex flex-1 flex-col items-center"
              title={`${r.period}: ${formatCurrency(r.revenue)} (${r.rentalCount} rentals)`}
            >
              <div
                className="w-full min-w-[12px] rounded-t bg-brand/70"
                style={{ height: `${Math.max(4, (r.revenue / maxRev) * 100)}%` }}
              />
              <span className="mt-1 text-[10px] text-slate-500">{r.period.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Listing performance */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Listing performance</h2>
          <p className="text-xs text-slate-500">Top listings by revenue and utilization</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Car</th>
                <th className="px-4 py-3 font-medium text-slate-700">Location</th>
                <th className="px-4 py-3 font-medium text-slate-700">Price/day</th>
                <th className="px-4 py-3 font-medium text-slate-700">Bookings</th>
                <th className="px-4 py-3 font-medium text-slate-700">Revenue</th>
                <th className="px-4 py-3 font-medium text-slate-700">Utilization</th>
                <th className="px-4 py-3 font-medium text-slate-700">Owner</th>
              </tr>
            </thead>
            <tbody>
              {listingPerformance.slice(0, 25).map((l) => (
                <tr key={l.listingId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/rent-a-car/${l.listingId}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {l.brand} {l.model} ({l.year})
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.town}, {l.island}</td>
                  <td className="px-4 py-3 text-slate-600">{formatPrice(l.pricePerDay)}</td>
                  <td className="px-4 py-3 text-slate-600">{l.totalBookings}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(l.totalRevenue)}</td>
                  <td className="px-4 py-3 text-slate-600">{Math.round(l.utilizationRate * 100)}%</td>
                  <td className="px-4 py-3 text-slate-600">{l.ownerName ?? l.ownerEmail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
