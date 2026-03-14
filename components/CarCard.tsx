"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import type { Car } from "@/lib/cars";

interface CarCardProps {
  car: Car;
  isHighlighted?: boolean;
  startDate?: string;
  endDate?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (carId: string) => void;
}

export default function CarCard({
  car,
  isHighlighted = false,
  startDate,
  endDate,
  isFavorite = false,
  onToggleFavorite,
}: CarCardProps) {
  const { t } = useLanguage();
  const name = car.title?.trim() || `${car.brand} ${car.model}`;

  const href =
    startDate && endDate
      ? `/rent-a-car/${car.id}?start=${encodeURIComponent(
          startDate
        )}&end=${encodeURIComponent(endDate)}`
      : `/rent-a-car/${car.id}`;

  return (
    <article
      id={`car-${car.id}`}
      className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-lg ${
        isHighlighted
          ? "border-emerald-500 ring-2 ring-emerald-500/30"
          : "border-slate-200"
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <Image
          src={car.imageUrl}
          alt={name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <div className="flex flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
          </div>
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(car.id)}
              className="text-sm text-slate-500 hover:text-emerald-600"
              aria-label={isFavorite ? t("rent.removeFavorite") : t("rent.addFavorite")}
            >
              {isFavorite ? "★" : "☆"}
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">{car.location}</p>
        <p className="mt-2 text-sm text-slate-600">
          ★ {car.rating} {t("rent.rating")}
        </p>
        <p className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
          {car.pricePerDay} DKK
          <span className="ml-1 text-base font-normal text-slate-500">
            {t("rent.perDay")}
          </span>
        </p>
        <Link
          href={href}
          className="mt-4 block w-full rounded-xl bg-emerald-600 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          {t("rent.viewDetails")}
        </Link>
      </div>
    </article>
  );
}
