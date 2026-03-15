"use client";

import dynamic from "next/dynamic";
import "mapbox-gl/dist/mapbox-gl.css";

const Inner = dynamic(
  () => import("./OwnerPickupMapInner").then((m) => m.OwnerPickupMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-[320px] w-full animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
    ),
  }
);

export interface PickupPoint {
  carId: string;
  carName: string;
  latitude: number;
  longitude: number;
  completedBookings: number;
}

interface OwnerPickupMapProps {
  points: PickupPoint[];
  className?: string;
}

export default function OwnerPickupMap({ points, className = "" }: OwnerPickupMapProps) {
  if (points.length === 0) {
    return (
      <div
        className={`flex h-[320px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 ${className}`}
      >
        No pickup locations to show.
      </div>
    );
  }
  return <Inner points={points} className={className} />;
}
