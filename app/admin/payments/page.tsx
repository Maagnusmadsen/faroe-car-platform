"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StatCard from "@/components/admin/StatCard";
import { formatCurrency } from "@/lib/utils/price";
import AdminSection from "@/components/admin/AdminSection";

type PaymentsData = {
  summary: {
    totalPlatformRevenue: number;
    platformFees: number;
    totalOwnerEarnings: number;
    currency: string;
  };
  payouts: { pending: number; failed: number };
  ownerEarnings: Array<{
    userId: string;
    email: string;
    name: string | null;
    totalRevenue: number;
    platformFees: number;
    netEarnings: number;
    bookingCount: number;
    listingCount: number;
  }>;
  revenueOverTime: Array<{
    period: string;
    revenue: number;
    platformFees: number;
    ownerPayout: number;
    rentalCount: number;
  }>;
};


export default function AdminPaymentsPage() {
  const [data, setData] = useState<PaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/earnings?groupBy=month&limit=12");
      if (!res.ok) throw new Error("Failed to load payments");
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

  const { summary, payouts = { pending: 0, failed: 0 }, ownerEarnings, revenueOverTime } = data;
  const maxRevenue = Math.max(...revenueOverTime.map((r) => r.revenue), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="mt-1 text-sm text-slate-500">Platform revenue, fees, and owner payouts</p>
      </div>

      <AdminSection title="Financial summary">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Gross revenue"
            value={formatCurrency(summary.totalPlatformRevenue)}
            variant="success"
          />
          <StatCard label="Platform fees" value={formatCurrency(summary.platformFees)} />
          <StatCard label="Owner payouts" value={formatCurrency(summary.totalOwnerEarnings)} />
          <StatCard
            label="Pending payouts"
            value={payouts.pending}
            variant={payouts.pending > 0 ? "warning" : "muted"}
          />
          <StatCard
            label="Failed payouts"
            value={payouts.failed}
            variant={payouts.failed > 0 ? "danger" : "muted"}
          />
        </div>
      </AdminSection>

      <AdminSection title="Revenue over time" subtitle="By month">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex h-48 items-end gap-1">
            {revenueOverTime.map((r) => (
              <div
                key={r.period}
                className="flex flex-1 flex-col items-center gap-1"
                title={`${r.period}: ${formatCurrency(r.revenue)} (${r.rentalCount} bookings)`}
              >
                <div
                  className="w-full min-w-[8px] rounded-t bg-brand/70 transition-opacity hover:opacity-90"
                  style={{ height: `${Math.max(4, (r.revenue / maxRevenue) * 100)}%` }}
                />
                <span className="text-[10px] text-slate-500">{r.period.slice(-2)}</span>
              </div>
            ))}
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Earnings by owner" subtitle="Top owners by net earnings">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Owner</th>
                <th className="px-4 py-3 font-medium text-slate-700">Listings</th>
                <th className="px-4 py-3 font-medium text-slate-700">Bookings</th>
                <th className="px-4 py-3 font-medium text-slate-700">Revenue</th>
                <th className="px-4 py-3 font-medium text-slate-700">Platform fee</th>
                <th className="px-4 py-3 font-medium text-slate-700">Net earnings</th>
              </tr>
            </thead>
            <tbody>
              {ownerEarnings.slice(0, 20).map((o) => (
                <tr key={o.userId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users?search=${encodeURIComponent(o.email)}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {o.name ?? o.email}
                    </Link>
                    {o.name && <p className="text-xs text-slate-500">{o.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{o.listingCount}</td>
                  <td className="px-4 py-3 text-slate-600">{o.bookingCount}</td>
                  <td className="px-4 py-3 text-slate-900">{formatCurrency(o.totalRevenue)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrency(o.platformFees)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(o.netEarnings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {ownerEarnings.length === 0 && (
            <p className="p-6 text-center text-slate-500">No earnings data</p>
          )}
          {(payouts.failed > 0 || payouts.pending > 0) && (
            <div className="border-t border-slate-100 px-4 py-2">
              <Link href="/admin/issues" className="text-sm font-medium text-brand hover:underline">
                View payout issues →
              </Link>
            </div>
          )}
        </div>
      </AdminSection>
    </div>
  );
}
