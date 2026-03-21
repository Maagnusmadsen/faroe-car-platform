"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import OwnerMetricCard from "@/components/owner/OwnerMetricCard";
import { formatMoney } from "@/lib/owner-dashboard-utils";

type PayoutsData = {
  payouts: { id: string; amount: number; currency: string; status: string; createdAt: string }[];
  pendingPayout: { totalAmount: number; currency: string } | null;
  totalPaidOut: { amount: number; currency: string };
};

export default function OwnerPayoutsPage() {
  const { t } = useLanguage();
  const { user, status } = useAuth();
  const router = useRouter();
  const [hasListings, setHasListings] = useState<boolean | null>(null);
  const [data, setData] = useState<PayoutsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/payouts", { cache: "no-store" });
    if (!res.ok) {
      setData(null);
      return;
    }
    const json = await res.json();
    const d = json?.data;
    if (!d) {
      setData(null);
      return;
    }
    const payouts = (d.payouts ?? []).map((p: { amount: { toString?: () => string }; [k: string]: unknown }) => ({
      ...p,
      amount: Number(p.amount?.toString?.() ?? p.amount ?? 0),
    }));
    setData({
      payouts,
      pendingPayout: d.pendingPayout ?? null,
      totalPaidOut: d.totalPaidOut ?? { amount: 0, currency: "DKK" },
    });
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/owner/payouts");
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
      })
      .catch(() => setHasListings(false))
      .finally(() => setLoading(false));
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

  const pending = data.pendingPayout;
  const totalPaid = data.totalPaidOut;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("ownerDashboard.payouts")}</h1>
        <p className="mt-1 text-sm text-slate-500">Money on the way and payout history</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <OwnerMetricCard
          label={t("ownerDashboard.moneyOnTheWay")}
          value={pending && pending.totalAmount > 0 ? formatMoney(pending.totalAmount, pending.currency) : "—"}
          subtext={pending && pending.totalAmount > 0 ? t("ownerDashboard.moneyOnTheWayHint") : undefined}
          variant="accent"
        />
        <OwnerMetricCard
          label={t("ownerDashboard.totalPaidOut")}
          value={formatMoney(totalPaid.amount, totalPaid.currency)}
          variant="secondary"
        />
      </div>

      {pending && pending.totalAmount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-medium text-amber-900">{t("ownerDashboard.moneyOnTheWay")}</p>
          <p className="mt-1 text-sm text-amber-700">{t("ownerDashboard.moneyOnTheWayHint")}</p>
          <p className="mt-2 text-2xl font-bold text-amber-900">
            {formatMoney(pending.totalAmount, pending.currency)}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">{t("ownerDashboard.alreadyPaidOut")}</h2>
          <p className="text-sm text-slate-500">Past payouts to your bank account</p>
        </div>
        {data.payouts.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No payouts yet</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-slate-900">{new Date(p.createdAt).toLocaleDateString()}</p>
                  <p className="text-xs text-slate-500">
                    {p.status === "COMPLETED" ? "Paid" : p.status === "PENDING" ? "Processing" : p.status}
                  </p>
                </div>
                <span className="font-semibold text-slate-900">{formatMoney(p.amount, p.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
