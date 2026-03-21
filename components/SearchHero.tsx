"use client";

import SearchBar from "@/components/SearchBar";
import { useLanguage } from "@/context/LanguageContext";

interface SearchHeroProps {
  pickupLocation: string;
  onPickupLocationChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  onSearch: () => void;
}

export default function SearchHero({
  pickupLocation,
  onPickupLocationChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onSearch,
}: SearchHeroProps) {
  const { t } = useLanguage();

  return (
    <section className="bg-slate-50 px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 max-sm:text-balance sm:text-4xl">
          {t("rent.heroHeadline")}
        </h1>
        <p className="mt-3 text-sm text-slate-600 max-sm:px-2 sm:mt-4">
          {t("rent.insuranceBlockTitle")} — {t("rent.insuranceBlockText")}
        </p>
        <div className="mt-6 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/50 sm:mt-8 sm:p-6">
          <SearchBar
            pickupLocation={pickupLocation}
            onPickupLocationChange={onPickupLocationChange}
            startDate={startDate}
            onStartDateChange={onStartDateChange}
            endDate={endDate}
            onEndDateChange={onEndDateChange}
            onSearch={onSearch}
          />
        </div>
      </div>
    </section>
  );
}
