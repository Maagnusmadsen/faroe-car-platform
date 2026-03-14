"use client";

import FilterDropdown from "@/components/FilterDropdown";
import type { CarFilters } from "@/lib/filter-cars";
import type { FuelType } from "@/lib/cars";
import { useLanguage } from "@/context/LanguageContext";

const OPTIONS: { value: FuelType; labelKey: string }[] = [
  { value: "petrol", labelKey: "rent.petrol" },
  { value: "diesel", labelKey: "rent.diesel" },
  { value: "electric", labelKey: "rent.electric" },
  { value: "hybrid", labelKey: "rent.hybrid" },
];

interface FuelTypeFilterProps {
  filters: CarFilters;
  onFiltersChange: (f: CarFilters) => void;
}

export default function FuelTypeFilter({
  filters,
  onFiltersChange,
}: FuelTypeFilterProps) {
  const { t } = useLanguage();
  const value = filters.fuelType || null;
  const options = OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }));

  return (
    <FilterDropdown<FuelType>
      label={t("rent.filterFuel")}
      value={value}
      options={options}
      onChange={(v) => onFiltersChange({ ...filters, fuelType: v ?? "" })}
      placeholder={t("rent.any")}
    />
  );
}
