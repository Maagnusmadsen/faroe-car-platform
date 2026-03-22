/**
 * Reset database to a clean state for testing.
 * Keeps only admin users. Deletes all listings, bookings, payments, and related data.
 *
 * Run: npx tsx scripts/reset-database.ts
 * Or:  npm run db:reset
 *
 * Idempotent: safe to run multiple times.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function resetDatabase(): Promise<void> {
  const adminCount = await prisma.user.count({ where: { role: "ADMIN", deletedAt: null } });
  if (adminCount === 0) {
    throw new Error("No admin user found. Create an admin first (e.g. npm run db:make-admin -- your@email.com).");
  }

  const counts: Record<string, number> = {};

  // Deletion order: respect foreign keys. Delete children before parents where Restrict applies.

  // 1. Payment (optional bookingId; no Restrict blocking)
  const r1 = await prisma.payment.deleteMany({});
  counts["Payment"] = r1.count;

  // 2. Unlink Booking -> Payout so we can delete Payout
  await prisma.booking.updateMany({ data: { payoutId: null } });

  // 3. Payout (references User with Restrict)
  const r2 = await prisma.payout.deleteMany({});
  counts["Payout"] = r2.count;

  // 4. CarReview, UserReview (reference Booking, User)
  const r3a = await prisma.carReview.deleteMany({});
  const r3b = await prisma.userReview.deleteMany({});
  counts["CarReview"] = r3a.count;
  counts["UserReview"] = r3b.count;

  // 5. Message -> ConversationParticipant -> Conversation (Conversation references Booking)
  const r4a = await prisma.message.deleteMany({});
  const r4b = await prisma.conversationParticipant.deleteMany({});
  const r4c = await prisma.conversation.deleteMany({});
  counts["Message"] = r4a.count;
  counts["ConversationParticipant"] = r4b.count;
  counts["Conversation"] = r4c.count;

  // 6. BookingStatusHistory (references Booking)
  const r5 = await prisma.bookingStatusHistory.deleteMany({});
  counts["BookingStatusHistory"] = r5.count;

  // 7. Booking (references CarListing Restrict, User Restrict)
  const r6 = await prisma.booking.deleteMany({});
  counts["Booking"] = r6.count;

  // 8. CarListing (cascades: CarImage, CarFeature, CarAvailabilityRule, CarBlockedDate, PickupOption)
  const r7 = await prisma.carListing.deleteMany({});
  counts["CarListing"] = r7.count;

  // 9. Favorite (references User, CarListing)
  const r8 = await prisma.favorite.deleteMany({});
  counts["Favorite"] = r8.count;

  // 10. MessageDigestPending
  const r9 = await prisma.messageDigestPending.deleteMany({});
  counts["MessageDigestPending"] = r9.count;

  // 11. NotificationEvent (cascades NotificationDelivery, EmailLog)
  const r10 = await prisma.notificationEvent.deleteMany({});
  counts["NotificationEvent"] = r10.count;

  // 12. NotificationPreference
  const r11 = await prisma.notificationPreference.deleteMany({});
  counts["NotificationPreference"] = r11.count;

  // 13. Notification
  const r12 = await prisma.notification.deleteMany({});
  counts["Notification"] = r12.count;

  // 14. SavedSearch
  const r13 = await prisma.savedSearch.deleteMany({});
  counts["SavedSearch"] = r13.count;

  // 15. AdminAuditLog (optional: clear for clean state; userId SetNull so safe)
  const r14 = await prisma.adminAuditLog.deleteMany({});
  counts["AdminAuditLog"] = r14.count;

  // 16. StripeWebhookEvent (optional: clean idempotency records)
  const r15 = await prisma.stripeWebhookEvent.deleteMany({});
  counts["StripeWebhookEvent"] = r15.count;

  // 17. Delete non-admin users (cascades: Account, Session, UserProfile)
  const nonAdminIds = (
    await prisma.user.findMany({
      where: { role: "USER", deletedAt: null },
      select: { id: true },
    })
  ).map((u) => u.id);

  const r16 = await prisma.user.deleteMany({
    where: { id: { in: nonAdminIds } },
  });
  counts["User (non-admin)"] = r16.count;

  // Log summary
  console.log("Reset complete. Deleted:");
  for (const [table, n] of Object.entries(counts)) {
    if (n > 0) console.log(`  ${table}: ${n}`);
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`  Total rows: ${total}`);

  const remainingAdmins = await prisma.user.count({ where: { role: "ADMIN", deletedAt: null } });
  console.log(`\nRemaining: ${remainingAdmins} admin user(s).`);
}

async function main() {
  await resetDatabase();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
