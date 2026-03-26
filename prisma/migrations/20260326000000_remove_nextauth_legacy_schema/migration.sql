-- Remove legacy NextAuth tables and fields (replaced by Supabase Auth)
-- Safe to apply: Account, Session, VerificationToken are unused; passwordHash was never populated

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropIndex
DROP INDEX "Account_userId_idx";

-- DropIndex
DROP INDEX "Account_provider_providerAccountId_key";

-- DropIndex
DROP INDEX "Session_sessionToken_key";

-- DropIndex
DROP INDEX "Session_userId_idx";

-- DropIndex
DROP INDEX "VerificationToken_token_key";

-- DropIndex
DROP INDEX "VerificationToken_identifier_token_key";

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "VerificationToken";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "passwordHash";
