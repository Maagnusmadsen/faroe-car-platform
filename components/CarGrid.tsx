"use client";

import CarCard from "@/components/CarCard";
import type { Car } from "@/lib/cars";
import { useLanguage } from "@/context/LanguageContext";

interface CarGridProps {
  cars: Car[];
  highlightedCarId?: string | null;
  startDate?: string;
  endDate?: string;
  favoriteIds?: Set<string>;
  onToggleFavorite?: (carId: string) => void;
}

export default function CarGrid({
  cars,
  highlightedCarId = null,
  startDate,
  endDate,
  favoriteIds,
  onToggleFavorite,
}: CarGridProps) {
  const { t } = useLanguage();

  if (cars.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-600">
        {t("rent.noCarsMatch")}
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cars.map((car) => (
        <CarCard
          key={car.id}
          car={car}
          startDate={startDate}
          endDate={endDate}
          isFavorite={favoriteIds?.has(car.id) ?? false}
          onToggleFavorite={onToggleFavorite}
          isHighlighted={highlightedCarId === car.id}
        />
      ))}
    </div>
  );
}
