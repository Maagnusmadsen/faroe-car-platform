"use client";

import FilterDropdown from "@/components/FilterDropdown";
import type { CarFilters } from "@/lib/filter-cars";
import { useLanguage } from "@/context/LanguageContext";

const SEAT_VALUES = [5, 6, 7, 9] as const;

interface SeatsFilterProps {
  filters: CarFilters;
  onFiltersChange: (f: CarFilters) => void;
}

export default function SeatsFilter({ filters, onFiltersChange }: SeatsFilterProps) {
  const { t } = useLanguage();
  const value = filters.seats;
  const options = SEAT_VALUES.map((n) => ({
    value: n,
    label: t(`rent.seats${n}`),
  }));

  return (
    <FilterDropdown<number>
      label={t("rent.filterSeats")}
      value={value}
      options={options}
      onChange={(v) => onFiltersChange({ ...filters, seats: v })}
      valueToLabel={(n) => t(`rent.seats${n}`)}
      placeholder={t("rent.any")}
    />
  );
}
