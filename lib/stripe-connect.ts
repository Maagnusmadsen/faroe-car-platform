/**
 * Stripe Connect helpers. Used by owner dashboard and publish listing.
 */

import { getStripeClient } from "@/payments";

/** True only when the Connect account has completed onboarding (details_submitted). */
export async function isStripeConnectReady(accountId: string | null): Promise<boolean> {
  if (!accountId) return false;
  try {
    const stripe = getStripeClient();
    const account = await stripe.accounts.retrieve(accountId);
    return account.details_submitted === true;
  } catch {
    return false;
  }
}
