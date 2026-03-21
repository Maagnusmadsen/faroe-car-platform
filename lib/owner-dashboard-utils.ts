/**
 * Shared utilities for owner dashboard.
 */

import { formatCurrency } from "@/lib/utils/price";

/** Format amount as currency. Use formatCurrency from @/lib/utils/price for new code. */
export const formatMoney = formatCurrency;

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
