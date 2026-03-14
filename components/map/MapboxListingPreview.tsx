"use client";

import dynamic from "next/dynamic";
import "mapbox-gl/dist/mapbox-gl.css";

const MapboxListingPreviewInner = dynamic(
  () => import("./MapboxListingPreviewInner").then((m) => m.MapboxListingPreviewInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-[240px] w-full animate-pulse rounded-xl bg-slate-100" />
    ),
  }
);

interface MapboxListingPreviewProps {
  latitude: number;
  longitude: number;
  className?: string;
}

export default function MapboxListingPreview({
  latitude,
  longitude,
  className = "",
}: MapboxListingPreviewProps) {
  return (
    <MapboxListingPreviewInner
      latitude={latitude}
      longitude={longitude}
      className={className}
    />
  );
}
