/**
 * Date utilities for availability and formatting.
 * Re-exports from lib/date-utils and adds any extra helpers in one place.
 */

export {
  parseDate,
  toDateString,
  dateRangesOverlap,
  isValidDateRange,
} from "@/lib/date-utils";

/**
 * Format a YYYY-MM-DD date for display (e.g. "15 Mar 2025").
 */
export function formatDateDisplay(dateStr: string, locale = "en-GB"): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
