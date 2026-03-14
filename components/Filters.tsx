"use client";

import { useState } from "react";
import type { Car } from "@/lib/cars";
import type { CarFilters as CarFiltersType } from "@/lib/filter-cars";
import MainFilters from "./MainFilters";
import AdvancedFilters from "./AdvancedFilters";
import FilterToggle from "./FilterToggle";

interface FiltersProps {
  cars: Car[];
  filters: CarFiltersType;
  onFiltersChange: (f: CarFiltersType) => void;
}

export default function Filters({
  cars,
  filters,
  onFiltersChange,
}: FiltersProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-4">
      <MainFilters
        cars={cars}
        filters={filters}
        onFiltersChange={onFiltersChange}
      />

      <FilterToggle
        expanded={expanded}
        onToggle={() => setExpanded((e) => !e)}
      />

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
        aria-hidden={!expanded}
      >
        <div className="overflow-hidden">
          <AdvancedFilters
            cars={cars}
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
        </div>
      </div>
    </div>
  );
}
