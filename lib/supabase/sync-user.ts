/**
 * Sync Supabase Auth user to Prisma User.
 * Call after sign-in/sign-up so our app has a User record (id, role) for API guards.
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

  let user = await prisma.user.findFirst({
    where: { supabaseUserId: supabaseId, deletedAt: null },
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        name: name ?? user.name,
        image: image ?? user.image,
        emailVerified: supabaseUser.email_confirmed_at ? new Date(supabaseUser.email_confirmed_at) : user.emailVerified,
      },
    });
    // If another user with same email has listings, move those listings to this user (merge duplicates)
    const otherWithSameEmail = await prisma.user.findFirst({
      where: {
        id: { not: user.id },
        email: { equals: email, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (otherWithSameEmail) {
      await prisma.carListing.updateMany({
        where: { ownerId: otherWithSameEmail.id },
        data: { ownerId: user.id },
      });
    }
  } else {
    const existingByEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
    });
    if (existingByEmail) {
      await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { supabaseUserId: supabaseId },
      });
      user = await prisma.user.findUniqueOrThrow({ where: { id: existingByEmail.id } });
    } else {
      try {
        user = await prisma.user.create({
          data: {
            supabaseUserId: supabaseId,
            email,
            name,
            image: image ?? null,
            emailVerified: supabaseUser.email_confirmed_at ? new Date(supabaseUser.email_confirmed_at) : null,
            role: "USER",
          },
        });
      } catch (err) {
        // Race-safe fallback: another request may have created same user between read and create.
        const isUniqueConstraintError =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
        if (!isUniqueConstraintError) throw err;

        // For auth sync reliability, recover by binding the Supabase user to an existing app user by email.
        const existingAfterRace = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
        });
        if (!existingAfterRace) throw err;

        await prisma.user.update({
          where: { id: existingAfterRace.id },
          data: { supabaseUserId: supabaseId },
        });
        user = await prisma.user.findUniqueOrThrow({ where: { id: existingAfterRace.id } });
      }
      await prisma.userProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
      try {
        await dispatchNotificationEvent({
          type: "user.welcome",
          idempotencyKey: `user-welcome-${user.id}`,
          payload: { userId: user.id },
          sourceId: user.id,
          sourceType: "user",
        });
      } catch (err) {
        // Never block auth/session sync on notification failures.
        console.error("[Auth] user.welcome dispatch failed during user sync", {
          userId: user.id,
          error: (err as Error).message,
        });
      }
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
