"use client";

import { useLanguage } from "@/context/LanguageContext";

const LOCATION_SUGGESTIONS = [
  "Tórshavn",
  "Vágar Airport",
  "Klaksvík",
  "Streymoy",
  "Eysturoy",
  "Suðuroy",
];

interface SearchBarProps {
  pickupLocation: string;
  onPickupLocationChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  onSearch: () => void;
}

const inputClass =
  "w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

export default function SearchBar({
  pickupLocation,
  onPickupLocationChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onSearch,
}: SearchBarProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="min-w-0">
        <label htmlFor="search-location" className="mb-1.5 block text-sm font-medium text-slate-700">
          {t("rent.searchLabelLocation")}
        </label>
        <input
          id="search-location"
          type="text"
          list="search-location-suggestions"
          value={pickupLocation}
          onChange={(e) => onPickupLocationChange(e.target.value)}
          placeholder={t("rent.searchLocationPlaceholder")}
          className={inputClass}
        />
        <datalist id="search-location-suggestions">
          {LOCATION_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <div className="min-w-0">
        <label htmlFor="search-pickup" className="mb-1.5 block text-sm font-medium text-slate-700">
          {t("rent.searchLabelPickup")}
        </label>
        <input
          id="search-pickup"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="min-w-0">
        <label htmlFor="search-dropoff" className="mb-1.5 block text-sm font-medium text-slate-700">
          {t("rent.searchLabelDropoff")}
        </label>
        <input
          id="search-dropoff"
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex min-w-0 items-end">
        <button
          type="button"
          onClick={onSearch}
          className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          {t("rent.search")}
        </button>
      </div>
    </div>
  );
}
