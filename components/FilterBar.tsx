"use client";

import type { CarFilters, SortOption } from "@/lib/filter-cars";
import { defaultCarFilters } from "@/lib/filter-cars";
import ListingTypeFilter from "@/components/ListingTypeFilter";
import TransmissionFilter from "@/components/TransmissionFilter";
import SeatsFilter from "@/components/SeatsFilter";
import FuelTypeFilter from "@/components/FuelTypeFilter";
import PriceRangeFilter from "@/components/PriceRangeFilter";
import AirportPickupFilter from "@/components/AirportPickupFilter";
import SortDropdown from "@/components/SortDropdown";
import { useLanguage } from "@/context/LanguageContext";

function hasActiveFilters(f: CarFilters): boolean {
  return (
    f.listingType !== "" ||
    f.transmission !== "" ||
    f.seats != null ||
    f.fuelType !== "" ||
    f.priceMin != null ||
    f.priceMax != null ||
    f.airportPickupOnly === true ||
    f.island !== "" ||
    f.town !== ""
  );
}

interface FilterBarProps {
  filters: CarFilters;
  onFiltersChange: (f: CarFilters) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  onMoreFiltersClick: () => void;
}

export default function FilterBar({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  onMoreFiltersClick,
}: FilterBarProps) {
  const { t } = useLanguage();
  const showReset = hasActiveFilters(filters);

  return (
    <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
      <div className="flex min-w-max flex-nowrap items-center gap-2 sm:min-w-0 sm:flex-wrap sm:flex-1">
      <ListingTypeFilter filters={filters} onFiltersChange={onFiltersChange} />
      <TransmissionFilter filters={filters} onFiltersChange={onFiltersChange} />
      <SeatsFilter filters={filters} onFiltersChange={onFiltersChange} />
      <FuelTypeFilter filters={filters} onFiltersChange={onFiltersChange} />
      <PriceRangeFilter filters={filters} onFiltersChange={onFiltersChange} />
      <AirportPickupFilter filters={filters} onFiltersChange={onFiltersChange} />
      <SortDropdown value={sort} onChange={onSortChange} />
      <button
        type="button"
        onClick={onMoreFiltersClick}
        className="flex min-h-[44px] shrink-0 items-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        {t("rent.moreFilters")}
      </button>
      {showReset && (
        <button
          type="button"
          onClick={() => onFiltersChange(defaultCarFilters)}
          className="flex min-h-[44px] shrink-0 items-center rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 underline-offset-2 hover:underline"
        >
          {t("rent.resetFilters")}
        </button>
      )}
      </div>
    </div>
  );
}
