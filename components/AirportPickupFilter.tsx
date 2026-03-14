"use client";

import FilterDropdown from "@/components/FilterDropdown";
import type { CarFilters } from "@/lib/filter-cars";
import { useLanguage } from "@/context/LanguageContext";

interface AirportPickupFilterProps {
  filters: CarFilters;
  onFiltersChange: (f: CarFilters) => void;
}

export default function AirportPickupFilter({
  filters,
  onFiltersChange,
}: AirportPickupFilterProps) {
  const { t } = useLanguage();
  const value = filters.airportPickupOnly;
  const options = [{ value: true as const, label: t("rent.airportPickupAvailable") }];

  return (
    <FilterDropdown<boolean>
      label={t("rent.filterAirportPickup")}
      value={value}
      options={options}
      onChange={(v) => onFiltersChange({ ...filters, airportPickupOnly: v })}
      valueToLabel={() => t("rent.airportPickupAvailable")}
      placeholder={t("rent.any")}
    />
  );
}
