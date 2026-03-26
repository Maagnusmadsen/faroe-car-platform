/**
 * Sync Supabase Auth user to Prisma User.
 * Call after sign-in/sign-up so our app has a User record (id, role) for API guards.
 *
 * Security invariants:
 * - Email fallback only claims unclaimed users (supabaseUserId IS NULL).
 * - Listings are never transferred between users automatically.
 * - All read-then-write sequences run inside a serializable transaction.
 */

import { prisma } from "@/db";
import { dispatchNotificationEvent } from "@/lib/notifications";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Prisma } from "@prisma/client";
import type { UserRole } from "@prisma/client";

export interface SyncedUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

export async function syncSupabaseUserToPrisma(supabaseUser: SupabaseUser): Promise<SyncedUser | null> {
  const supabaseId = supabaseUser.id;
  const email = supabaseUser.email?.trim().toLowerCase();
  if (!email) return null;

  const name = (supabaseUser.user_metadata?.name as string)?.trim() || null;
  const image = (supabaseUser.user_metadata?.avatar_url as string) || supabaseUser.user_metadata?.picture;
  const emailVerifiedAt = supabaseUser.email_confirmed_at ? new Date(supabaseUser.email_confirmed_at) : null;

  const { user, isNewUser } = await prisma.$transaction(async (tx) => {
    // 1. Canonical lookup: find by Supabase identity (idempotent path)
    const existing = await tx.user.findFirst({
      where: { supabaseUserId: supabaseId, deletedAt: null },
    });

    if (existing) {
      const updated = await tx.user.update({
        where: { id: existing.id },
        data: {
          email,
          name: name ?? existing.name,
          image: image ?? existing.image,
          emailVerified: emailVerifiedAt ?? existing.emailVerified,
        },
      });
      return { user: updated, isNewUser: false };
    }

    // 2. Email fallback: ONLY claim an unclaimed user (no Supabase identity yet)
    const unclaimed = await tx.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        supabaseUserId: null,
        deletedAt: null,
      },
    });

    if (unclaimed) {
      const claimed = await tx.user.update({
        where: { id: unclaimed.id },
        data: {
          supabaseUserId: supabaseId,
          name: name ?? unclaimed.name,
          image: image ?? unclaimed.image,
          emailVerified: emailVerifiedAt ?? unclaimed.emailVerified,
        },
      });
      return { user: claimed, isNewUser: false };
    }

    // 3. Create new user
    try {
      const created = await tx.user.create({
        data: {
          supabaseUserId: supabaseId,
          email,
          name,
          image: image ?? null,
          emailVerified: emailVerifiedAt,
          role: "USER",
        },
      });

      await tx.userProfile.upsert({
        where: { userId: created.id },
        create: { userId: created.id },
        update: {},
      });

      return { user: created, isNewUser: true };
    } catch (err) {
      if (
        !(err instanceof Prisma.PrismaClientKnownRequestError) ||
        err.code !== "P2002"
      )
        throw err;

      // Race: another request created the user between our read and write.
      // Only recover if the conflicting record is still unclaimed.
      const raceUser = await tx.user.findFirst({
        where: {
          email: { equals: email, mode: "insensitive" },
          supabaseUserId: null,
          deletedAt: null,
        },
      });

      if (!raceUser) {
        // The existing user already belongs to another Supabase identity — refuse to hijack.
        throw new Error(
          `[Auth] Cannot sync: email "${email}" is already bound to another identity`
        );
      }

      const claimed = await tx.user.update({
        where: { id: raceUser.id },
        data: {
          supabaseUserId: supabaseId,
          name: name ?? raceUser.name,
          image: image ?? raceUser.image,
          emailVerified: emailVerifiedAt ?? raceUser.emailVerified,
        },
      });
      return { user: claimed, isNewUser: false };
    }
  });

  if (isNewUser) {
    try {
      await dispatchNotificationEvent({
        type: "user.welcome",
        idempotencyKey: `user-welcome-${user.id}`,
        payload: { userId: user.id },
        sourceId: user.id,
        sourceType: "user",
      });
    } catch (err) {
      console.error("[Auth] user.welcome dispatch failed during user sync", {
        userId: user.id,
        error: (err as Error).message,
      });
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
