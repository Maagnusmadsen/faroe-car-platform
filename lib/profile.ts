/**
 * Profile service: load and update user profile.
 * Used by GET/PATCH /api/profile and by server components that need profile data.
 */

import { getSession } from "@/auth/guards";
import { prisma } from "@/db";
import type { UpdateProfileInput } from "@/validation";
import type { VerificationStatus } from "@prisma/client";

/** Fields considered for account completion (used in listings, bookings, trust). */
const COMPLETION_FIELDS = [
  "name",
  "phone",
  "preferredLanguage",
  "avatarUrl",
  "location",
  "city",
] as const;

export interface ProfileWithUser {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  driverLicenseNumber: string | null;
  preferredLanguage: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  postalCode: string | null;
  ownerNote: string | null;
  renterNote: string | null;
  verificationStatus: VerificationStatus;
  completionPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Compute profile completion (0–100) from user + profile fields.
 * Used for prompts and trust; not persisted.
 */
function computeCompletion(user: { name: string | null; image: string | null }, profile: Record<string, unknown> | null): number {
  const has = (key: string) => {
    if (key === "name") return !!user.name?.trim();
    if (key === "avatarUrl") return !!(user.image?.trim() || (profile && (profile.avatarUrl as string)?.trim()));
    if (key === "location") return !!(profile && (profile.location as string)?.trim());
    const v = profile && profile[key];
    return typeof v === "string" ? v.trim().length > 0 : false;
  };
  const filled = COMPLETION_FIELDS.filter((f) => has(f)).length;
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}

/**
 * Get full profile for a user (own profile only in API; service does not check auth).
 * Returns null if user or profile not found.
 */
export async function getProfileByUserId(userId: string): Promise<ProfileWithUser | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { profile: true },
  });
  if (!user) return null;
  const profile = user.profile;
  return {
    id: profile?.id ?? "",
    userId: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    phone: profile?.phone ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    bio: profile?.bio ?? null,
    location: profile?.location ?? null,
    driverLicenseNumber: profile?.driverLicenseNumber ?? null,
    preferredLanguage: profile?.preferredLanguage ?? null,
    country: profile?.country ?? null,
    region: profile?.region ?? null,
    city: profile?.city ?? null,
    postalCode: profile?.postalCode ?? null,
    ownerNote: profile?.ownerNote ?? null,
    renterNote: profile?.renterNote ?? null,
    verificationStatus: profile?.verificationStatus ?? "UNVERIFIED",
    completionPercent: computeCompletion(
      { name: user.name, image: user.image },
      profile ? (profile as unknown as Record<string, unknown>) : null
    ),
    createdAt: profile?.createdAt ?? user.createdAt,
    updatedAt: profile?.updatedAt ?? user.updatedAt,
  };
}

/**
 * Update profile and optionally user name/image for the given userId.
 * Caller must ensure the userId is the authenticated user.
 */
export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<ProfileWithUser> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { profile: true },
  });
  if (!user) {
    const err = new Error("User not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  const userUpdate: { name?: string; image?: string | null } = {};
  if (input.name !== undefined) userUpdate.name = input.name;
  if (input.avatarUrl !== undefined) userUpdate.image = input.avatarUrl ?? null;

  const profileData = {
    ...(input.phone !== undefined && { phone: input.phone }),
    ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
    ...(input.bio !== undefined && { bio: input.bio }),
    ...(input.location !== undefined && { location: input.location }),
    ...(input.driverLicenseNumber !== undefined && { driverLicenseNumber: input.driverLicenseNumber }),
    ...(input.preferredLanguage !== undefined && { preferredLanguage: input.preferredLanguage }),
    ...(input.country !== undefined && { country: input.country }),
    ...(input.region !== undefined && { region: input.region }),
    ...(input.city !== undefined && { city: input.city }),
    ...(input.postalCode !== undefined && { postalCode: input.postalCode }),
    ...(input.ownerNote !== undefined && { ownerNote: input.ownerNote }),
    ...(input.renterNote !== undefined && { renterNote: input.renterNote }),
  };

  await prisma.$transaction(async (tx) => {
    if (Object.keys(userUpdate).length > 0) {
      await tx.user.update({ where: { id: userId }, data: userUpdate });
    }
    if (user.profile) {
      await tx.userProfile.update({ where: { userId }, data: profileData });
    } else {
      await tx.userProfile.create({ data: { userId, ...profileData } });
    }
  });

  const updated = await getProfileByUserId(userId);
  if (!updated) {
    const err = new Error("Profile not found after update") as Error & { statusCode?: number };
    err.statusCode = 500;
    throw err;
  }
  return updated;
}

/**
 * Get the current user's profile if authenticated. For server components.
 */
export async function getCurrentUserProfile(): Promise<ProfileWithUser | null> {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return getProfileByUserId(session.user.id);
}
