/**
 * Date utilities for availability and filtering.
 * All dates are treated as local date strings (YYYY-MM-DD).
 */

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Returns true if the range [startA, endA] overlaps [startB, endB] (inclusive). */
export function dateRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = parseDate(startA).getTime();
  const aEnd = parseDate(endA).getTime();
  const bStart = parseDate(startB).getTime();
  const bEnd = parseDate(endB).getTime();
  return aStart <= bEnd && bStart <= aEnd;
}

/** Returns true if the interval [start, end] is valid (start <= end). */
export function isValidDateRange(start: string, end: string): boolean {
  if (!start || !end) return false;
  return parseDate(start).getTime() <= parseDate(end).getTime();
}
