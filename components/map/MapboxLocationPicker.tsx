"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import "mapbox-gl/dist/mapbox-gl.css";

const FAROE_CENTER = { longitude: -6.95, latitude: 62.0 };
const DEFAULT_ZOOM = 9;

const MapboxMap = dynamic(
  () => import("./MapboxLocationPickerInner").then((m) => m.MapboxLocationPickerInner),
  { ssr: false, loading: () => <div className="min-h-[280px] animate-pulse rounded-xl bg-slate-100" /> }
);

interface MapboxLocationPickerProps {
  latitude: number | "";
  longitude: number | "";
  onSelect: (lat: number, lng: number) => void;
  className?: string;
}

export default function MapboxLocationPicker(props: MapboxLocationPickerProps) {
  return <MapboxMap {...props} />;
}
