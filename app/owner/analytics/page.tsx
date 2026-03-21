"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { formatMoney, formatPercent } from "@/lib/owner-dashboard-utils";

type RevenueBucket = { period: string; revenue: number; rentalCount: number; avgPrice: number };

type UtilizationDemand = {
  utilizationRate: number;
  totalRentalDays: number;
  availableCarDays: number;
  popularDaysOfWeek: { day: number; dayName: string; bookings: number }[];
  monthlyTrend: { month: string; rentalDays: number }[];
};

type AnalyticsData = {
  revenueOverTime: { daily: RevenueBucket[]; weekly: RevenueBucket[]; monthly: RevenueBucket[] };
  utilizationDemand: UtilizationDemand;
};

export default function OwnerAnalyticsPage() {
  const { t } = useLanguage();
  const { user, status } = useAuth();
  const router = useRouter();
  const [chartGroup, setChartGroup] = useState<"day" | "week" | "month">("month");
  const [hasListings, setHasListings] = useState<boolean | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    fetch("/api/owner/analytics?period=all")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        setData(json?.data ?? null);
        setError(json?.data ? null : "Failed to load");
      })
      .catch(() => {
        setError("Failed to load");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/owner/analytics");
      return;
    }
    if (status !== "authenticated" || !user) return;

    setLoading(true);
    fetch("/api/owner/has-listings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const has = Boolean(json?.data?.hasListings);
        setHasListings(has);
        if (has) fetchData();
        else setLoading(false);
      })
      .catch(() => {
        setHasListings(false);
        setLoading(false);
      });
  }, [status, user, router, fetchData]);

  if (status !== "authenticated" || !user) return null;

  if (hasListings === false) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <p className="text-slate-600">{t("ownerDashboard.noListingsSubtext")}</p>
        <Link href="/list-your-car" className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          {t("ownerDashboard.noListingsCta")}
        </Link>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  const revenueSeries =
    chartGroup === "day"
      ? data.revenueOverTime.daily
      : chartGroup === "week"
        ? data.revenueOverTime.weekly
        : data.revenueOverTime.monthly;
  const maxRevenue = revenueSeries.length > 0 ? Math.max(...revenueSeries.map((r) => r.revenue)) : 1;
  const demand = data.utilizationDemand;

  const totalRevenue = revenueSeries.reduce((s, r) => s + r.revenue, 0);
  const totalBookings = revenueSeries.reduce((s, r) => s + r.rentalCount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("ownerDashboard.analytics")}</h1>
        <p className="mt-1 text-sm text-slate-500">Earnings trends, demand patterns, and performance insights</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      <section>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">{t("ownerDashboard.earningsOverTime")}</h2>
        <p className="mb-4 text-sm text-slate-500">{t("ownerDashboard.earningsOverTimeHint")}</p>
        <div className="mb-3 flex gap-2">
          {(["month", "week", "day"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setChartGroup(g)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${chartGroup === g ? "bg-brand text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {g === "month" ? t("ownerDashboard.monthly") : g === "week" ? t("ownerDashboard.weekly") : t("ownerDashboard.daily")}
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <span className="text-slate-600">
              Shown period: <strong className="text-slate-900">{formatMoney(totalRevenue, "DKK")}</strong> revenue · <strong className="text-slate-900">{totalBookings}</strong> booking{totalBookings !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex h-64 items-end gap-1">
            {revenueSeries.map((r) => (
              <div
                key={r.period}
                className="flex flex-1 flex-col items-center gap-1"
                title={`${r.period}: ${formatMoney(r.revenue, "DKK")} (${r.rentalCount} ${r.rentalCount === 1 ? "rental" : "rentals"})`}
              >
                <div
                  className="w-full min-w-[4px] rounded-t bg-brand transition hover:opacity-90"
                  style={{ height: maxRevenue > 0 ? `${(r.revenue / maxRevenue) * 100}%` : "2px" }}
                />
                <span className="hidden text-[10px] text-slate-500 sm:block">{r.period.slice(-2)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {demand && (
        <section>
          <h2 className="mb-1 text-lg font-semibold text-slate-900">{t("ownerDashboard.whenPeopleRent")}</h2>
          <p className="mb-4 text-sm text-slate-500">Demand by day of week and month (last 12 months)</p>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-sm font-medium text-slate-700">{t("ownerDashboard.popularDays")}</h3>
              <div className="flex items-end gap-2">
                {demand.popularDaysOfWeek.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center">
                    <div
                      className="w-full rounded-t bg-slate-200"
                      style={{
                        height: Math.max(
                          4,
                          (d.bookings / Math.max(1, Math.max(...demand.popularDaysOfWeek.map((x) => x.bookings)))) * 80
                        ),
                      }}
                    />
                    <span className="mt-1 text-xs text-slate-500">{d.dayName}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-sm font-medium text-slate-700">{t("ownerDashboard.byMonth")}</h3>
              <div className="flex items-end gap-1">
                {demand.monthlyTrend.map((m) => (
                  <div
                    key={m.month}
                    className="flex flex-1 flex-col items-center"
                    title={`${m.month}: ${m.rentalDays} days`}
                  >
                    <div
                      className="w-full min-w-[2px] rounded-t bg-brand"
                      style={{
                        height: Math.max(
                          4,
                          (m.rentalDays / Math.max(1, Math.max(...demand.monthlyTrend.map((x) => x.rentalDays)))) * 100
                        ),
                      }}
                    />
                    <span className="mt-1 text-[10px] text-slate-500">{m.month.slice(-2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Occupancy: {formatPercent(demand.utilizationRate)} · {demand.totalRentalDays} booked days (last 12 months)
          </p>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
        <h2 className="mb-1 text-base font-semibold text-slate-900">Per-car performance</h2>
        <p className="mb-3 text-sm text-slate-600">Revenue, bookings, occupancy, and ratings for each of your cars</p>
        <Link
          href="/owner/cars"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          View car performance
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </section>
    </div>
  );
}
