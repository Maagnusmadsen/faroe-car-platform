"use client";

import { useMemo } from "react";
import type { Car } from "@/lib/cars";
import type { CarFilters as CarFiltersType } from "@/lib/filter-cars";
import { useLanguage } from "@/context/LanguageContext";

interface MainFiltersProps {
  cars: Car[];
  filters: CarFiltersType;
  onFiltersChange: (f: CarFiltersType) => void;
}

function getUnique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr)).sort();
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export default function MainFilters({
  cars,
  filters,
  onFiltersChange,
}: MainFiltersProps) {
  const { t } = useLanguage();

  const islands = useMemo(() => getUnique(cars.map((c) => c.island)), [cars]);

  const update = (partial: Partial<CarFiltersType>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-[140px] flex-1">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {t("rent.filterIsland")}
        </label>
        <select
          value={filters.island}
          onChange={(e) => update({ island: e.target.value })}
          className={inputClass}
        >
          <option value="">{t("rent.any")}</option>
          {islands.map((island) => (
            <option key={island} value={island}>
              {island}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-[140px] flex-1">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {t("rent.filterPriceRange")}
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            placeholder={t("rent.minPrice")}
            value={filters.priceMin ?? ""}
            onChange={(e) =>
              update({
                priceMin: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className={inputClass}
          />
          <input
            type="number"
            min={0}
            placeholder={t("rent.maxPrice")}
            value={filters.priceMax ?? ""}
            onChange={(e) =>
              update({
                priceMax: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className={inputClass}
          />
        </div>
      </div>

      <div className="min-w-[120px]">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {t("rent.filter4x4")}
        </label>
        <select
          value={
            filters.is4x4 === null ? "" : filters.is4x4 ? "yes" : "no"
          }
          onChange={(e) => {
            const v = e.target.value;
            update({
              is4x4: v === "" ? null : v === "yes",
            });
          }}
          className={inputClass}
        >
          <option value="">{t("rent.any")}</option>
          <option value="yes">{t("rent.yes")}</option>
          <option value="no">{t("rent.no")}</option>
        </select>
      </div>
    </div>
  );
}
