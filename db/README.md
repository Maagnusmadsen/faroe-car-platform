# Database

Prisma client and PostgreSQL schema. Used by services and API routes.

**Contents:**
- `client.ts` – Prisma client singleton (import from `@/db` or `@/db/client`).
- `index.ts` – Re-exports `prisma` and PrismaClient type.

**Schema and migrations:** `prisma/schema.prisma` and `prisma/migrations/`. See `docs/DATABASE_SCHEMA.md` for model descriptions and `docs/MIGRATION_STRATEGY.md` for workflow.

**Commands:** `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm run db:studio`.
