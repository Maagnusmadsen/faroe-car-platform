"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export interface OwnerOverviewData {
  topMetrics: {
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
  upcomingBookings: { count: number; totalEarnings: number; currency: string };
  payouts: {
    payouts: { id: string; amount: number; currency: string; status: string; createdAt: string }[];
    pendingPayout: { totalAmount: number; currency: string } | null;
    totalPaidOut: { amount: number; currency: string };
  };
}

export function useOwnerDashboard() {
  const { user, status } = useAuth();
  const router = useRouter();
  const [hasListings, setHasListings] = useState<boolean | null>(null);
  const [data, setData] = useState<OwnerOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [analyticsRes, payoutsRes] = await Promise.all([
        fetch("/api/owner/analytics?period=month", { cache: "no-store" }),
        fetch("/api/payouts", { cache: "no-store" }),
      ]);

      const analytics = analyticsRes.ok ? await analyticsRes.json() : null;
      const payouts = payoutsRes.ok ? await payoutsRes.json() : null;

      if (!analytics?.data || !payouts?.data) {
        setError("Failed to load dashboard");
        setData(null);
        return;
      }

      const payoutsData = payouts.data;
      const payoutsNormalized = (payoutsData.payouts ?? []).map((p: { amount: { toString(): string }; [k: string]: unknown }) => ({
        ...p,
        amount: Number(p.amount?.toString?.() ?? 0),
      }));

      setData({
        topMetrics: analytics.data.topMetrics,
        upcomingBookings: analytics.data.upcomingBookings ?? { count: 0, totalEarnings: 0, currency: "DKK" },
        payouts: {
          payouts: payoutsNormalized,
          pendingPayout: payoutsData.pendingPayout ?? null,
          totalPaidOut: payoutsData.totalPaidOut ?? { amount: 0, currency: "DKK" },
        },
      });
    } catch {
      setError("Failed to load dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/owner/dashboard");
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

  return { user, hasListings, data, loading, error, refetch: fetchData };
}
