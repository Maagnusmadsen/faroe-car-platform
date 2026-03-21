interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "error" | "muted";
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-brand/15 text-slate-800",
  PAUSED: "bg-amber-100 text-amber-800",
  DRAFT: "bg-slate-100 text-slate-600",
  REJECTED: "bg-red-100 text-red-800",
  COMPLETED: "bg-brand/15 text-slate-800",
  CONFIRMED: "bg-brand/15 text-slate-800",
  PAID: "bg-brand/15 text-slate-800",
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-slate-100 text-slate-600",
  DISPUTED: "bg-red-100 text-red-800",
  VERIFIED: "bg-brand/15 text-slate-800",
  PENDING: "bg-amber-100 text-amber-800",
  UNVERIFIED: "bg-slate-100 text-slate-600",
  FAILED: "bg-red-100 text-red-800",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600";
  const display = status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {display}
    </span>
  );
}
