"use client";

import { useState, useRef, useEffect } from "react";
import type { SortOption } from "@/lib/filter-cars";
import { useLanguage } from "@/context/LanguageContext";

const SORT_OPTIONS: { value: SortOption; labelKey: string }[] = [
  { value: "newest", labelKey: "rent.newest" },
  { value: "price-asc", labelKey: "rent.lowestPrice" },
  { value: "price-desc", labelKey: "rent.highestPrice" },
  { value: "relevant", labelKey: "rent.mostRelevant" },
  { value: "rating-desc", labelKey: "rent.highestRating" },
];

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export default function SortDropdown({ value, onChange }: SortDropdownProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const currentLabel = SORT_OPTIONS.find((o) => o.value === value)?.labelKey ?? "rent.newest";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      >
        <span>{t("rent.sortBy")}: {t(currentLabel)}</span>
        <span className="text-slate-400" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${
                value === opt.value
                  ? "bg-brand-light font-medium text-brand"
                  : "text-slate-700"
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
