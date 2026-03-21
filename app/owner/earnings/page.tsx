"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import FinancialFlow from "@/components/owner/FinancialFlow";
import { formatMoney } from "@/lib/owner-dashboard-utils";

type PeriodFilter = "month" | "quarter" | "year" | "all" | "custom";

type FinancialRow = {
  grossRevenue: number;
  platformFees: number;
  stripeFeesEstimate: number;
  netPayout: number;
  estimatedVatOwed: number;
  netIncomeBeforeTax: number;
  bookingCount: number;
};

type AnalyticsData = { financialSummary: FinancialRow };

export default function OwnerEarningsPage() {
  const { t } = useLanguage();
  const { user, status } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodFilter>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [vatPercent, setVatPercent] = useState(25);
  const [showAccountantSection, setShowAccountantSection] = useState(false);
  const [hasListings, setHasListings] = useState<boolean | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    const params = new URLSearchParams();
    params.set("period", period);
    if (period === "custom" && customFrom) params.set("from", customFrom);
    if (period === "custom" && customTo) params.set("to", customTo);
    params.set("vatPercent", String(vatPercent));

    setError(null);
    fetch(`/api/owner/analytics?${params}`)
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
  }, [period, customFrom, customTo, vatPercent]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/owner/earnings");
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

  const handleExportCsv = useCallback(() => {
    const from = period === "custom" ? customFrom : undefined;
    const to = period === "custom" ? customTo : undefined;
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/owner/analytics/export?${params}`, "_blank", "noopener");
  }, [period, customFrom, customTo]);

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

  if (loading || !data?.financialSummary) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  const fin = data.financialSummary;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("ownerDashboard.earnings")}</h1>
        <p className="mt-1 text-sm text-slate-500">Financial breakdown by period</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      <div>
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
          <button
            type="button"
            onClick={fetchData}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Update
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Money flow
          </h2>
          <FinancialFlow
            steps={[
              { label: t("ownerDashboard.rentersPaid"), value: fin.grossRevenue, currency: "DKK", type: "positive" },
              { label: t("ownerDashboard.ourFee"), value: fin.platformFees, currency: "DKK", type: "negative" },
            ]}
            resultLabel={t("ownerDashboard.youGet")}
            resultValue={fin.netPayout}
            resultCurrency="DKK"
          />
          <p className="mt-4 text-xs text-slate-500">
            {fin.bookingCount} completed booking{fin.bookingCount !== 1 ? "s" : ""} in this period
          </p>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowAccountantSection(!showAccountantSection)}
            className="text-sm font-medium text-brand hover:underline"
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
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
                >
                  {t("ownerDashboard.exportCSV")}
                </button>
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">Gross revenue</dt><dd className="font-medium">{formatMoney(fin.grossRevenue, "DKK")}</dd></div>
                <div><dt className="text-slate-500">Platform fees</dt><dd className="font-medium">−{formatMoney(fin.platformFees, "DKK")}</dd></div>
                <div><dt className="text-slate-500">Payment fees (est.)</dt><dd className="font-medium">−{formatMoney(fin.stripeFeesEstimate, "DKK")}</dd></div>
                <div><dt className="text-slate-500">Net payout</dt><dd className="font-medium text-brand">{formatMoney(fin.netPayout, "DKK")}</dd></div>
                <div><dt className="text-slate-500">Est. VAT ({vatPercent}%)</dt><dd className="font-medium">−{formatMoney(fin.estimatedVatOwed, "DKK")}</dd></div>
                <div><dt className="text-slate-500">Net before tax</dt><dd className="font-medium">{formatMoney(fin.netIncomeBeforeTax, "DKK")}</dd></div>
              </dl>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-600">
          Pending payouts and payout history are on the{" "}
          <Link href="/owner/payouts" className="font-medium text-brand hover:underline">
            Payouts
          </Link>{" "}
          page.
        </p>
      </div>
    </div>
  );
}
