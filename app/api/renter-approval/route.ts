/**
 * POST /api/renter-approval – submit renter verification (DOB 18+ and driving licence) or legacy "request approval".
 * - FormData (multipart): dateOfBirth (YYYY-MM-DD), driverLicenseNumber (optional), file (licence image) → validates 18+, uploads image, sets PENDING.
 * - JSON body {} or no body: legacy flow, sets PENDING without DOB/licence.
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/auth/guards";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/utils/api-response";
import { requestRenterApproval, submitRenterVerification } from "@/lib/profile";
import { getStorage, isAllowedImageType, MAX_IMAGE_SIZE_BYTES, generateVerificationLicenseKey } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const contentType = request.headers.get("content-type") ?? "";
    const isForm = contentType.includes("multipart/form-data");

    if (isForm) {
      const formData = await request.formData();
      const dateOfBirthRaw = formData.get("dateOfBirth");
      const driverLicenseNumber = (formData.get("driverLicenseNumber") as string)?.trim() || null;
      const file = formData.get("file");

      if (!dateOfBirthRaw || typeof dateOfBirthRaw !== "string") {
        return jsonError("Date of birth is required.", 400);
      }
      const dateOfBirth = new Date(dateOfBirthRaw + "T12:00:00.000Z");
      if (Number.isNaN(dateOfBirth.getTime())) {
        return jsonError("Invalid date of birth.", 400);
      }

      let licenseImageUrl: string | null = null;
      if (file && file instanceof File) {
        const buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
          return jsonError("File too large. Max 5MB.", 400);
        }
        const contentType = file.type || "image/jpeg";
        if (!isAllowedImageType(contentType)) {
          return jsonError("Invalid file type. Use JPEG, PNG or WebP.", 400);
        }
        const storage = getStorage();
        const key = generateVerificationLicenseKey(session.user.id, contentType);
        licenseImageUrl = await storage.upload(buffer, key, contentType);
      }

      const profile = await submitRenterVerification(session.user.id, {
        dateOfBirth,
        driverLicenseNumber,
        licenseImageUrl,
      });
      if (!profile) {
        return jsonError("Profile not found", 404);
      }
      return jsonSuccess({
        verificationStatus: profile.verificationStatus,
        message: "Verification submitted. We will review your details and approve you within one business day.",
      });
    }

    const profile = await requestRenterApproval(session.user.id);
    if (!profile) {
      return jsonError("Profile not found", 404);
    }
    return jsonSuccess({
      verificationStatus: profile.verificationStatus,
      message:
        profile.verificationStatus === "PENDING"
          ? "Approval requested. We will review your request shortly."
          : profile.verificationStatus === "VERIFIED"
            ? "You are already approved to rent."
            : "Your approval request has been recorded.",
    });
  } catch (err) {
    const e = err as Error & { statusCode?: number; code?: string };
    if (e.statusCode === 401) {
      return jsonError(e.message, 401);
    }
    if (e.statusCode === 400 && e.code === "UNDER_18") {
      return jsonError(e.message, 400);
    }
    return handleApiError(err);
  }
}
