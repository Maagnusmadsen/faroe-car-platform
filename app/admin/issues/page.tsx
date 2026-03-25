"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/price";

type IssuesData = {
  issues: {
    pendingRenterApprovals: number;
    pendingListings: number;
    failedPayouts: number;
    pendingPayouts: number;
    disputedBookings: number;
    recentCancellations: number;
  };
  pendingRenters: Array<{
    user: { id: string; email: string; name: string | null };
  }>;
  pendingListings: Array<{
    id: string;
    brand: string;
    model: string;
    year: number;
    owner: { id: string; email: string; name: string | null };
    createdAt: string;
  }>;
  failedPayouts: Array<{
    id: string;
    amount: { toString(): string };
    currency: string;
    status: string;
    createdAt: string;
    user: { id: string; email: string; name: string | null };
  }>;
  disputedBookings: Array<{
    id: string;
    startDate: string;
    endDate: string;
    totalPrice: { toString(): string };
    car: { id: string; brand: string; model: string };
    renter: { id: string; email: string; name: string | null };
  }>;
};


export default function AdminIssuesPage() {
  const [data, setData] = useState<IssuesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/issues");
      if (!res.ok) throw new Error("Failed to load issues");
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

  async function approveRenter(userId: string) {
    setApprovingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/verification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus: "VERIFIED" }),
      });
      if (res.ok) fetchData();
    } finally {
      setApprovingId(null);
    }
  }

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

  const { issues, pendingRenters, failedPayouts, disputedBookings } = data;
  const hasIssues =
    issues.pendingRenterApprovals > 0 ||
    issues.failedPayouts > 0 ||
    issues.disputedBookings > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Issues</h1>
        <p className="mt-1 text-sm text-slate-500">Operational issues and moderation</p>
      </div>

      {!hasIssues && (
        <div className="rounded-xl border border-brand/20 bg-brand/5 p-6">
          <p className="font-medium text-slate-800">No critical issues</p>
          <p className="mt-1 text-sm text-slate-600">
            There are no pending renter approvals, failed payouts, or disputed bookings.
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/users?filter=pending"
          className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
        >
          <p className="text-sm font-medium text-slate-500">Pending renter approvals</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{issues.pendingRenterApprovals}</p>
        </Link>
        <Link
          href="/admin/issues#payouts"
          className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
        >
          <p className="text-sm font-medium text-slate-500">Failed payouts</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{issues.failedPayouts}</p>
        </Link>
        <Link
          href="/admin/issues#disputes"
          className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
        >
          <p className="text-sm font-medium text-slate-500">Disputed bookings</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{issues.disputedBookings}</p>
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-500">Pending payouts</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{issues.pendingPayouts}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-500">Cancellations (last 7 days)</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{issues.recentCancellations}</p>
        </div>
      </div>

      {/* Pending renter approvals */}
      {pendingRenters.length > 0 && (
        <div id="approvals" className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Pending renter approvals</h2>
            <p className="text-xs text-slate-500">Users awaiting verification</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">User</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRenters.map((r) => (
                  <tr key={r.user.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{r.user.email}</p>
                      {r.user.name && <p className="text-slate-500">{r.user.name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => approveRenter(r.user.id)}
                        disabled={approvingId === r.user.id}
                        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                      >
                        {approvingId === r.user.id ? "…" : "Approve"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Failed payouts */}
      {failedPayouts.length > 0 && (
        <div id="payouts" className="rounded-xl border border-red-200 bg-red-50/50">
          <div className="border-b border-red-100 px-4 py-3">
            <h2 className="font-semibold text-red-900">Failed payouts</h2>
            <p className="text-xs text-red-700">Requires manual attention</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-red-100 bg-red-50/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-red-800">Owner</th>
                  <th className="px-4 py-3 font-medium text-red-800">Amount</th>
                  <th className="px-4 py-3 font-medium text-red-800">Date</th>
                </tr>
              </thead>
              <tbody>
                {failedPayouts.map((p) => (
                  <tr key={p.id} className="border-b border-red-100 last:border-0">
                    <td className="px-4 py-3 text-red-900">{p.user?.email ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-red-900">
                      {formatCurrency(Number(p.amount), p.currency)}
                    </td>
                    <td className="px-4 py-3 text-red-800">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="p-4 text-xs text-red-700">
            TODO: Integrate with Stripe dashboard or support flow to resolve failed payouts.
          </p>
        </div>
      )}

      {/* Disputed bookings */}
      {disputedBookings.length > 0 && (
        <div id="disputes" className="rounded-xl border border-amber-200 bg-amber-50/50">
          <div className="border-b border-amber-100 px-4 py-3">
            <h2 className="font-semibold text-amber-900">Disputed bookings</h2>
            <p className="text-xs text-amber-800">Requires manual resolution</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-amber-100 bg-amber-50/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-amber-800">Car</th>
                  <th className="px-4 py-3 font-medium text-amber-800">Renter</th>
                  <th className="px-4 py-3 font-medium text-amber-800">Dates</th>
                  <th className="px-4 py-3 font-medium text-amber-800">Amount</th>
                </tr>
              </thead>
              <tbody>
                {disputedBookings.map((b) => (
                  <tr key={b.id} className="border-b border-amber-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/rent-a-car/${b.car.id}`}
                        className="font-medium text-brand hover:underline"
                      >
                        {b.car.brand} {b.car.model}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-amber-900">{b.renter?.email ?? "—"}</td>
                    <td className="px-4 py-3 text-amber-800">
                      {b.startDate?.slice(0, 10)} – {b.endDate?.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 font-medium text-amber-900">
                      {formatCurrency(Number(b.totalPrice))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="p-4 text-xs text-amber-800">
            TODO: Add dispute resolution workflow (refund, partial refund, contact parties).
          </p>
        </div>
      )}
    </div>
  );
}
