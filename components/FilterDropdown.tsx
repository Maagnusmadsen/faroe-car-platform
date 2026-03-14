"use client";

import { useState, useRef, useEffect } from "react";

export interface FilterOption<T> {
  value: T;
  label: string;
}

interface FilterDropdownProps<T> {
  label: string;
  value: T | null;
  options: FilterOption<T>[];
  onChange: (value: T | null) => void;
  valueToLabel?: (value: T) => string;
  placeholder?: string;
}

export default function FilterDropdown<T extends string | number | boolean>({
  label,
  value,
  options,
  onChange,
  valueToLabel,
  placeholder = "Any",
}: FilterDropdownProps<T>) {
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

  const displayLabel =
    value != null
      ? valueToLabel
        ? valueToLabel(value)
        : options.find((o) => o.value === value)?.label ?? String(value)
      : placeholder;
  const buttonLabel = value != null ? `${label}: ${displayLabel}` : label;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <span className={value != null ? "text-slate-900" : ""}>{buttonLabel}</span>
        <span className="text-slate-400" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={value == null}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${
              value == null ? "bg-emerald-50 font-medium text-emerald-700" : "text-slate-700"
            }`}
          >
            {placeholder}
          </button>
          {options.map((opt) => (
            <button
              key={String(opt.value) + (typeof opt.value === "boolean" ? opt.value : "")}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${
                value === opt.value
                  ? "bg-emerald-50 font-medium text-emerald-700"
                  : "text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
