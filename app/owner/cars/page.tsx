"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { formatMoney, formatPercent } from "@/lib/owner-dashboard-utils";

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

export default function OwnerCarsPage() {
  const { t } = useLanguage();
  const { user, status } = useAuth();
  const router = useRouter();
  const [hasListings, setHasListings] = useState<boolean | null>(null);
  const [data, setData] = useState<{ carPerformance: CarPerformanceRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<keyof CarPerformanceRow>("totalRevenue");
  const [sortDesc, setSortDesc] = useState(true);

  const fetchData = useCallback(() => {
    fetch("/api/owner/analytics?period=all")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json?.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/owner/cars");
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

  const cars = data.carPerformance ?? [];
  const sortedCars = [...cars].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const numA = typeof aVal === "number" ? aVal : 0;
    const numB = typeof bVal === "number" ? bVal : 0;
    if (sortDesc) return numB - numA;
    return numA - numB;
  });

  const bestCar = cars.length > 0 ? cars.reduce((best, c) => (c.totalRevenue > best.totalRevenue ? c : best)) : null;
  const worstCar = cars.length > 1 ? cars.reduce((worst, c) => (c.totalRevenue < worst.totalRevenue ? c : worst)) : null;

  const cols = [
    ["carName", t("ownerDashboard.carName")],
    ["totalRevenue", t("ownerDashboard.earned")],
    ["totalRentals", t("ownerDashboard.trips")],
    ["averageRating", t("ownerDashboard.rating")],
    ["utilizationRate", t("ownerDashboard.busy")],
    ["averageTripDurationDays", t("ownerDashboard.avgTripLength")],
    ["revenuePerMonth", t("ownerDashboard.perMonth")],
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("ownerDashboard.cars")}</h1>
        <p className="mt-1 text-sm text-slate-500">How each car is performing</p>
      </div>

      {(bestCar || worstCar) && cars.length > 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {bestCar && (
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Best performing</p>
              <Link href={`/rent-a-car/${bestCar.carId}`} className="mt-1 font-semibold text-brand hover:underline">
                {bestCar.carName}
              </Link>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(bestCar.totalRevenue, bestCar.currency)}</p>
            </div>
          )}
          {worstCar && worstCar.carId !== bestCar?.carId && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Lowest performing</p>
              <Link href={`/rent-a-car/${worstCar.carId}`} className="mt-1 font-semibold text-slate-700 hover:underline">
                {worstCar.carName}
              </Link>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(worstCar.totalRevenue, worstCar.currency)}</p>
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {sortedCars.length === 0 ? (
          <p className="p-8 text-center text-slate-600">{t("ownerDashboard.noCars")}</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {cols.map(([key, label]) => (
                  <th
                    key={key}
                    className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-slate-500 hover:text-slate-700"
                    onClick={() => {
                      setSortBy(key);
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
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link href={`/rent-a-car/${row.carId}`} className="font-medium text-brand hover:underline">
                      {row.carName}
                    </Link>
                  </td>
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
        )}
      </div>
    </div>
  );
}
