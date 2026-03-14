"use client";

import { useState, useRef, useEffect } from "react";
import type { CarFilters } from "@/lib/filter-cars";
import { useLanguage } from "@/context/LanguageContext";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

interface PriceRangeFilterProps {
  filters: CarFilters;
  onFiltersChange: (f: CarFilters) => void;
}

export default function PriceRangeFilter({
  filters,
  onFiltersChange,
}: PriceRangeFilterProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const hasValue = filters.priceMin != null || filters.priceMax != null;
  const displayLabel =
    hasValue && (filters.priceMin != null || filters.priceMax != null)
      ? `${filters.priceMin ?? "—"}–${filters.priceMax ?? "—"} DKK`
      : null;
  const buttonLabel = displayLabel
    ? `${t("rent.filterPrice")}: ${displayLabel}`
    : t("rent.filterPrice");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
          hasValue ? "text-slate-900" : "text-slate-700"
        }`}
      >
        <span>{buttonLabel}</span>
        <span className="text-slate-400" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                {t("rent.minPrice")} (DKK)
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={filters.priceMin ?? ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    priceMin: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                {t("rent.maxPrice")} (DKK)
              </label>
              <input
                type="number"
                min={0}
                placeholder="—"
                value={filters.priceMax ?? ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    priceMax: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
