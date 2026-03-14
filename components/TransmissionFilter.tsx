"use client";

import FilterDropdown from "@/components/FilterDropdown";
import type { CarFilters } from "@/lib/filter-cars";
import type { Transmission } from "@/lib/cars";
import { useLanguage } from "@/context/LanguageContext";

const OPTIONS: { value: Transmission; labelKey: string }[] = [
  { value: "automatic", labelKey: "rent.automatic" },
  { value: "manual", labelKey: "rent.manual" },
];

interface TransmissionFilterProps {
  filters: CarFilters;
  onFiltersChange: (f: CarFilters) => void;
}

export default function TransmissionFilter({
  filters,
  onFiltersChange,
}: TransmissionFilterProps) {
  const { t } = useLanguage();
  const value = filters.transmission || null;
  const options = OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }));

  return (
    <FilterDropdown<Transmission>
      label={t("rent.filterTransmission")}
      value={value}
      options={options}
      onChange={(v) => onFiltersChange({ ...filters, transmission: v ?? "" })}
      placeholder={t("rent.any")}
    />
  );
}
