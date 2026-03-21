interface OwnerMetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: "primary" | "secondary" | "accent" | "muted";
}

const variantStyles = {
  primary: "border-slate-200 bg-white shadow-sm",
  secondary: "border-slate-200 bg-white",
  accent: "border-brand/20 bg-brand/5",
  muted: "border-slate-100 bg-slate-50/50",
};

export default function OwnerMetricCard({
  label,
  value,
  subtext,
  variant = "secondary",
}: OwnerMetricCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${variantStyles[variant]}`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {subtext && <p className="mt-0.5 text-xs text-slate-500">{subtext}</p>}
    </div>
  );
}
