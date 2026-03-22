-- When a user is deleted from Supabase auth.users, soft-delete the corresponding User in public schema.
-- This keeps Prisma User in sync when deletion happens in Supabase Dashboard or via Auth API.
--
-- Run this migration in Supabase SQL Editor if not using supabase migrate:
-- https://supabase.com/dashboard/project/_/sql

CREATE OR REPLACE FUNCTION public.handle_auth_user_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE "User"
  SET "deletedAt" = now()
  WHERE "supabaseUserId" = OLD.id::text
    AND "deletedAt" IS NULL;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_deleted();
