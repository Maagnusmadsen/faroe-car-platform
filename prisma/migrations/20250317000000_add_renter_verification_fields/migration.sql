-- Add dateOfBirth and licenseImageUrl for renter approval (18+ and licence upload).
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "licenseImageUrl" TEXT;
