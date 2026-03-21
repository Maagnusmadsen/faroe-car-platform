"use client";

import Link from "next/link";

export type ActionItem = {
  label: string;
  count: number;
  href: string;
  severity: "urgent" | "warning" | "info";
};

interface ActionCenterProps {
  items: ActionItem[];
  title?: string;
}

const rowStyles = {
  urgent: "bg-red-50 hover:bg-red-100 text-red-900 border-red-100",
  warning: "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-100",
  info: "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-100",
};

const badgeStyles = {
  urgent: "bg-red-200 text-red-900",
  warning: "bg-amber-200 text-amber-900",
  info: "bg-slate-200 text-slate-700",
};

export default function ActionCenter({ items, title = "Action Center" }: ActionCenterProps) {
  const activeItems = items.filter((i) => i.count > 0);
  if (activeItems.length === 0) {
    return (
      <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">No issues require attention right now.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">Click to resolve</p>
      </div>
      <div className="divide-y divide-slate-100">
        {activeItems.map((item) => (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={`flex items-center justify-between border-l-4 px-4 py-3 transition-colors ${rowStyles[item.severity]}`}
          >
            <span className="font-medium">{item.label}</span>
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-sm font-semibold ${badgeStyles[item.severity]}`}
            >
              {item.count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
