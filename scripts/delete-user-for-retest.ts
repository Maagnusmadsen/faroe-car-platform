/**
 * Delete a user so you can sign up again with the same email (for testing mail system etc).
 * Deletes from both Supabase Auth and Prisma DB.
 *
 * Run: npx tsx scripts/delete-user-for-retest.ts your@email.com
 */

import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/db";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  const email = process.argv[2]?.trim();
  if (!email) {
    console.error("Usage: npx tsx scripts/delete-user-for-retest.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
    select: { id: true, email: true, supabaseUserId: true },
  });

  if (!user) {
    console.error("No user found with email:", email);
    process.exit(1);
  }

  // 1. Delete from Supabase Auth (so they can sign up again with same email)
  if (user.supabaseUserId && supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase.auth.admin.deleteUser(user.supabaseUserId);
    if (error) {
      console.error("Failed to delete from Supabase Auth:", error.message);
      process.exit(1);
    }
    console.log("Deleted from Supabase Auth");
  } else if (user.supabaseUserId) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  // 2. Delete from Prisma (and cascaded records)
  // Note: Fails if user has Bookings or Payouts (Restrict). For test users that's usually fine.
  const bookingCount = await prisma.booking.count({ where: { renterId: user.id } });
  if (bookingCount > 0) {
    console.error(`User has ${bookingCount} booking(s). Cannot delete. Remove bookings first or use a user without bookings.`);
    process.exit(1);
  }
  const payoutCount = await prisma.payout.count({ where: { userId: user.id } });
  if (payoutCount > 0) {
    console.error(`User has ${payoutCount} payout(s). Cannot delete.`);
    process.exit(1);
  }
  await prisma.user.delete({ where: { id: user.id } });

  console.log("Deleted user from database:", user.email);
  console.log("You can now sign up again with", email, "to trigger user.welcome and test the mail system.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
