"use client";

import { useState, useRef, useEffect } from "react";
import type { CarFilters, ListingTypeFilter } from "@/lib/filter-cars";
import { useLanguage } from "@/context/LanguageContext";

const OPTIONS: { value: ListingTypeFilter; labelKey: string }[] = [
  { value: "", labelKey: "rent.listingTypeAny" },
  { value: "car_rental", labelKey: "rent.listingTypeCarRental" },
  { value: "ride_share", labelKey: "rent.listingTypeRideShare" },
];

interface ListingTypeFilterProps {
  filters: CarFilters;
  onFiltersChange: (f: CarFilters) => void;
}

export default function ListingTypeFilter({
  filters,
  onFiltersChange,
}: ListingTypeFilterProps) {
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

  const currentLabel =
    OPTIONS.find((o) => o.value === filters.listingType)?.labelKey ?? "rent.listingTypeAny";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
          filters.listingType ? "text-slate-900" : "text-slate-700"
        }`}
      >
        <span>{t("rent.filterListingType")}: {t(currentLabel)}</span>
        <span className="text-slate-400" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value || "any"}
              type="button"
              onClick={() => {
                onFiltersChange({ ...filters, listingType: opt.value });
                setOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${
                filters.listingType === opt.value
                  ? "bg-emerald-50 font-medium text-emerald-700"
                  : "text-slate-700"
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
