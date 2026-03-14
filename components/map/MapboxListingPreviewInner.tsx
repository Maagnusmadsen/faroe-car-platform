"use client";

import { useMemo } from "react";
import Map, { Marker } from "react-map-gl/mapbox";

const DEFAULT_ZOOM = 13;

export interface MapboxListingPreviewInnerProps {
  latitude: number;
  longitude: number;
  className?: string;
}

export function MapboxListingPreviewInner({
  latitude,
  longitude,
  className = "",
}: MapboxListingPreviewInnerProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const initialViewState = useMemo(
    () => ({
      longitude,
      latitude,
      zoom: DEFAULT_ZOOM,
    }),
    [longitude, latitude]
  );

  if (!token) {
    return (
      <div
        className={`flex h-[240px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 ${className}`}
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
        style={{ width: "100%", height: 240 }}
        attributionControl={true}
        interactive={true}
        scrollZoom={true}
        dragPan={true}
      >
        <Marker longitude={longitude} latitude={latitude} anchor="bottom" />
      </Map>
    </div>
  );
}
