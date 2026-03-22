# Synkroniseret brugersletning: Supabase Auth ↔ Prisma User

Så brugeren altid slettes begge steder:

## Retning 1: Admin-sletning → begge steder ✅

Når du sletter en bruger i **RentLocal Admin** (Delete-knappen):

1. Brugeren slettes i **Supabase Auth** (hvis den findes)
2. Brugeren slettes i **Prisma User** (databasen)

*(Allerede implementeret. Hvis brugeren ikke findes i Auth, fortsætter vi med DB-sletning.)*

## Retning 2: Supabase-sletning → Prisma ✅

Når en bruger slettes i **Supabase Dashboard** (Authentication → Users → Delete) eller via Auth API:

1. En database-trigger kører automatisk
2. Den tilsvarende **User**-række i databasen soft-deletes (`deletedAt` sættes)

### Opsætning af trigger

Kør følgende SQL i **Supabase Dashboard** → **SQL Editor**:

```sql
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
```

**Bemærk:** Triggeren bruger soft delete (`deletedAt`), så relationer (bookings, osv.) bevares. Admin-siden filtrerer allerede på `deletedAt IS NULL`, så de vises ikke.
