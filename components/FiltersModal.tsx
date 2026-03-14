"use client";

import { useEffect } from "react";
import type { Car } from "@/lib/cars";
import type { CarFilters as CarFiltersType } from "@/lib/filter-cars";
import MainFilters from "./MainFilters";
import AdvancedFilters from "./AdvancedFilters";
import { useLanguage } from "@/context/LanguageContext";

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  cars: Car[];
  filters: CarFiltersType;
  onFiltersChange: (f: CarFiltersType) => void;
}

export default function FiltersModal({
  isOpen,
  onClose,
  cars,
  filters,
  onFiltersChange,
}: FiltersModalProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="filters-modal-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="filters-modal-title" className="text-lg font-semibold text-slate-900">
            {t("rent.filters")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            <MainFilters cars={cars} filters={filters} onFiltersChange={onFiltersChange} />
            <AdvancedFilters cars={cars} filters={filters} onFiltersChange={onFiltersChange} />
          </div>
        </div>
        <div className="border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            {t("rent.applyFilters")}
          </button>
        </div>
      </div>
    </div>
  );
}
