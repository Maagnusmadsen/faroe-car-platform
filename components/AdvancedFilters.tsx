"use client";

import { useMemo } from "react";
import type { Car } from "@/lib/cars";
import type { CarFilters as CarFiltersType } from "@/lib/filter-cars";
import { useLanguage } from "@/context/LanguageContext";

interface AdvancedFiltersProps {
  cars: Car[];
  filters: CarFiltersType;
  onFiltersChange: (f: CarFiltersType) => void;
}

function getUnique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr)).sort();
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export default function AdvancedFilters({
  cars,
  filters,
  onFiltersChange,
}: AdvancedFiltersProps) {
  const { t } = useLanguage();

  const towns = useMemo(() => getUnique(cars.map((c) => c.town)), [cars]);

  const update = (partial: Partial<CarFiltersType>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  return (
    <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {t("rent.filterTown")}
        </label>
        <select
          value={filters.town}
          onChange={(e) => update({ town: e.target.value })}
          className={inputClass}
        >
          <option value="">{t("rent.any")}</option>
          {towns.map((town) => (
            <option key={town} value={town}>
              {town}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {t("rent.filterSeats")}
        </label>
        <select
          value={filters.seats ?? ""}
          onChange={(e) =>
            update({
              seats: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          className={inputClass}
        >
          <option value="">{t("rent.any")}</option>
          {[2, 4, 5, 7, 9].map((n) => (
            <option key={n} value={n}>
              {n}+
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {t("rent.filterTransmission")}
        </label>
        <select
          value={filters.transmission}
          onChange={(e) =>
            update({
              transmission: e.target.value as CarFiltersType["transmission"],
            })
          }
          className={inputClass}
        >
          <option value="">{t("rent.any")}</option>
          <option value="automatic">{t("rent.automatic")}</option>
          <option value="manual">{t("rent.manual")}</option>
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {t("rent.filterFuel")}
        </label>
        <select
          value={filters.fuelType}
          onChange={(e) =>
            update({
              fuelType: e.target.value as CarFiltersType["fuelType"],
            })
          }
          className={inputClass}
        >
          <option value="">{t("rent.any")}</option>
          <option value="petrol">{t("rent.petrol")}</option>
          <option value="diesel">{t("rent.diesel")}</option>
          <option value="electric">{t("rent.electric")}</option>
          <option value="hybrid">{t("rent.hybrid")}</option>
        </select>
      </div>
    </div>
  );
}
