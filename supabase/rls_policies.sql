-- =============================================================================
-- FaroeRent – Row Level Security (RLS) policies for Supabase
-- =============================================================================
-- Use this when:
-- - You expose Supabase PostgREST or Realtime to the client and want DB-level security.
-- - Your Next.js app uses Prisma with DATABASE_URL (service/pooler); that connection
--   typically uses a role that bypasses RLS. RLS then protects only direct Supabase
--   client access (e.g. anon key).
--
-- Run in Supabase SQL Editor after migrations. Tables are created by Prisma
-- (schema.prisma); names are lowercase in PostgreSQL.
-- =============================================================================

-- Helper: get current user's UUID from Supabase Auth (auth.uid()).
-- For app-user id (Prisma User.id) you would resolve via your own table
-- (e.g. user.supabase_user_id = auth.uid() -> user.id). The policies below
-- assume you either use auth.uid() to join to your User table or that
-- you only use RLS for tables that store supabase_user_id.

-- Enable RLS on tables that hold user-specific or tenant data.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CarListing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CarImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CarFeature" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CarAvailabilityRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CarBlockedDate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PickupOption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookingStatusHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReviewResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Favorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedSearch" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Policies: allow read/write only where the row belongs to the current user
-- or is allowed by business rules. These examples use auth.uid() and assume
-- your app has a mapping from auth.uid() to User.id (e.g. User.supabase_user_id).
-- Replace app_user_id() with your actual function if you use Prisma User.id.
-- =============================================================================

-- Example: User can read/update own profile. (Column: supabaseUserId.)
-- CREATE POLICY "Users can read own row" ON "User"
--   FOR SELECT USING ("supabaseUserId" = auth.uid()::text);
-- CREATE POLICY "Users can update own row" ON "User"
--   FOR UPDATE USING ("supabaseUserId" = auth.uid()::text);

-- Example: UserProfile – same user only.
-- CREATE POLICY "Users can read own profile" ON "UserProfile"
--   FOR SELECT USING (
--     (SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()::text LIMIT 1) = "userId"
--   );
-- CREATE POLICY "Users can update own profile" ON "UserProfile"
--   FOR UPDATE USING (
--     (SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()::text LIMIT 1) = "userId"
--   );

-- Example: CarListing – owner can do everything; others can SELECT where status = 'ACTIVE'.
-- (Column names match Prisma schema: camelCase.)
-- CREATE POLICY "Listings readable when active" ON "CarListing"
--   FOR SELECT USING (
--     status = 'ACTIVE' OR "ownerId" = (SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()::text LIMIT 1)
--   );
-- CREATE POLICY "Listings owner full access" ON "CarListing"
--   FOR ALL USING (
--     "ownerId" = (SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()::text LIMIT 1)
--   );

-- Example: Booking – renter or listing owner can read; only renter can insert (create booking).
-- CREATE POLICY "Booking renter or owner read" ON "Booking"
--   FOR SELECT USING (
--     "renterId" = (SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()::text LIMIT 1)
--     OR (SELECT "ownerId" FROM "CarListing" WHERE id = "carId") = (SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()::text LIMIT 1)
--   );
-- CREATE POLICY "Booking renter create" ON "Booking"
--   FOR INSERT WITH CHECK (
--     "renterId" = (SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()::text LIMIT 1)
--   );

-- Example: Message – only participants of the conversation can read/insert.
-- CREATE POLICY "Message participants read" ON "Message"
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM "ConversationParticipant" cp
--       JOIN "User" u ON u.id = cp."userId" AND u."supabaseUserId" = auth.uid()::text
--       WHERE cp."conversationId" = "Message"."conversationId"
--     )
--   );
-- CREATE POLICY "Message sender insert" ON "Message"
--   FOR INSERT WITH CHECK (
--     "senderId" = (SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()::text LIMIT 1)
--   );

-- Example: Notification – own only.
-- CREATE POLICY "Notification own read" ON "Notification"
--   FOR SELECT USING (
--     "userId" = (SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()::text LIMIT 1)
--   );
-- CREATE POLICY "Notification own update readAt" ON "Notification"
--   FOR UPDATE USING (
--     "userId" = (SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()::text LIMIT 1)
--   );

-- Example: Favorite – own only.
-- CREATE POLICY "Favorite own all" ON "Favorite"
--   FOR ALL USING (
--     "userId" = (SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()::text LIMIT 1)
--   );

-- =============================================================================
-- Admin: allow service role or a dedicated admin role to bypass RLS for
-- backend operations. In Supabase, the service_role key bypasses RLS by default.
-- Your Next.js app using Prisma with DATABASE_URL (pooler) uses a DB user that
-- can be granted full access; do not use the anon key for that connection.
-- =============================================================================

-- Optional: create a function that returns the current app user id from auth.uid().
-- CREATE OR REPLACE FUNCTION app_user_id()
-- RETURNS TEXT AS $$
--   SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()::text LIMIT 1;
-- $$ LANGUAGE sql STABLE SECURITY DEFINER;

-- After creating app_user_id(), you can simplify policies, e.g.:
-- USING ("ownerId" = app_user_id())
