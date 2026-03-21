interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: "default" | "muted" | "success" | "warning" | "danger";
}

export default function StatCard({ label, value, subtext, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "border-slate-200 bg-white",
    muted: "border-slate-100 bg-slate-50",
    success: "border-brand/20 bg-brand/5",
    warning: "border-amber-200 bg-amber-50",
    danger: "border-red-200 bg-red-50",
  };

  return (
    <div
      className={`rounded-xl border p-4 ${variantStyles[variant]}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {subtext && <p className="mt-0.5 text-sm text-slate-500">{subtext}</p>}
    </div>
  );
}
