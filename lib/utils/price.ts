/**
 * Price formatting and currency utilities.
 * Use for display in UI and consistent API output. No business logic (pricing rules go in services).
 */

const DEFAULT_CURRENCY = "DKK";

/**
 * Format amount for display (e.g. "499 DKK" or "499 DKK / day").
 * Does not perform conversion; amount is in smallest unit if needed (e.g. øre) – currently we use whole units.
 */
export function formatPrice(
  amount: number,
  options?: { currency?: string; perDay?: boolean; locale?: string }
): string {
  const { currency = DEFAULT_CURRENCY, perDay = false, locale = "da-DK" } = options ?? {};
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
