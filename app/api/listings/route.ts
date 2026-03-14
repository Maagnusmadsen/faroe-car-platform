/**
 * POST /api/listings – create a new draft listing (authenticated owner).
 * Body: optional ListingWizardPayload (partial wizard data). Returns { data: { id, status } }.
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { createDraft } from "@/lib/listings-server";
import { jsonCreated, handleApiError } from "@/lib/utils/api-response";
import { parseOrThrow } from "@/lib/utils/validate";
import { listingWizardPayloadSchema } from "@/validation/schemas/car";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const input = parseOrThrow(listingWizardPayloadSchema, body);
    const listing = await createDraft(session.user.id, input as Partial<import("@/components/listing-wizard/types").ListingWizardData>);
    return jsonCreated({ id: listing.id, status: listing.status });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return Response.json({ error: e.message }, { status: 401 });
    }
    return handleApiError(err);
  }
}
