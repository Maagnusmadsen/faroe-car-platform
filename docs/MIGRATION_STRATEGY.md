# Database migration strategy

## First-time setup

1. **PostgreSQL** – Create a database (local or hosted, e.g. Neon, Supabase, Railway).
2. **Env** – Set `DATABASE_URL` in `.env` or `.env.local`:
   ```bash
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
   ```
3. **Generate client** – Always run after schema changes:
   ```bash
   npm run db:generate
   ```
4. **Create schema in DB** – Choose one:

   **Option A – Migrate (recommended for production)**  
   Creates versioned migrations in `prisma/migrations/`.
   ```bash
   npm run db:migrate
   ```
   Use `npm run db:migrate:deploy` in CI/production (no interactive prompt).

   **Option B – Push (quick dev only)**  
   Applies schema without migration history. Good for early dev; avoid in production.
   ```bash
   npm run db:push
   ```
5. **Seed** – Optional; creates default platform fee config:
   ```bash
   npm run db:seed
   ```

---

## Ongoing workflow

- **Schema change** – Edit `prisma/schema.prisma`, then:
  1. `npm run db:generate`
  2. `npm run db:migrate` (name the migration) or `db:push` in dev
- **Reset (dev only)** – `npx prisma migrate reset` drops DB, reapplies all migrations, runs seed.
- **Inspect data** – `npm run db:studio` opens Prisma Studio.

---

## Production

- Run migrations in your deploy pipeline: `prisma migrate deploy`.
- Never use `db push` in production.
- Back up DB before major migrations.
- For zero-downtime, prefer additive migrations (new columns/tables, backfill, then remove old if needed).
