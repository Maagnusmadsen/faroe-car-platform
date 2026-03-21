/**
 * Platform fee configuration.
 * Single source of truth for commission and service fees.
 * Can be extended later to read from PlatformFeeConfig DB table.
 */

/** Platform commission as % of discounted rental amount. */
export const PLATFORM_COMMISSION_PERCENT = 15;

/** Flat service fee per booking in listing currency (0 = none). */
export const SERVICE_FEE_FLAT = 0;
