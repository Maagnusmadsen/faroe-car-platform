"use client";

import { useState, useRef, useEffect } from "react";
import type { CarFilters as CarFiltersType } from "@/lib/filter-cars";
import type { SortOption } from "@/lib/filter-cars";
import { useLanguage } from "@/context/LanguageContext";

export type SortChipId = "closest" | "bestRated" | null;

const SEAT_OPTIONS = [null, 5, 6, 7, 9] as const;

interface FilterChipsProps {
  filters: CarFiltersType;
  onFiltersChange: (f: CarFiltersType) => void;
  sort?: SortOption;
  onSortChange?: (sort: SortOption) => void;
  /** Which sort chip is selected (null = neither). Enables optional chips. */
  activeSortChip?: SortChipId;
  onSortChipChange?: (chip: SortChipId) => void;
}

type ChipId = "suv" | "4x4" | "automatic" | "under500" | "closest" | "bestRated";

function isChipActive(
  id: ChipId,
  filters: CarFiltersType,
  activeSortChip: SortChipId
): boolean {
  switch (id) {
    case "suv":
    case "4x4":
      return filters.is4x4 === true;
    case "automatic":
      return filters.transmission === "automatic";
    case "under500":
      return filters.priceMax === 500;
    case "closest":
      return activeSortChip === "closest";
    case "bestRated":
      return activeSortChip === "bestRated";
    default:
      return false;
  }
}

function applyChip(
  id: ChipId,
  filters: CarFiltersType,
  onFiltersChange: (f: CarFiltersType) => void,
  activeSortChip: SortChipId,
  onSortChange?: (sort: SortOption) => void,
  onSortChipChange?: (chip: SortChipId) => void
) {
  const isFilterActive = (filterId: ChipId) => {
    switch (filterId) {
      case "suv":
      case "4x4":
        return filters.is4x4 === true;
      case "automatic":
        return filters.transmission === "automatic";
      case "under500":
        return filters.priceMax === 500;
      default:
        return false;
    }
  };

  switch (id) {
    case "suv":
    case "4x4":
      onFiltersChange({ ...filters, is4x4: isFilterActive(id) ? null : true });
      break;
    case "automatic":
      onFiltersChange({
        ...filters,
        transmission: isFilterActive(id) ? "" : "automatic",
      });
      break;
    case "under500":
      onFiltersChange({
        ...filters,
        priceMax: isFilterActive(id) ? null : 500,
      });
      break;
    case "closest":
      if (activeSortChip === "closest") {
        onSortChipChange?.(null);
        onSortChange?.("relevant");
      } else {
        onSortChipChange?.("closest");
        onSortChange?.("relevant");
      }
      break;
    case "bestRated":
      if (activeSortChip === "bestRated") {
        onSortChipChange?.(null);
        onSortChange?.("relevant");
      } else {
        onSortChipChange?.("bestRated");
        onSortChange?.("rating-desc");
      }
      break;
  }
}

export default function FilterChips({
  filters,
  onFiltersChange,
  onSortChange,
  activeSortChip = null,
  onSortChipChange,
}: FilterChipsProps) {
  const { t } = useLanguage();
  const [seatsDropdownOpen, setSeatsDropdownOpen] = useState(false);
  const seatsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!seatsDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (seatsRef.current && !seatsRef.current.contains(e.target as Node)) {
        setSeatsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [seatsDropdownOpen]);

  const chips: { id: ChipId; label: string }[] = [
    { id: "4x4", label: t("rent.chip4x4") },
    { id: "suv", label: t("rent.chipSuv") },
    { id: "automatic", label: t("rent.chipAutomatic") },
    { id: "under500", label: t("rent.chipUnder500") },
    { id: "closest", label: t("rent.chipClosest") },
    { id: "bestRated", label: t("rent.chipBestRated") },
  ];

  const seatsLabel =
    filters.seats != null
      ? `${t("rent.chipSeats")}: ${filters.seats}`
      : t("rent.chipSeats");
  const seatsActive = filters.seats != null;

  const getSeatsOptionLabel = (value: number | null) => {
    if (value === null) return t("rent.seatsAny");
    return t(`rent.seats${value}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map(({ id, label }) => {
        const active = isChipActive(id, filters, activeSortChip);
        return (
          <button
            key={id}
            type="button"
            onClick={() =>
              applyChip(
                id,
                filters,
                onFiltersChange,
                activeSortChip,
                onSortChange,
                onSortChipChange
              )
            }
            className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-brand text-white hover:bg-brand-hover"
                : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        );
      })}

      <div ref={seatsRef} className="relative">
        <button
          type="button"
          onClick={() => setSeatsDropdownOpen((open) => !open)}
          aria-expanded={seatsDropdownOpen}
          aria-haspopup="listbox"
          aria-label={seatsLabel}
          className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
            seatsActive
              ? "bg-brand text-white hover:bg-brand-hover"
              : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          {seatsLabel}
          <span className="ml-1 inline-block translate-y-0.5 opacity-70">
            {seatsDropdownOpen ? "▴" : "▾"}
          </span>
        </button>

        {seatsDropdownOpen && (
          <div
            role="listbox"
            className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {SEAT_OPTIONS.map((value) => (
              <button
                key={value ?? "any"}
                type="button"
                role="option"
                aria-selected={filters.seats === value}
                onClick={() => {
                  onFiltersChange({ ...filters, seats: value });
                  setSeatsDropdownOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${
                  filters.seats === value
                    ? "bg-brand-light font-medium text-brand"
                    : "text-slate-700"
                }`}
              >
                {getSeatsOptionLabel(value)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
