"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const OwnerPickupMap = dynamic(
  () => import("@/components/owner-dashboard/OwnerPickupMap"),
  { ssr: false }
);

type PickupPoint = {
  carId: string;
  carName: string;
  latitude: number;
  longitude: number;
  completedBookings: number;
};

type AnalyticsData = {
  pickupLocations: PickupPoint[];
};

export default function OwnerMapPage() {
  const { t } = useLanguage();
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const [hasListings, setHasListings] = useState<boolean | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    fetch(`/api/owner/analytics?period=all`, { cache: "no-store" })
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
    if (authStatus === "unauthenticated") {
      router.replace("/login?callbackUrl=/owner/map");
      return;
    }
    if (authStatus !== "authenticated" || !user) return;

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
  }, [authStatus, user, router, fetchData]);

  if (authStatus !== "authenticated" || !user) return null;

  if (hasListings === false) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <p className="text-slate-600">{t("ownerDashboard.noListingsSubtext")}</p>
        <Link
          href="/list-your-car"
          className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
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

  const points = data.pickupLocations ?? [];

  if (points.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("ownerDashboard.pickupMap")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("ownerDashboard.pickupMapSubtitle")}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <p className="text-slate-600">{t("ownerDashboard.noData")}</p>
          <p className="mt-2 text-sm text-slate-500">Complete rentals to see your cars on the map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("ownerDashboard.pickupMap")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("ownerDashboard.pickupMapSubtitle")}</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <OwnerPickupMap points={points} />
      </div>
    </div>
  );
}
