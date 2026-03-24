/**
 * Shared booking status labels for admin, bookings, and related UIs.
 */
export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "Pending",
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  PAID: "Paid",
  DISPUTED: "Disputed",
};

/** Tailwind classes for status pills (bookings list, message thread header). */
export function bookingStatusPillClass(status: string): string {
  if (status === "PENDING_APPROVAL") return "bg-amber-100 text-amber-800";
  if (status === "PENDING_PAYMENT") return "bg-sky-100 text-sky-800";
  if (status === "CONFIRMED" || status === "COMPLETED" || status === "PAID") {
    return "bg-brand-light text-slate-800";
  }
  if (status === "REJECTED" || status === "CANCELLED") return "bg-slate-100 text-slate-700";
  return "bg-slate-100 text-slate-700";
}
