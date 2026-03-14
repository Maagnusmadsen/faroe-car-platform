/**
 * GET /api/listings/[id] – get listing for owner (draft or own listing). Returns wizard-shaped data.
 * PATCH /api/listings/[id] – update draft (partial wizard payload). Returns updated listing id.
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import {
  getListingForOwner,
  updateDraft,
  deleteListing,
  listingToWizardData,
} from "@/lib/listings-server";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { parseOrThrow } from "@/lib/utils/validate";
import { listingWizardPayloadSchema } from "@/validation/schemas/car";
import { notFound } from "@/lib/utils/errors";
import type { ListingWizardData } from "@/components/listing-wizard/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const listing = await getListingForOwner(id, session.user.id);
    if (!listing) {
      return jsonError(notFound("Listing not found"));
    }
    const wizardData = listingToWizardData(listing);
    return jsonSuccess(wizardData);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return Response.json({ error: e.message }, { status: 401 });
    }
    return handleApiError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const input = parseOrThrow(listingWizardPayloadSchema, body);
    const updated = await updateDraft(id, session.user.id, input as Partial<ListingWizardData>);
    if (!updated) {
      return jsonError(notFound("Listing not found or not a draft"));
    }
    return jsonSuccess({ id: updated.id, status: updated.status });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return Response.json({ error: e.message }, { status: 401 });
    }
    return handleApiError(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const deleted = await deleteListing(id, session.user.id);
    if (!deleted) {
      return jsonError(notFound("Listing not found"));
    }
    return jsonSuccess({ deleted: true });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 401) {
      return Response.json({ error: e.message }, { status: 401 });
    }
    return handleApiError(err);
  }
}
