/**
 * One-off script: delete all car listings and their bookings.
 * Run from project root: npx tsx scripts/delete-all-listings.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const listingIds = (await prisma.carListing.findMany({ select: { id: true } })).map((r) => r.id);
  console.log("Found", listingIds.length, "car listing(s).");

  if (listingIds.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  const deletedBookings = await prisma.booking.deleteMany({
    where: { carId: { in: listingIds } },
  });
  console.log("Deleted", deletedBookings.count, "booking(s).");

  const deletedListings = await prisma.carListing.deleteMany({});
  console.log("Deleted", deletedListings.count, "listing(s).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
