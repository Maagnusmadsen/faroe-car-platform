"use client";

import CarCard from "@/components/CarCard";
import type { Car } from "@/lib/cars";
import { useLanguage } from "@/context/LanguageContext";

interface CarListProps {
  cars: Car[];
  highlightedCarId: string | null;
}

export default function CarList({ cars, highlightedCarId }: CarListProps) {
  const { t } = useLanguage();

  if (cars.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
        {t("rent.noCarsMatch")}
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map((car) => (
        <CarCard
          key={car.id}
          car={car}
          isHighlighted={highlightedCarId === car.id}
        />
      ))}
    </div>
  );
}
