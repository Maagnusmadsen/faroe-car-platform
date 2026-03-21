"use client";

import { useLanguage } from "@/context/LanguageContext";

interface MapToggleProps {
  showMap: boolean;
  onToggle: () => void;
}

export default function MapToggle({ showMap, onToggle }: MapToggleProps) {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      aria-pressed={showMap}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
      {showMap ? t("rent.showList") : t("rent.showMap")}
    </button>
  );
}
