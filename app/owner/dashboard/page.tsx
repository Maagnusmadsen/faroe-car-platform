"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useOwnerDashboard } from "@/hooks/useOwnerDashboard";
import OwnerMetricCard from "@/components/owner/OwnerMetricCard";
import { formatMoney, formatPercent } from "@/lib/owner-dashboard-utils";

export default function OwnerDashboardPage() {
  const { t } = useLanguage();
  const { hasListings, data, loading, error } = useOwnerDashboard();

  if (loading && hasListings !== false) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  if (hasListings === false) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t("ownerDashboard.noListingsHeadline")}
          </h2>
          <p className="mt-4 text-slate-600">{t("ownerDashboard.noListingsSubtext")}</p>
          <ul className="mt-6 space-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand">✓</span>
              <span className="text-slate-700">{t("ownerDashboard.noListingsBenefit1")}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand">✓</span>
              <span className="text-slate-700">{t("ownerDashboard.noListingsBenefit2")}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand">✓</span>
              <span className="text-slate-700">{t("ownerDashboard.noListingsBenefit3")}</span>
            </li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/list-your-car"
              className="inline-flex rounded-xl bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-hover"
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
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error ?? t("ownerDashboard.noData")}</p>
      </div>
    );
  }

  const m = data.topMetrics;
  const pending = data.payouts.pendingPayout;
  const upcoming = data.upcomingBookings;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("ownerDashboard.overview")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("ownerDashboard.subtitle")}</p>
      </div>

      {/* Pending payout alert */}
      {pending && pending.totalAmount > 0 && (
        <Link
          href="/owner/payouts"
          className="block rounded-xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100/80"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-amber-900">{t("ownerDashboard.moneyOnTheWay")}</p>
              <p className="text-sm text-amber-700">{t("ownerDashboard.moneyOnTheWayHint")}</p>
            </div>
            <span className="text-xl font-bold text-amber-900">
              {formatMoney(pending.totalAmount, pending.currency)}
            </span>
            <span className="text-sm text-amber-600">→</span>
          </div>
        </Link>
      )}

      {/* Primary metrics */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Key metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OwnerMetricCard
            label={t("ownerDashboard.thisMonth")}
            value={formatMoney(m.netEarningsThisMonth, m.currency)}
            variant="accent"
          />
          <OwnerMetricCard
            label={t("ownerDashboard.moneyOnTheWay")}
            value={pending && pending.totalAmount > 0 ? formatMoney(pending.totalAmount, pending.currency) : "—"}
            variant="primary"
          />
          <OwnerMetricCard
            label={t("ownerDashboard.rentalsCount")}
            value={m.totalCompletedRentals}
          />
          <OwnerMetricCard
            label={t("ownerDashboard.howBusy")}
            value={formatPercent(m.carUtilizationRate)}
          />
        </div>
      </section>

      {/* Secondary metrics */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OwnerMetricCard
            label={t("ownerDashboard.totalEarned")}
            value={formatMoney(m.netEarnings, m.currency)}
            variant="muted"
          />
          <OwnerMetricCard
            label={t("ownerDashboard.avgPerRental")}
            value={formatMoney(m.averageRentalPrice, m.currency)}
            variant="muted"
          />
          <OwnerMetricCard
            label={t("ownerDashboard.avgTripLength")}
            value={`${m.averageTripDurationDays} ${t("ownerDashboard.days")}`}
            variant="muted"
          />
          <OwnerMetricCard
            label={t("ownerDashboard.thisYear")}
            value={formatMoney(m.netEarningsThisYear, m.currency)}
            variant="muted"
          />
        </div>
      </section>

      {/* Upcoming */}
      {upcoming.count > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            {t("ownerDashboard.upcomingBookings")}
          </h2>
          <p className="text-sm text-slate-600">
            {upcoming.count} confirmed booking{upcoming.count !== 1 ? "s" : ""} ·{" "}
            {formatMoney(upcoming.totalEarnings, upcoming.currency)} {t("ownerDashboard.upcomingEarnings")}
          </p>
          <Link
            href="/bookings?tab=listings"
            className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
          >
            View bookings →
          </Link>
        </section>
      )}

    </div>
  );
}
