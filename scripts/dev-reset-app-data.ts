/**
 * Dev-only: delete marketplace / transactional data while keeping all User rows
 * (and auth-related rows: Account, Session, UserProfile, VerificationToken).
 *
 * Does NOT delete:
 * - User, Account, Session, VerificationToken, UserProfile
 * - NotificationPreference (user channel prefs)
 * - PlatformFeeConfig (fee rules)
 *
 * Deletes (in FK-safe order):
 * - Payments, payouts, bookings, cars/listings, reviews, messaging, favorites,
 *   saved searches, in-app notifications + notification pipeline rows, audit logs,
 *   Stripe webhook idempotency, message digest pending.
 *
 * Safety:
 * - Refuses to run when NODE_ENV=production or VERCEL_ENV=production
 * - Requires ALLOW_DEV_DATA_RESET=true
 *
 * Run from project root:
 *   ALLOW_DEV_DATA_RESET=true npx tsx scripts/dev-reset-app-data.ts
 *
 * Or:
 *   npm run db:dev-reset-app-data
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function assertDevSafe(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to run: NODE_ENV is production. This script must never run in production."
    );
  }
  if (process.env.VERCEL_ENV === "production") {
    throw new Error(
      "Refusing to run: VERCEL_ENV is production. This script must never run in production."
    );
  }
  if (process.env.ALLOW_DEV_DATA_RESET !== "true") {
    throw new Error(
      "Set ALLOW_DEV_DATA_RESET=true to confirm. This deletes application data but keeps users."
    );
  }
}

async function devResetAppData(): Promise<void> {
  assertDevSafe();

  const userCountBefore = await prisma.user.count();
  if (userCountBefore === 0) {
    console.warn("No users in database; continuing (nothing to preserve).");
  }

  const counts: Record<string, number> = {};

  await prisma.$transaction(async (tx) => {
    const r0 = await tx.payment.deleteMany({});
    counts["Payment"] = r0.count;

    await tx.booking.updateMany({ data: { payoutId: null } });

    const r1 = await tx.payout.deleteMany({});
    counts["Payout"] = r1.count;

    const r2a = await tx.carReview.deleteMany({});
    const r2b = await tx.userReview.deleteMany({});
    counts["CarReview"] = r2a.count;
    counts["UserReview"] = r2b.count;

    const r3a = await tx.message.deleteMany({});
    const r3b = await tx.conversationParticipant.deleteMany({});
    const r3c = await tx.conversation.deleteMany({});
    counts["Message"] = r3a.count;
    counts["ConversationParticipant"] = r3b.count;
    counts["Conversation"] = r3c.count;

    const r4 = await tx.bookingStatusHistory.deleteMany({});
    counts["BookingStatusHistory"] = r4.count;

    const r5 = await tx.booking.deleteMany({});
    counts["Booking"] = r5.count;

    const r6 = await tx.carListing.deleteMany({});
    counts["CarListing"] = r6.count;

    const r7 = await tx.favorite.deleteMany({});
    counts["Favorite"] = r7.count;

    const r8 = await tx.savedSearch.deleteMany({});
    counts["SavedSearch"] = r8.count;

    const r9 = await tx.messageDigestPending.deleteMany({});
    counts["MessageDigestPending"] = r9.count;

    const r10 = await tx.notification.deleteMany({});
    counts["Notification"] = r10.count;

    const r11 = await tx.notificationEvent.deleteMany({});
    counts["NotificationEvent"] = r11.count;

    const r12 = await tx.adminAuditLog.deleteMany({});
    counts["AdminAuditLog"] = r12.count;

    const r13 = await tx.stripeWebhookEvent.deleteMany({});
    counts["StripeWebhookEvent"] = r13.count;
  });

  console.log("Dev reset complete. Deleted rows (non-zero):");
  for (const [table, n] of Object.entries(counts)) {
    if (n > 0) console.log(`  ${table}: ${n}`);
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`  Total rows removed: ${total}`);

  const userCountAfter = await prisma.user.count();
  console.log(`\nUsers preserved: ${userCountAfter} (was ${userCountBefore}).`);
}

async function main() {
  await devResetAppData();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
