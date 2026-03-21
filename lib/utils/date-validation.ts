/**
 * Date range validation utilities.
 * Reusable across booking, search, and other flows.
 */

/** Validate endDate > startDate. Both must be YYYY-MM-DD strings. */
export function isDateRangeValid(
  startDate: string,
  endDate: string
): boolean {
  if (!startDate || !endDate) return false;
  return endDate > startDate;
}
