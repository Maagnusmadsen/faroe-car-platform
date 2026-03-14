# Codebase inspection and improvement plan

**Goal:** MVP marketplace (GoMore-style) for the Faroe Islands.  
**Constraints:** No rewrite, no microservices, no overengineering. Improve incrementally.

---

## 1. What already exists

| Area | Current stack | Notes |
|------|----------------|--------|
| **Framework** | Next.js 16, App Router | ✅ Matches target |
| **Language** | TypeScript | ✅ |
| **Styling** | Tailwind CSS v4 | ✅ |
| **Database** | Prisma + PostgreSQL | Any Postgres URL (local or cloud) |
| **Auth** | NextAuth v5, Credentials provider, JWT, Prisma adapter | Signup/login, role (USER/ADMIN), route protection |
| **Storage** | `lib/storage.ts` | Drivers: **local** (public/uploads), **S3** (or R2/MinIO) |
| **Payments** | Stripe | Checkout, webhook, booking ↔ payment sync |
| **Maps** | Leaflet + react-leaflet | `CarMap.tsx`, `CarMarker.tsx` – OSM tiles |
| **Frontend** | Home, Rent a car (search/filters/grid/map), List your car (wizard), Listing detail, Login/Signup, Profile | Components reused (CarGrid, CarCard, FilterBar, etc.) |
| **Backend** | API routes under `app/api/` | Cars, listings, bookings, payments, messages, conversations, reviews, favorites, notifications, owner/renter dashboards, admin |
| **Data layer** | `lib/*-server.ts` | Prisma throughout; pricing, availability, messaging, reviews, payouts |
| **Config** | `config/env.ts` | Central env access; no Supabase/Mapbox vars yet |
| **Tests** | Vitest | pricing, availability, messaging, reviews |

---

## 2. What should be preserved

- **Next.js App Router** and existing page structure – no move to Pages Router.
- **Prisma + PostgreSQL** as the data model and query layer – schema is rich and consistent; swapping to another ORM would be a full rewrite.
- **NextAuth (Credentials + JWT)** – works, protects routes, stores role. Migrating to Supabase Auth would touch every auth check and session use; not needed for MVP.
- **Existing components and pages** – Navbar, SearchHero, CarGrid, CarCard, CarDetailContent, listing wizard, etc.
- **Stripe integration** – checkout, webhook, booking status flow.
- **Storage abstraction** (`StorageDriver` in `lib/storage.ts`) – only the implementation (local/s3) is extended; callers stay the same.
- **Vercel-friendly setup** – serverless API routes, env-based config, no long-lived processes.

---

## 3. What should be improved (with A/B/C/D)

### 3.1 Database: Use Supabase Postgres as optional cloud backend

- **A) What exists today:** Prisma with `DATABASE_URL` (e.g. local Postgres). All API and server code use `prisma` from `@/db`.
- **B) Problem:** No explicit guidance for “cheapest MVP” cloud DB. Supabase offers free-tier Postgres.
- **C) Change:** No code change. Document that `DATABASE_URL` can be Supabase’s “Connection string” (Settings → Database). Optional: add `SHADOW_DATABASE_URL` for Supabase (e.g. second project or pooler) if using `prisma migrate dev` in CI.
- **D) Why it helps:** Same Prisma schema and code; only env changes. Keeps architecture simple and avoids a full migration to another DB layer.

---

### 3.2 Storage: Add Supabase Storage as third driver

- **A) What exists today:** `lib/storage.ts` has `StorageDriver` with **local** (default) and **s3**. `lib/listing-images.ts` uses `getStorage().upload()` / `.delete()` only.
- **B) Problem:** Target stack says “Supabase for storage”; currently only local and S3 exist. Adding Supabase Storage gives a single cloud provider for DB + files (and optional auth later).
- **C) Change:** Add `UPLOAD_DRIVER=supabase` and a `createSupabaseDriver()` that uses `@supabase/supabase-js` to upload/delete in a bucket and return public URLs. Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or anon key with RLS allowing uploads).
- **D) Why it helps:** Maintainability (one abstraction, three backends); scalability (Supabase Storage scales with plan); cheap MVP (free tier); no change to `listing-images.ts` or API routes.

