"use client";

interface MetricTooltipProps {
  label: string;
  hint: string;
  className?: string;
}

export default function MetricTooltip({ label, hint, className = "" }: MetricTooltipProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span>{label}</span>
      <span className="group relative inline-flex flex-shrink-0 cursor-help">
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs font-medium transition-colors group-hover:bg-slate-300"
          aria-label={hint}
        >
          i
        </span>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 bottom-full z-20 mb-2 w-52 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-normal text-white shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        >
          {hint}
        </span>
      </span>
    </span>
  );
}
