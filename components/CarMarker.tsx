"use client";

import Link from "next/link";
import { Popup } from "react-leaflet";
import type { Car } from "@/lib/cars";
import { useLanguage } from "@/context/LanguageContext";

interface CarMarkerProps {
  car: Car;
}

export default function CarMarkerPopup({ car }: CarMarkerProps) {
  const { t } = useLanguage();
  const name = `${car.brand} ${car.model}`;

  return (
    <Popup>
      <div className="min-w-[200px] p-1">
        <h3 className="font-semibold text-slate-900">{name}</h3>
        <p className="mt-1 text-sm text-slate-600">
          {car.pricePerDay} DKK {t("rent.perDay")}
        </p>
        <p className="text-sm text-slate-500">{car.location}</p>
        <Link
          href={`/rent-a-car/${car.id}`}
          className="mt-3 block w-full rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          {t("rent.viewDetails")}
        </Link>
      </div>
    </Popup>
  );
}
