"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import type { Locale } from "@/lib/i18n";

interface NavbarProps {
  variant?: "light" | "transparent";
}

export default function LanguageSwitcher({ variant = "light" }: NavbarProps) {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isTransparent = variant === "transparent";
  const baseClass = isTransparent
    ? "text-white/90 hover:text-white"
    : "text-slate-600 hover:text-slate-900";

  const options: { value: Locale; label: string }[] = [
    { value: "en", label: "EN" },
    { value: "fo", label: "FO" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition ${baseClass}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {locale.toUpperCase()}
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className={`absolute right-0 top-full z-50 mt-1 min-w-[4rem] rounded-lg border py-1 shadow-lg ${
            isTransparent
              ? "border-white/20 bg-slate-900/95 backdrop-blur"
              : "border-slate-200 bg-white"
          }`}
        >
          {options.map((opt) => (
            <li key={opt.value} role="option">
              <button
                type="button"
                onClick={() => {
                  setLocale(opt.value);
                  setOpen(false);
                }}
                className={`block w-full px-4 py-2 text-left text-sm ${
                  locale === opt.value
                    ? "font-semibold text-emerald-600"
                    : isTransparent
                      ? "text-white/90 hover:bg-white/10"
                      : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
