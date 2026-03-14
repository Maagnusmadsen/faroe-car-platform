/**
 * POST /api/stripe/connect/onboard – start Stripe Connect Express onboarding for the current user.
 * Creates a Connect Express account (if needed) and returns an AccountLink URL to redirect the user.
 * After onboarding, Stripe sends account.updated; we store stripeConnectAccountId on the user.
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonSuccess, handleApiError } from "@/lib/utils/api-response";
import { AppError, HttpStatus } from "@/lib/utils/errors";
import { getStripeClient } from "@/payments";
import { prisma } from "@/db";
import { getBaseUrl } from "@/config/env";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, stripeConnectAccountId: true },
    });
    if (!user) {
      throw new AppError("User not found", HttpStatus.NOT_FOUND, "USER_NOT_FOUND");
    }

    const stripe = getStripeClient();
    const baseUrl = getBaseUrl();
    const refreshUrl = `${baseUrl}/my-listings?stripe=refresh`;
    const returnUrl = `${baseUrl}/my-listings?stripe=success`;

    let accountId = user.stripeConnectAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "DK",
        email: user.email ?? undefined,
        metadata: { userId },
      });
      accountId = account.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeConnectAccountId: accountId },
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
    });

    return jsonSuccess({ url: accountLink.url });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return Response.json({ error: e.message }, { status: 401 });
    }
    return handleApiError(err);
  }
}
