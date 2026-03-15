"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CarDetailContent from "@/components/CarDetailContent";
import { getCarById } from "@/lib/all-cars";
import type { CarDetail } from "@/types/car-detail";

export default function CarDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [car, setCar] = useState<CarDetail | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setCar(null);
      return;
    }
    const fromLocal = getCarById(id);
    if (fromLocal) {
      // Adapt static seed car into CarDetail shape
      setCar({
        ...fromLocal,
        availability: {
          blockedDates: fromLocal.blockedDates ?? [],
          minNoticeDays: 0,
          advanceBookingDays: 365,
          minRentalDays: 1,
        },
        pickup: {
          location: fromLocal.pickupLocation ?? fromLocal.location,
          airportPickup: fromLocal.airportPickup,
          instructions: null,
          options: [],
        },
        features: [],
      });
      return;
    }
    let cancelled = false;
    fetch(`/api/listings/${id}/public`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        setCar(json?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setCar(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (car === undefined) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-slate-500">Loading...</p>
        </div>
        <Footer />
      </main>
    );
  }

  if (car === null) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4">
          <p className="text-center text-lg text-slate-600">
            This listing no longer exists or has been removed.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/rent-a-car"
              className="rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500"
            >
              Browse cars
            </Link>
            <Link
              href="/bookings?tab=listings"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              My listings
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <CarDetailContent car={car} />
      <Footer />
    </main>
  );
}
