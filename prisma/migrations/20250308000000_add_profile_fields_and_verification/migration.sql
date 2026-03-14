-- VerificationStatus enum and UserProfile columns may already exist from 20250307000000_initial_schema.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VerificationStatus') THEN
    CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED');
  END IF;
END $$;
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "ownerNote" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "renterNote" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';
