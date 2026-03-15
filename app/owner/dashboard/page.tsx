"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import OwnerPickupMap from "@/components/owner-dashboard/OwnerPickupMap";
import MetricTooltip from "@/components/owner-dashboard/MetricTooltip";

type PeriodFilter = "month" | "quarter" | "year" | "all" | "custom";

type TopMetrics = {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueThisYear: number;
  netEarnings: number;
  netEarningsThisMonth: number;
  netEarningsThisYear: number;
  totalCompletedRentals: number;
  averageRentalPrice: number;
  averageTripDurationDays: number;
  carUtilizationRate: number;
  currency: string;
};

type FinancialRow = {
  grossRevenue: number;
  platformFees: number;
  stripeFeesEstimate: number;
  netPayout: number;
  estimatedVatOwed: number;
  netIncomeBeforeTax: number;
  bookingCount: number;
};

type CarPerformanceRow = {
  carId: string;
  carName: string;
  totalRevenue: number;
  totalRentals: number;
  averageRating: number | null;
  utilizationRate: number;
  averageTripDurationDays: number;
  revenuePerMonth: number;
  currency: string;
};

type RevenueBucket = { period: string; revenue: number; rentalCount: number; avgPrice: number };

type UtilizationDemand = {
  utilizationRate: number;
  totalRentalDays: number;
  availableCarDays: number;
  popularDaysOfWeek: { day: number; dayName: string; bookings: number }[];
  monthlyTrend: { month: string; rentalDays: number }[];
};

type PickupPoint = {
  carId: string;
  carName: string;
  latitude: number;
  longitude: number;
  completedBookings: number;
};

type AnalyticsData = {
  topMetrics: TopMetrics;
  financialSummary: FinancialRow;
  carPerformance: CarPerformanceRow[];
  revenueOverTime: { daily: RevenueBucket[]; weekly: RevenueBucket[]; monthly: RevenueBucket[] };
  utilizationDemand: UtilizationDemand;
  pickupLocations: PickupPoint[];
};

