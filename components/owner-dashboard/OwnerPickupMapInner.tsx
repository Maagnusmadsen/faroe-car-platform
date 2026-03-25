"use client";

import { useMemo } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
import type { PickupPoint } from "./OwnerPickupMap";

const FAROE_CENTER = { lon: -6.95, lat: 62.0 };
const DEFAULT_ZOOM = 8;

interface OwnerPickupMapInnerProps {
  points: PickupPoint[];
  className?: string;
}

export function OwnerPickupMapInner({ points, className = "" }: OwnerPickupMapInnerProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const bounds = useMemo(() => {
    if (points.length === 0) return null;
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    return {
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
    };
  }, [points]);

  const initialViewState = useMemo(() => {
    if (bounds && points.length > 0) {
      return {
        longitude: (bounds.minLng + bounds.maxLng) / 2,
        latitude: (bounds.minLat + bounds.maxLat) / 2,
        zoom: points.length === 1 ? 12 : Math.max(8, 10 - Math.log2(points.length)),
      };
    }
    return { ...FAROE_CENTER, zoom: DEFAULT_ZOOM };
  }, [bounds, points.length]);

  if (!token) {
    return (
      <div
        className={`flex h-[320px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 ${className}`}
      >
        Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to show the map.
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 ${className}`}>
      <Map
        mapboxAccessToken={token}
        initialViewState={initialViewState}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: 320 }}
        attributionControl={true}
        interactive={true}
        scrollZoom={true}
        dragPan={true}
      >
        {points.map((p) => (
          <Marker
            key={p.carId}
            longitude={p.longitude}
            latitude={p.latitude}
            anchor="bottom"
          />
        ))}
      </Map>
    </div>
  );
}
