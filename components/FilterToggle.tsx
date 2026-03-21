"use client";

import { useLanguage } from "@/context/LanguageContext";

interface FilterToggleProps {
  expanded: boolean;
  onToggle: () => void;
}

export default function FilterToggle({ expanded, onToggle }: FilterToggleProps) {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
    >
      <span>{expanded ? t("rent.fewerFilters") : t("rent.moreFilters")}</span>
      <svg
        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );
}
