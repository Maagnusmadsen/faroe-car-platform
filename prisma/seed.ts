/**
 * Prisma seed script. Run with: npx prisma db seed
 * Use for initial platform config and optional dev data.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Default platform fee: 15% (effective from now until overwritten)
  const existingFee = await prisma.platformFeeConfig.findFirst();
  if (!existingFee) {
    await prisma.platformFeeConfig.create({
      data: {
        feeType: "percentage",
        value: 15,
        effectiveFrom: new Date(),
      },
    });
    console.log("Created default PlatformFeeConfig (15% fee)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
