/**
 * Profile update validation.
 * Used for PATCH /api/profile. All fields optional; only provided fields are updated.
 */

import { z } from "zod";

const LOCALE_REGEX = /^[a-z]{2}(-[A-Z]{2})?$/;

export const updateProfileSchema = z
  .object({
    name: z.string().min(1).max(200).transform((s) => s.trim()).optional(),
    phone: z.string().max(50).transform((s) => s.trim()).optional().nullable(),
    avatarUrl: z.string().url().max(2000).optional().nullable(),
    bio: z.string().max(2000).transform((s) => s.trim()).optional().nullable(),
    location: z.string().max(255).transform((s) => s.trim()).optional().nullable(),
    driverLicenseNumber: z.string().max(100).transform((s) => s.trim()).optional().nullable(),
    preferredLanguage: z.string().max(10).regex(LOCALE_REGEX).optional().nullable(),
    country: z.string().max(100).transform((s) => s.trim()).optional().nullable(),
    region: z.string().max(100).transform((s) => s.trim()).optional().nullable(),
    city: z.string().max(100).transform((s) => s.trim()).optional().nullable(),
    postalCode: z.string().max(20).transform((s) => s.trim()).optional().nullable(),
    ownerNote: z.string().max(2000).transform((s) => s.trim()).optional().nullable(),
    renterNote: z.string().max(2000).transform((s) => s.trim()).optional().nullable(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
