"use client";

import { useCallback, useMemo, useState } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
import type { MapMouseEvent } from "mapbox-gl";

const FAROE_CENTER = { longitude: -6.95, latitude: 62.0 };
const DEFAULT_ZOOM = 9;

export interface MapboxLocationPickerInnerProps {
  latitude: number | "";
  longitude: number | "";
  onSelect: (lat: number, lng: number) => void;
  className?: string;
}

export function MapboxLocationPickerInner({
  latitude,
  longitude,
  onSelect,
  className = "",
}: MapboxLocationPickerInnerProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const [cursor, setCursor] = useState<string>("grab");

  const hasMarker =
    latitude !== "" &&
    longitude !== "" &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude));
  const lat = hasMarker ? Number(latitude) : FAROE_CENTER.latitude;
  const lng = hasMarker ? Number(longitude) : FAROE_CENTER.longitude;

  const initialViewState = useMemo(
    () => ({
      longitude: lng,
      latitude: lat,
      zoom: hasMarker ? 12 : DEFAULT_ZOOM,
    }),
    [lng, lat, hasMarker]
  );

  const handleClick = useCallback(
    (evt: MapMouseEvent) => {
      evt.originalEvent.preventDefault();
      const { lng: lon, lat: latVal } = evt.lngLat;
      onSelect(latVal, lon);
    },
    [onSelect]
  );

  if (!token) {
    return (
      <div
        className={`flex min-h-[280px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 ${className}`}
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
        onClick={handleClick}
        onMouseEnter={() => setCursor("crosshair")}
        onMouseLeave={() => setCursor("grab")}
        cursor={cursor}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: 280 }}
        attributionControl={true}
      >
        {hasMarker && (
          <Marker longitude={lng} latitude={lat} anchor="bottom" />
        )}
      </Map>
      <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Click on the map to set pickup location.
        {hasMarker &&
          ` Selected: ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`}
      </p>
    </div>
  );
}
