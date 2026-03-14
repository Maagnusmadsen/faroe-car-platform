"use client";

import { useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Car } from "@/lib/cars";
import CarMarkerPopup from "./CarMarker";

// Fix default icon in Next.js/Leaflet (otherwise markers show broken)
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

const FAROE_CENTER: [number, number] = [62.0, -6.95];
const DEFAULT_ZOOM = 9;

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

function MapViewportReporter({
  onViewportChange,
}: {
  onViewportChange: (bounds: MapBounds) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onViewportChange({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    },
  });

  useEffect(() => {
    const b = map.getBounds();
    onViewportChange({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  }, [map, onViewportChange]);

  return null;
}

interface CarMapProps {
  cars: Car[];
  className?: string;
  highlightedCarId?: string | null;
  onMarkerClick?: (carId: string) => void;
  onViewportChange?: (bounds: MapBounds) => void;
}

export default function CarMap({
  cars,
  className = "",
  highlightedCarId = null,
  onMarkerClick,
  onViewportChange,
}: CarMapProps) {
  const viewportChangeRef = useRef(onViewportChange);
  viewportChangeRef.current = onViewportChange;

  const handleViewportChange = useRef((bounds: MapBounds) => {
    viewportChangeRef.current?.(bounds);
  }).current;

  return (
    <div className={className}>
      <MapContainer
        center={FAROE_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full min-h-[400px] w-full rounded-2xl border border-slate-200"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onViewportChange && (
          <MapViewportReporter onViewportChange={handleViewportChange} />
        )}
        {cars.map((car) => (
          <Marker
            key={car.id}
            position={[car.latitude, car.longitude]}
            title={`${car.brand} ${car.model}`}
            eventHandlers={{
              click: () => onMarkerClick?.(car.id),
            }}
            zIndexOffset={highlightedCarId === car.id ? 1000 : 0}
          >
            <CarMarkerPopup car={car} />
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