---

### 3.3 Auth: Keep NextAuth; document Supabase Auth as future option

- **A) What exists today:** NextAuth v5, Credentials, Prisma `User` (email, passwordHash, role). Signup in `app/api/auth/signup/route.ts`.
- **B) Problem:** You listed “Supabase for authentication”. Moving to Supabase Auth would replace NextAuth, session shape, and all `auth()` / `useSession()` usage.
- **C) Change:** For MVP, **keep NextAuth**. Document in this file that “Supabase Auth can be added later (e.g. magic link, OAuth) by syncing Supabase Auth users to `User` or migrating session layer.” No structural change now.
- **D) Why it helps:** Avoids overengineering and a large, risky refactor. MVP stays simple; you can add Supabase Auth in a later phase if needed.

---

### 3.4 Maps: Keep Leaflet; add Mapbox later as enhancement

- **A) What exists today:** Leaflet + react-leaflet in `CarMap.tsx` / `CarMarker.tsx`; OSM tile layer.
- **B) Problem:** Target says “Mapbox for location/maps”. Leaflet already works; Mapbox would improve look and control (e.g. style, clustering).
- **C) Change:** For MVP, **keep Leaflet**. Later: add Mapbox GL (e.g. `mapbox-gl` + `react-map-gl`) on one key view (e.g. rent-a-car map) or use Mapbox tiles in Leaflet. Env: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.
- **D) Why it helps:** No regression; maps already function. Mapbox becomes an incremental UX improvement, not a prerequisite for launch.

---

### 3.5 Env and config

- **A) What exists today:** `.env.example` documents DB, NextAuth, Stripe, S3/local upload; `config/env.ts` exposes a few helpers (no Supabase/Mapbox).
- **B) Problem:** New drivers (Supabase storage) and future options (Mapbox, Supabase DB) need a single place to be documented and, where useful, typed.
- **C) Change:** Update `.env.example` with Supabase (DB URL, Storage URL + key). Optionally add `getSupabaseUrl()` / `getSupabaseServiceKey()` in `config/env.ts` only if we add Supabase client (e.g. for storage). Prefer minimal env surface.
- **D) Why it helps:** Clear, copy-paste setup for “Supabase for database and storage” without touching auth or maps yet.

---

### 3.6 Vercel and migrations

- **A) What exists today:** `prisma generate` in `build`; migrations in `prisma/migrations/`; `db push` used locally; shadow DB for `migrate dev`.
- **B) Problem:** On Vercel, you typically run `prisma migrate deploy` in a build step or release pipeline; no interactive shadow DB. Supabase Postgres works with Prisma; connection pooling (Supabase pooler) may require `?pgbouncer=true` for serverless.
- **C) Change:** Document: for Vercel, use `prisma migrate deploy` (e.g. in `build` or a post-deploy script). For Supabase, use the “Transaction” mode connection string for migrations and, if needed, Session mode for serverless. No code change required now.
- **D) Why it helps:** Ensures production deploys stay reliable and match your “Vercel-friendly” goal.

---

## 4. Implementation order (incremental)

1. **Done in this pass**
   - Update `.env.example` with Supabase (DB + Storage) and short comments.
   - Add Supabase Storage driver in `lib/storage.ts` and wire `getStorage()` when `UPLOAD_DRIVER=supabase`.
   - Keep Prisma + NextAuth + Leaflet unchanged.

2. **Later (no code in this pass)**
   - Use Supabase Postgres: set `DATABASE_URL` (and optional `SHADOW_DATABASE_URL`) from Supabase dashboard.
   - Optional: Mapbox tiles or Mapbox GL on rent-a-car map.
   - Optional: Supabase Auth later (e.g. magic link) with User sync or session migration.

---

## 5. What was not changed (by design)

- No migration from Prisma to Supabase client for DB.
- No migration from NextAuth to Supabase Auth.
- No replacement of Leaflet with Mapbox in this step.
- No new microservices or separate “auth service”.
- No SMS or other new auth methods.

This keeps the MVP on a single Next.js app, one Postgres (local or Supabase), one auth layer (NextAuth), and one storage abstraction (local | s3 | supabase).
