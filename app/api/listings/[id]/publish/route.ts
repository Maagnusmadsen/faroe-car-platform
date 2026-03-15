/**
 * POST /api/listings/[id]/publish – publish a draft listing.
 * Body: full ListingWizardData (used for validation only). All steps must be valid.
 * Returns 200 { data: { id, status: "ACTIVE" } } or 400 with validation errors.
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { publishListing } from "@/lib/listings-server";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { parseOrThrow } from "@/lib/utils/validate";
import { listingWizardPayloadSchema } from "@/validation/schemas/car";
import { notFound } from "@/lib/utils/errors";
import type { ListingWizardData } from "@/components/listing-wizard/types";
import { notifyListingPublished } from "@/lib/notifications-server";
import { isStripeConnectReady } from "@/lib/stripe-connect";
import { prisma } from "@/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeConnectAccountId: true },
    });
    const ready = await isStripeConnectReady(user?.stripeConnectAccountId ?? null);
    if (!ready) {
      return Response.json(
        {
          error: "Connect your bank account with Stripe before publishing. Go to My listings and click “Connect with Stripe”.",
          code: "STRIPE_CONNECT_REQUIRED",
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const input = parseOrThrow(listingWizardPayloadSchema, body) as Partial<ListingWizardData>;
    const wizardData = input as ListingWizardData;
    const result = await publishListing(id, session.user.id, wizardData);

    if (result.success) {
      await notifyListingPublished(session.user.id, id);
      return jsonSuccess({ id, status: "ACTIVE" as const });
    }

    if (result.error === "NOT_FOUND") {
      return jsonError(notFound("Listing not found"));
    }
    if (result.error === "NOT_DRAFT") {
      return Response.json(
        { error: "Listing is not a draft", code: "NOT_DRAFT" },
        { status: 400 }
      );
    }
    if (result.error === "STRIPE_CONNECT_REQUIRED") {
      return Response.json(
        {
          error: "Connect your bank account with Stripe before publishing. Go to My listings and click “Connect with Stripe”.",
          code: "STRIPE_CONNECT_REQUIRED",
        },
        { status: 400 }
      );
    }
    if (result.error === "VALIDATION" && result.errors) {
      return Response.json(
        { error: "Validation failed", code: "VALIDATION", details: result.errors },
        { status: 422 }
      );
    }

    return handleApiError(new Error("Publish failed"));
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return Response.json({ error: e.message }, { status: 401 });
    }
    return handleApiError(err);
  }
}
