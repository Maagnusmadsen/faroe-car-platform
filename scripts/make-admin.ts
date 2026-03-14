/**
 * Set a user's role to ADMIN by email.
 * Run: npm run db:make-admin -- your@email.com
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim();
  if (!email) {
    console.error("Usage: npm run db:make-admin -- <email>");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
  });

  if (!user) {
    console.error("No user found with email:", email);
    process.exit(1);
  }

  if (user.role === "ADMIN") {
    console.log("User is already ADMIN:", user.email);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });

  console.log("Updated", user.email, "to ADMIN.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
