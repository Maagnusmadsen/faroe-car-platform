-- Manual migration: BookingStatus enum additions, CarListing moderation fields, Message.updatedAt
-- Run in Supabase SQL Editor if you prefer not to use Prisma db push.
-- Prisma db push will also apply these changes from schema.prisma.

-- 1) Add new enum values to BookingStatus (PostgreSQL: add to existing enum)
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'PAID';

-- 2) CarListing: add moderation columns (if not exists)
ALTER TABLE "CarListing"
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP(3);

-- 3) Message: add updatedAt and index (if not exists)
ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx"
  ON "Message" ("conversationId", "createdAt");
