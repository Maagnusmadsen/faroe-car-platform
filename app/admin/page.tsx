"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StatCard from "@/components/admin/StatCard";
import { formatCurrency } from "@/lib/utils/price";
import AdminSection from "@/components/admin/AdminSection";
import ActionCenter, { type ActionItem } from "@/components/admin/ActionCenter";

type DashboardData = {
  metrics: {
    totalUsers: number;
    activeUsersLast30Days: number;
    totalOwners: number;
    totalRenters: number;
    totalListings: number;
    activeListings: number;
    totalBookings: number;
    upcomingBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    pendingBookings: number;
    cancellationRate: number;
    totalPlatformRevenue: number;
    totalOwnerEarnings: number;
    platformFees: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    revenueThisYear: number;
    averageBookingValue: number;
    newUsersLast7Days: number;
    newUsersLast30Days: number;
    currency: string;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    userEmail: string | null;
    createdAt: string;
  }>;
  issues: {
    pendingRenterApprovals: number;
    pendingListings: number;
    failedPayouts: number;
    pendingPayouts: number;
    disputedBookings: number;
    recentCancellations: number;
  };
  revenueOverTime: Array<{
    period: string;
    revenue: number;
    platformFees: number;
    ownerPayout: number;
    rentalCount: number;
  }>;
  topListings: Array<{
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
};


const CANCELLATION_WARNING_THRESHOLD = 15;

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
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
        <p className="text-slate-500">Loading dashboard…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error ?? "Failed to load dashboard"}</p>
      </div>
    );
  }

  const { metrics, issues, revenueOverTime, topListings } = data;
  const revenueTrend =
    metrics.revenueLastMonth > 0
      ? Math.round(
          ((metrics.revenueThisMonth - metrics.revenueLastMonth) / metrics.revenueLastMonth) * 100
        )
      : null;
  const maxRevenue = Math.max(...revenueOverTime.map((r) => r.revenue), 1);
  const highCancellation = metrics.cancellationRate >= CANCELLATION_WARNING_THRESHOLD;

  const actionItems: ActionItem[] = [
    {
      label: "Pending renter approvals",
      count: issues.pendingRenterApprovals,
      href: "/admin/users?filter=pending",
      severity: "urgent",
    },
    {
      label: "Failed payouts",
      count: issues.failedPayouts,
      href: "/admin/issues",
      severity: "urgent",
    },
    {
      label: "Disputed bookings",
      count: issues.disputedBookings,
      href: "/admin/bookings?status=DISPUTED",
      severity: "urgent",
    },
    {
      label: "Pending payouts",
      count: issues.pendingPayouts,
      href: "/admin/payments",
      severity: issues.pendingPayouts > 0 ? "warning" : "info",
    },
    {
      label: "Cancellations (7 days)",
      count: issues.recentCancellations,
      href: "/admin/bookings?status=CANCELLED",
      severity: issues.recentCancellations > 5 ? "warning" : "info",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Platform control center</p>
      </div>

      {/* A. Action Center */}
      <ActionCenter items={actionItems} title="Action Center" />

      {/* B. Platform Overview */}
      <AdminSection title="Platform Overview" subtitle="High-level KPIs">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total users" value={metrics.totalUsers} />
          <StatCard
            label="Active (30d)"
            value={metrics.activeUsersLast30Days}
            subtext="Signed up or had activity"
          />
          <StatCard label="Total listings" value={metrics.totalListings} subtext={`${metrics.activeListings} active`} />
          <StatCard label="Owners" value={metrics.totalOwners} />
          <StatCard label="Renters" value={metrics.totalRenters} />
        </div>
      </AdminSection>

      {/* C. Bookings Health */}
      <AdminSection title="Bookings Health">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total bookings" value={metrics.totalBookings} />
          <StatCard label="Completed" value={metrics.completedBookings} variant="success" />
          <StatCard label="Upcoming" value={metrics.upcomingBookings} />
          <StatCard label="Cancelled" value={metrics.cancelledBookings} variant="muted" />
          <StatCard
            label="Cancellation rate"
            value={`${metrics.cancellationRate}%`}
            variant={highCancellation ? "danger" : "muted"}
          />
        </div>
      </AdminSection>

      {/* D. Revenue (Financial Flow) */}
      <AdminSection title="Revenue" subtitle="Financial flow">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-medium text-slate-700">Money flow (all time)</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Gross booking value</span>
                <span className="font-medium text-slate-900">{formatCurrency(metrics.totalPlatformRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Platform fees</span>
                <span className="text-slate-600">− {formatCurrency(metrics.platformFees)}</span>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-900">Owner payouts</span>
                  <span className="font-bold text-brand">{formatCurrency(metrics.totalOwnerEarnings)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-medium text-slate-700">This month</h3>
            <StatCard
              label="Revenue"
              value={formatCurrency(metrics.revenueThisMonth)}
              subtext={
                revenueTrend != null
                  ? `${revenueTrend >= 0 ? "+" : ""}${revenueTrend}% vs last month`
                  : undefined
              }
              variant="success"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-medium text-slate-700">Averages</h3>
            <StatCard label="Avg. booking value" value={formatCurrency(metrics.averageBookingValue)} variant="muted" />
          </div>
        </div>
      </AdminSection>

      {/* E. Performance Trends */}
      <AdminSection title="Performance Trends" subtitle="Revenue & bookings over time">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex flex-wrap gap-4 text-sm text-slate-600">
            <span>
              Last 12 months: <strong className="text-slate-900">{formatCurrency(revenueOverTime.reduce((s, r) => s + r.revenue, 0))}</strong> revenue
            </span>
            <span>
              <strong className="text-slate-900">{revenueOverTime.reduce((s, r) => s + r.rentalCount, 0)}</strong> bookings
            </span>
          </div>
          <div className="flex h-48 items-end gap-1">
            {revenueOverTime.map((r) => (
              <div
                key={r.period}
                className="flex flex-1 flex-col items-center gap-1"
                title={`${r.period}: ${formatCurrency(r.revenue)} (${r.rentalCount} bookings)`}
              >
                <div
                  className="w-full min-w-[4px] rounded-t bg-brand/70 transition-opacity hover:opacity-90"
                  style={{ height: maxRevenue > 0 ? `${(r.revenue / maxRevenue) * 100}%` : "2px" }}
                />
                <span className="text-[10px] text-slate-500">{r.period.slice(-2)}</span>
              </div>
            ))}
          </div>
        </div>
      </AdminSection>

      {/* F. Listings Performance */}
      <AdminSection title="Top Listings" subtitle="By revenue">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {topListings.length === 0 ? (
            <p className="p-6 text-center text-slate-500">No listings with bookings yet</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Car</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Owner</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Bookings</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Revenue</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Utilization</th>
                </tr>
              </thead>
              <tbody>
                {topListings.map((l) => (
                  <tr key={l.listingId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/rent-a-car/${l.listingId}`} className="font-medium text-brand hover:underline">
                        {l.brand} {l.model} ({l.year})
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.ownerName ?? l.ownerEmail}</td>
                    <td className="px-4 py-3 text-slate-600">{l.totalBookings}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(l.totalRevenue)}</td>
                    <td className="px-4 py-3 text-slate-600">{Math.round(l.utilizationRate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="border-t border-slate-100 px-4 py-2">
            <Link href="/admin/analytics" className="text-sm font-medium text-brand hover:underline">
              Full analytics →
            </Link>
          </div>
        </div>
      </AdminSection>

      {/* G. Users Overview */}
      <AdminSection title="Users Overview">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="New users (7d)" value={metrics.newUsersLast7Days} />
          <StatCard label="New users (30d)" value={metrics.newUsersLast30Days} />
          <StatCard
            label="Pending approvals"
            value={issues.pendingRenterApprovals}
            variant={issues.pendingRenterApprovals > 0 ? "warning" : "muted"}
          />
        </div>
      </AdminSection>
    </div>
  );
}