type PayoutsData = {
  payouts: { id: string; amount: { toString(): string }; currency: string; status: string; createdAt: string }[];
  pendingPayout: { totalAmount: number; currency: string } | null;
};

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("da-DK", { style: "currency", currency }).format(amount);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function OwnerDashboardPage() {
  const { t } = useLanguage();
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodFilter>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [vatPercent, setVatPercent] = useState(25);
  const [chartGroup, setChartGroup] = useState<"day" | "week" | "month">("month");
  const [showAccountantSection, setShowAccountantSection] = useState(false);
  const [hasListings, setHasListings] = useState<boolean | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [payoutsData, setPayoutsData] = useState<PayoutsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<keyof CarPerformanceRow>("totalRevenue");
  const [sortDesc, setSortDesc] = useState(true);

  const fetchAnalytics = useCallback(() => {
    const params = new URLSearchParams();
    params.set("period", period);
    if (period === "custom" && customFrom) params.set("from", customFrom);
    if (period === "custom" && customTo) params.set("to", customTo);
    params.set("vatPercent", String(vatPercent));
    params.set("chartGroup", chartGroup);

    fetch(`/api/owner/analytics?${params.toString()}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        setData(json?.data ?? null);
        setError(json?.data ? null : "Failed to load analytics");
      })
      .catch(() => {
        setError("Failed to load analytics");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [period, customFrom, customTo, vatPercent, chartGroup]);

  const fetchPayouts = useCallback(() => {
    fetch("/api/payouts")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setPayoutsData(json?.data ?? null))
      .catch(() => setPayoutsData(null));
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace("/login?callbackUrl=/owner/dashboard");
      return;
    }
    if (authStatus !== "authenticated" || !user) return;

    setLoading(true);
    setHasListings(null);

    fetch("/api/owner/has-listings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const has = Boolean(json?.data?.hasListings);
        setHasListings(has);
        if (has) {
          fetchAnalytics();
          fetchPayouts();
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setHasListings(false);
        setLoading(false);
      });
  }, [authStatus, user, router, fetchAnalytics, fetchPayouts]);

  const handleExportCsv = useCallback(() => {
    const from = period === "custom" ? customFrom : undefined;
    const to = period === "custom" ? customTo : undefined;
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/owner/analytics/export?${params.toString()}`, "_blank", "noopener");
  }, [period, customFrom, customTo]);


  if (authStatus !== "authenticated" || !user) {
    return null;
  }

  const m = data?.topMetrics;
  const fin = data?.financialSummary;
  const cars = data?.carPerformance ?? [];
  const sortedCars = [...cars].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const numA = typeof aVal === "number" ? aVal : 0;
    const numB = typeof bVal === "number" ? bVal : 0;
    if (sortDesc) return numB - numA;
    return numA - numB;
  });

  const revenueSeries = (chartGroup === "day" ? data?.revenueOverTime.daily : chartGroup === "week" ? data?.revenueOverTime.weekly : data?.revenueOverTime.monthly) ?? [];
  const maxRevenue = revenueSeries.length > 0 ? Math.max(...revenueSeries.map((r) => r.revenue)) : 1;
  const demand = data?.utilizationDemand;

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {t("ownerDashboard.title")}
            </h1>
            <p className="mt-1 text-slate-600">{t("ownerDashboard.subtitle")}</p>
          </div>
          <Link
            href="/bookings?tab=listings"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("ownerDashboard.backToListings")}
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading && hasListings !== false ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : hasListings === false || (data && (data.carPerformance ?? []).length === 0) ? (
          /* No listings yet – invite to list */
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {t("ownerDashboard.noListingsHeadline")}
              </h2>
              <p className="mt-4 text-slate-600">
                {t("ownerDashboard.noListingsSubtext")}
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">✓</span>
                  <span className="text-slate-700">{t("ownerDashboard.noListingsBenefit1")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">✓</span>
                  <span className="text-slate-700">{t("ownerDashboard.noListingsBenefit2")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">✓</span>
                  <span className="text-slate-700">{t("ownerDashboard.noListingsBenefit3")}</span>
                </li>
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/list-your-car"
                  className="inline-flex rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-500"
                >
                  {t("ownerDashboard.noListingsCta")}
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t("ownerDashboard.noListingsSecondary")}
                </Link>
              </div>
            </div>
          </div>
        ) : !data ? (
          <p className="text-slate-600">{t("ownerDashboard.noData")}</p>
        ) : (
          <>
            {/* At a glance */}
            <section className="mb-10">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("ownerDashboard.atAGlance")}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    <MetricTooltip label={t("ownerDashboard.totalEarned")} hint={t("ownerDashboard.totalEarnedHint")} />
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(m!.totalRevenue, m!.currency)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    <MetricTooltip label={t("ownerDashboard.thisMonth")} hint={t("ownerDashboard.thisMonthHint")} />
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">{formatMoney(m!.revenueThisMonth, m!.currency)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    <MetricTooltip label={t("ownerDashboard.youReceive")} hint={t("ownerDashboard.youReceiveHint")} />
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(m!.netEarnings, m!.currency)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    <MetricTooltip label={t("ownerDashboard.rentalsCount")} hint={t("ownerDashboard.rentalsCountHint")} />
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{m!.totalCompletedRentals}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    <MetricTooltip label={t("ownerDashboard.avgPerRental")} hint={t("ownerDashboard.avgPerRentalHint")} />
                  </p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{formatMoney(m!.averageRentalPrice, m!.currency)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    <MetricTooltip label={t("ownerDashboard.avgTripLength")} hint={t("ownerDashboard.avgTripLengthHint")} />
                  </p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{m!.averageTripDurationDays} {t("ownerDashboard.days")}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    <MetricTooltip label={t("ownerDashboard.howBusy")} hint={t("ownerDashboard.howBusyHint")} />
                  </p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{formatPercent(m!.carUtilizationRate)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    <MetricTooltip label={t("ownerDashboard.thisYear")} hint={t("ownerDashboard.thisYearHint")} />
                  </p>
                  <p className="mt-1 text-xl font-semibold text-emerald-600">{formatMoney(m!.revenueThisYear, m!.currency)}</p>
                </div>
              </div>
            </section>

            {/* Money on the way / Already paid out */}
            {payoutsData && (payoutsData.payouts.length > 0 || payoutsData.pendingPayout) && (
              <section className="mb-10">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  {payoutsData.pendingPayout && (
                    <div className="mb-4 flex flex-col gap-1 rounded-lg bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-amber-800">{t("ownerDashboard.moneyOnTheWay")}</p>
                        <p className="text-sm text-amber-700">{t("ownerDashboard.moneyOnTheWayHint")}</p>
                      </div>
                      <span className="text-xl font-bold text-amber-900">
                        {formatMoney(payoutsData.pendingPayout.totalAmount, payoutsData.pendingPayout.currency)}
                      </span>
                    </div>
                  )}
                  {payoutsData.payouts.length > 0 && (
                    <>
                      <p className="mb-2 text-sm font-medium text-slate-700">{t("ownerDashboard.alreadyPaidOut")}</p>
                      <ul className="divide-y divide-slate-200">
                        {payoutsData.payouts.slice(0, 5).map((p) => (
                          <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                            <span className="text-slate-600">{new Date(p.createdAt).toLocaleDateString()}</span>
                            <span className="font-medium text-slate-900">{formatMoney(Number(p.amount.toString()), p.currency)}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </section>
            )}

            {/* Simple "In this period" + collapsible For your accountant */}
            <section className="mb-10">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-slate-600">{t("ownerDashboard.inPeriod")}</span>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="month">{t("ownerDashboard.filterMonth")}</option>
                  <option value="quarter">{t("ownerDashboard.filterQuarter")}</option>
                  <option value="year">{t("ownerDashboard.filterYear")}</option>
                  <option value="all">{t("ownerDashboard.filterAll")}</option>
                  <option value="custom">{t("ownerDashboard.filterCustom")}</option>
                </select>
                {period === "custom" && (
                  <>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm text-slate-500">
                      <MetricTooltip label={t("ownerDashboard.rentersPaid")} hint={t("ownerDashboard.rentersPaidHint")} />
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(fin!.grossRevenue, "DKK")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">
                      <MetricTooltip label={t("ownerDashboard.ourFee")} hint={t("ownerDashboard.ourFeeHint")} />
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">−{formatMoney(fin!.platformFees, "DKK")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">
                      <MetricTooltip label={t("ownerDashboard.youGet")} hint={t("ownerDashboard.youGetHint")} />
                    </p>
                    <p className="mt-1 text-lg font-semibold text-emerald-600">{formatMoney(fin!.netPayout, "DKK")}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowAccountantSection(!showAccountantSection)}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  {showAccountantSection ? "▼ " : "▶ "}{t("ownerDashboard.forAccountant")}
                </button>
                {showAccountantSection && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                    <p className="mb-4 text-sm text-slate-600">{t("ownerDashboard.forAccountantIntro")}</p>
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        VAT %
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={vatPercent}
                          onChange={(e) => setVatPercent(Number(e.target.value) || 0)}
                          className="w-16 rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleExportCsv}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                      >
                        {t("ownerDashboard.exportCSV")}
                      </button>
                    </div>
                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                      <div><dt className="text-slate-500">Gross revenue</dt><dd className="font-medium">{formatMoney(fin!.grossRevenue, "DKK")}</dd></div>
                      <div><dt className="text-slate-500">Platform fees</dt><dd className="font-medium">−{formatMoney(fin!.platformFees, "DKK")}</dd></div>
                      <div><dt className="text-slate-500">Payment fees (est.)</dt><dd className="font-medium">−{formatMoney(fin!.stripeFeesEstimate, "DKK")}</dd></div>
                      <div><dt className="text-slate-500">Net payout</dt><dd className="font-medium text-emerald-600">{formatMoney(fin!.netPayout, "DKK")}</dd></div>
                      <div><dt className="text-slate-500">Est. VAT ({vatPercent}%)</dt><dd className="font-medium">−{formatMoney(fin!.estimatedVatOwed, "DKK")}</dd></div>
                      <div><dt className="text-slate-500">Net before tax</dt><dd className="font-medium">{formatMoney(fin!.netIncomeBeforeTax, "DKK")}</dd></div>
                    </dl>
                  </div>
                )}
              </div>
            </section>

            {/* Earnings over time */}
            <section className="mb-10">
              <h2 className="mb-1 text-lg font-semibold text-slate-900">{t("ownerDashboard.earningsOverTime")}</h2>
              <p className="mb-3 text-sm text-slate-600">{t("ownerDashboard.earningsOverTimeHint")}</p>
              <div className="mb-3 flex gap-2">
                {(["month", "week", "day"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setChartGroup(g)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${chartGroup === g ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                  >
                    {g === "month" ? t("ownerDashboard.monthly") : g === "week" ? t("ownerDashboard.weekly") : t("ownerDashboard.daily")}
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-64 items-end gap-1">
                  {revenueSeries.map((r) => (
                    <div
                      key={r.period}
                      className="flex flex-1 flex-col items-center gap-1"
                      title={`${r.period}: ${formatMoney(r.revenue, "DKK")} (${r.rentalCount} ${r.rentalCount === 1 ? "rental" : "rentals"})`}
                    >
                      <div
                        className="w-full min-w-[4px] rounded-t bg-emerald-500 transition hover:bg-emerald-600"
                        style={{ height: maxRevenue > 0 ? `${(r.revenue / maxRevenue) * 100}%` : "2px" }}
                      />
                      <span className="hidden text-[10px] text-slate-500 sm:block">{r.period.slice(-2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* How each car is doing */}
            <section className="mb-10">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("ownerDashboard.howEachCarDoing")}</h2>
              {sortedCars.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">{t("ownerDashboard.noCars")}</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {[
                          ["carName", t("ownerDashboard.carName")],
                          ["totalRevenue", t("ownerDashboard.earned")],
                          ["totalRentals", t("ownerDashboard.trips")],
                          ["averageRating", t("ownerDashboard.rating")],
                          ["utilizationRate", t("ownerDashboard.busy")],
                          ["averageTripDurationDays", t("ownerDashboard.avgTripLength")],
                          ["revenuePerMonth", t("ownerDashboard.perMonth")],
                        ].map(([key, label]) => (
                          <th
                            key={key}
                            className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-slate-500"
                            onClick={() => {
                              setSortBy(key as keyof CarPerformanceRow);
                              setSortDesc((d) => (sortBy === key ? !d : true));
                            }}
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {sortedCars.map((row) => (
                        <tr key={row.carId} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{row.carName}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{formatMoney(row.totalRevenue, row.currency)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{row.totalRentals}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{row.averageRating != null ? row.averageRating.toFixed(1) : "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{formatPercent(row.utilizationRate)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{row.averageTripDurationDays} d</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{formatMoney(row.revenuePerMonth, row.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* When do people rent */}
            {demand && (
              <section className="mb-10">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("ownerDashboard.whenPeopleRent")}</h2>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-3 text-sm font-medium text-slate-700">{t("ownerDashboard.popularDays")}</h3>
                    <div className="flex items-end gap-2">
                      {demand.popularDaysOfWeek.map((d) => (
                        <div key={d.day} className="flex flex-1 flex-col items-center">
                          <div
                            className="w-full rounded-t bg-slate-200"
                            style={{
                              height: Math.max(4, (d.bookings / Math.max(1, Math.max(...demand.popularDaysOfWeek.map((x) => x.bookings)))) * 80),
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
                            className="w-full min-w-[2px] rounded-t bg-emerald-400"
                            style={{
                              height: Math.max(4, (m.rentalDays / Math.max(1, Math.max(...demand.monthlyTrend.map((x) => x.rentalDays)))) * 100),
                            }}
                          />
                          <span className="mt-1 text-[10px] text-slate-500">{m.month.slice(-2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Map */}
            {data.pickupLocations.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-1 text-lg font-semibold text-slate-900">{t("ownerDashboard.pickupMap")}</h2>
                <p className="mb-4 text-sm text-slate-600">{t("ownerDashboard.pickupMapSubtitle")}</p>
                <OwnerPickupMap points={data.pickupLocations} />
              </section>
            )}
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
