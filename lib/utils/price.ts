/**
 * Price formatting and currency utilities.
 * Single source for consistent display across dashboards, admin, bookings, earnings.
 * Use for display in UI; no business logic (pricing rules go in services).
 */

export const DEFAULT_CURRENCY = "DKK";
const DEFAULT_LOCALE = "da-DK";

/**
 * Format amount as currency (e.g. "499 kr." for DKK).
 * Use across admin, owner, renter dashboards, bookings, and earnings.
 */
export function formatCurrency(
  amount: number | string | { toString(): string },
  currency = DEFAULT_CURRENCY
): string {
  const n = typeof amount === "number" ? amount : parseFloat(String(amount));
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Format amount for display (e.g. "499 DKK" or "499 DKK / day").
 * For price-per-day labels; use formatCurrency for totals.
 */
export function formatPrice(
  amount: number,
  options?: { currency?: string; perDay?: boolean; locale?: string }
): string {
  const { currency = DEFAULT_CURRENCY, perDay = false, locale = DEFAULT_LOCALE } = options ?? {};
  const formatted = new Intl.NumberFormat(locale, {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  const suffix = perDay ? ` ${currency} / day` : ` ${currency}`;
  return `${formatted}${suffix}`;
}

/**
 * Parse a string to a safe number for price (e.g. from form input).
 * Returns 0 if invalid or negative.
 */
export function parsePriceInput(value: string | number | undefined): number {
  if (value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
