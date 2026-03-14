# Full codebase inspection – Faroe Car Platform (GoMore-like MVP)

**Purpose:** Analyse the entire project before implementing new features. No implementation in this document—inspection and roadmap only.

---

## 1. Current project structure

```
faroe-car-platform/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout: Providers, LanguageProvider
│   ├── page.tsx                  # Home (hero, Rent / List CTAs)
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── profile/page.tsx          # User profile edit (protected)
│   ├── rent-a-car/
│   │   ├── page.tsx              # Search, filters, grid, map, load-more
│   │   └── [id]/page.tsx         # Car detail (from API or static seed)
│   ├── list-your-car/page.tsx    # Hero + ListingWizard (protected)
│   └── api/                      # REST-style API routes
│       ├── auth/[...nextauth]/   # NextAuth handler
│       ├── auth/signup/          # POST signup
│       ├── cars/                 # GET search (query params)
│       ├── listings/             # POST draft, GET/PATCH [id], images, publish, public
│       ├── bookings/             # POST create, GET list, [id]/status PATCH
│       ├── payments/checkout/    # POST create Stripe session
│       ├── stripe/webhook/       # POST Stripe events
│       ├── favorites/            # GET, POST, DELETE
│       ├── conversations/       # GET list
│       ├── messages/            # POST send, GET by conversation
│       ├── reviews/             # POST create, GET by car
│       ├── payouts/             # GET list, POST create (owner)
│       ├── notifications/       # GET, PATCH read
│       ├── profile/             # GET, PATCH
│       ├── owner/dashboard/     # GET summary
│       ├── renter/dashboard/    # GET summary
│       ├── admin/               # users, listings, moderate
│       └── health/
├── components/                   # React UI
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── Providers.tsx            # SessionProvider
│   ├── LanguageSwitcher.tsx
│   ├── SearchHero.tsx, SearchBar.tsx
│   ├── FilterBar, Filters, MainFilters, AdvancedFilters, FiltersModal, FilterChips
│   ├── TransmissionFilter, SeatsFilter, FuelTypeFilter, PriceRangeFilter, AirportPickupFilter, SortDropdown
│   ├── CarGrid.tsx, CarCard.tsx, CarList.tsx
│   ├── CarMap.tsx, CarMarker.tsx, MapToggle.tsx
│   ├── CarDetailContent.tsx     # Detail page content, Book now, favorites
│   └── listing-wizard/          # Multi-step form (7 steps)
│       ├── ListingWizard.tsx, WizardStepper.tsx
│       ├── types.ts, validateSteps.ts, buildCarFromWizard.ts, styles.ts
│       └── steps/ Step1CarDetails … Step7Review
├── context/
│   └── LanguageContext.tsx       # en/fo, t(), localStorage
├── lib/                          # Business logic & server helpers
│   ├── all-cars.ts              # Legacy: static + getListings() (localStorage)
│   ├── cars.ts                  # Car type, FAROE_ISLANDS, static seed array
│   ├── listings.ts              # Legacy: client localStorage store for listings
│   ├── filter-cars.ts           # Filter types, defaultCarFilters, sort options
│   ├── car-search.ts            # searchListings() for /api/cars
│   ├── listings-server.ts       # getPublicListing, getListingForOwner, createDraft, etc.
│   ├── listing-images.ts        # upload, reorder, delete (uses getStorage())
│   ├── availability-server.ts   # getUnavailableCarIdsForRange, isCarAvailableForRangeServer
│   ├── bookings-server.ts       # createBookingForListing, createBookingWithAvailabilityCheck
│   ├── pricing.ts               # calculatePricing, calculatePricingForListing
│   ├── messaging-server.ts      # ensureConversationForBooking, sendMessageForBooking, listConversations
│   ├── reviews-server.ts        # createReviewForBooking, assertUserCanReviewBooking
│   ├── payouts-server.ts        # findUnpaidBookingsForOwner, createPayoutForOwner
│   ├── notifications-server.ts  # createNotification, notify* helpers
│   ├── owner-dashboard-server.ts
│   ├── renter-dashboard-server.ts
│   ├── admin-audit.ts           # logAdminAction
│   ├── storage.ts               # getStorage(), local | s3 | supabase
│   ├── profile.ts               # getProfileByUserId, updateProfile
│   └── i18n.ts                  # getNested, Locale type
├── db/
│   ├── index.ts                 # re-export prisma
│   └── client.ts                # PrismaClient singleton
├── auth.ts                       # NextAuth({ ...authConfig, secret })
├── auth.config.ts                # Credentials provider, callbacks, authorized (protect routes)
├── middleware.ts                 # NextAuth matcher: /list-your-car, /profile
├── config/
│   └── env.ts                   # getBaseUrl, getDatabaseUrl, getNextAuthSecret, env
├── validation/
│   ├── index.ts
│   └── schemas/                 # auth, booking, car, profile, review, common
├── types/
│   └── car-detail.ts            # CarDetail (extends Car with images, owner, availability, etc.)
├── payments/
│   ├── index.ts
│   └── stripe.ts                # getStripeClient()
├── constants/
│   └── upload.ts                # ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE_BYTES
├── prisma/
│   ├── schema.prisma            # User, UserProfile, Account, Session, CarListing, CarImage, CarFeature, CarAvailabilityRule, CarBlockedDate, PickupOption, Booking, Payment, Payout, Favorite, Review, ReviewResponse, Conversation, ConversationParticipant, Message, Notification, SavedSearch, AdminAuditLog
│   ├── migrations/
│   └── seed.ts
├── locales/
│   ├── en.json
│   └── fo.json
├── tests/                       # Vitest: pricing, availability-server, messaging-server, reviews-server
├── docs/
└── package.json
```

---

## 2. Existing frontend pages and components

| Route | Page | Main components / behaviour |
|-------|------|-----------------------------|
| `/` | Home | Navbar (transparent), hero image, headline, Rent a Car / List Your Car buttons |
| `/login` | Login | Navbar, card with email/password form, signIn("credentials"), callbackUrl, registered=1 success |
| `/signup` | Sign up | Navbar, card with name/email/password, POST /api/auth/signup → redirect to login?registered=1 |
| `/profile` | Profile | Navbar, load /api/profile, edit/save form (name, phone, bio, address, ownerNote, renterNote, etc.) |
| `/rent-a-car` | Search & results | Navbar, SearchHero (location, start/end dates), FilterBar, MapToggle, CarGrid or CarMap, load-more, favorites |
| `/rent-a-car/[id]` | Car detail | Navbar, CarDetailContent (gallery, specs, owner, pickup, policies, Book now, favorite star) |
| `/list-your-car` | List your car | Navbar, hero, “How it works”, ListingWizard (7 steps: car details, specs, location, photos, pricing, availability, review) |

**Shared components:** Navbar (variant light/transparent, session-aware links: Rent, List, Profile, Login/Sign up/Log out), Footer, LanguageSwitcher (EN/FO), SearchBar, FilterBar, FilterChips, SortDropdown, CarGrid, CarCard, CarMap (Leaflet, OSM tiles), CarMarker, CarDetailContent.

**No dedicated UI routes for:** Owner dashboard, Renter dashboard, Conversations/messages, Notifications. These are backed by APIs only (`/api/owner/dashboard`, `/api/renter/dashboard`, `/api/conversations`, `/api/notifications`).

---

## 3. Current routing setup

- **Framework:** Next.js 16 App Router. All pages are under `app/` with `page.tsx`.
- **Dynamic route:** `app/rent-a-car/[id]/page.tsx` for car detail.
- **Middleware:** `middleware.ts` uses NextAuth’s `auth` with `authConfig`; matcher is `["/list-your-car/:path*", "/profile/:path*"]`. Unauthenticated access to those paths redirects to `/login?callbackUrl=...`.
- **Auth callback:** `auth.config.ts` → `authorized()` protects only `/list-your-car` and `/profile`. Rent-a-car and detail are public; booking CTA and favorites require client-side redirect to login when not authenticated.

---

## 4. State management approach

- **No global store:** No Redux, Zustand, or similar. State is local to pages/components.
- **Session:** NextAuth’s `SessionProvider` (in `Providers`) and `useSession()` in client components; `auth()` in server/API.
- **i18n:** `LanguageContext` (locale, setLocale, t()) with localStorage persistence.
- **Rent-a-car page:** useState for search params (location, dates), applied params, filters, sort, items, page, hasMore, loading, favoriteIds, showMapView, filtersModalOpen, highlightedCarId. Data from `fetch(/api/cars)` and `fetch(/api/favorites)`.
- **Listing wizard:** useState for draftId, data (ListingWizardData), step, errors; draft persisted via API (create/update listing) and optional sessionStorage key; no separate global “listing draft” store.
- **Profile:** useState for profile, form, editing, saving, message; data from `/api/profile`.
- **Detail page:** useState for car (CarDetail | null | undefined); data from `getCarById(id)` (static/legacy) or `fetch(/api/listings/[id]/public)`.

---

## 5. Existing forms and UI (auth, listings, bookings, maps, payments)

**Authentication**

- **Login:** Email + password, `signIn("credentials", { redirect: false })`, error/success messages, link to signup.
- **Signup:** Name, email, password (min 8), POST `/api/auth/signup`, then redirect to login with `registered=1`; handles EMAIL_IN_USE.

**Listings**

- **Listing wizard:** 7 steps (car details, specifications, location, photos, pricing, availability, review). Uses listing API (POST draft, PATCH, upload images, POST publish). No separate “listings list” page for owner in app (only API).

**Bookings**

- **Book now:** On car detail page. Dates come from URL query (`start`, `end`); if missing, message “bookingNeedsDates”. On submit: POST `/api/bookings`, then POST `/api/payments/checkout` → redirect to Stripe Checkout. No dedicated “booking confirmation” or “my bookings” page in app (APIs exist: GET `/api/bookings`, GET `/api/renter/dashboard`).

**Maps**

- **Rent-a-car:** Map toggle; CarMap (Leaflet, MapContainer, TileLayer OSM, Marker, Popup). Center Faroe Islands; markers for search results; viewport/bounds can drive search (currently grid is driven by /api/cars with filters, not by map bounds). No Mapbox; no geocoding UI.

**Payments**

- **Flow:** “Book now” → create booking → create Stripe Checkout Session → redirect to Stripe. Success/cancel return to detail page with query params. No in-app “payment success” or “order summary” page; webhook updates booking status and notifications.

---

## 6. Code quality observations

**Strengths**

- TypeScript throughout; shared types (`Car`, `CarDetail`, validation schemas).
- Zod used in API validation (auth, booking, car, profile, review).
- Central env access in `config/env.ts`.
- Prisma schema well structured with indexes and relations.
- Server logic separated in `lib/*-server.ts`; API routes thin.
- Storage abstracted behind `StorageDriver` (local, s3, supabase).
- Some tests for pricing, availability, messaging, reviews.
- i18n (en/fo) and LanguageProvider used in UI.

**Weaknesses / inconsistencies**

- **Legacy dual source for “cars”:** Rent-a-car search uses `/api/cars` (DB). Detail page uses `getCarById(id)` first (static seed + `getListings()` from localStorage), then falls back to `fetch(/api/listings/[id]/public)`. So `lib/all-cars.ts` and `lib/listings.ts` are legacy client-only; listing detail can still show static/localStorage data for old IDs.
- **No dashboard UI:** Owner and renter dashboard APIs exist but there are no `/owner/dashboard` or `/renter/dashboard` (or “My bookings”) pages.
- **Profile:** Long single component with many fields; could be split or use a small form library.
- **Error handling:** Many `fetch` calls use `.catch(() => ({}))` or generic messages; no global API error handler or toast system.
- **No loading/skeleton consistency:** Some pages show “Loading…” or a simple pulse; no shared skeleton set for cards/list.

---

## 7. Potential architectural issues

1. **Dual data source for listings:** Mix of static seed + localStorage (`all-cars`, `listings.ts`) and DB/API can confuse which listing is “real”. Prefer single source: API for all listing data; remove or clearly deprecate client-only listings for production.
2. **Protected routes only in middleware:** Only `/list-your-car` and `/profile` are protected. Booking and other actions rely on client-side redirect or API returning 401. Fine for MVP but worth documenting.
3. **No owner/renter dashboard pages:** Backend is ready; users cannot see “My listings”, “My bookings”, “My payouts” in the UI. Critical for a GoMore-like MVP.
4. **Stripe webhook and idempotency:** Webhook handler updates payment and booking; should be idempotent and robust (already uses transactions; worth keeping in mind for retries).
5. **Map and search coupling:** Map shows results from same `/api/cars` query as grid; map bounds are not yet sent as filter to backend (so “search by map area” is not implemented).

---

## A) What parts of the project are already good and should be preserved

- **App Router and page layout** – Clear structure; home, rent, list, profile, login, signup.
- **NextAuth (Credentials + JWT)** – Working signup/login, role in session, protected routes for list-your-car and profile.
- **Prisma schema and DB layer** – Rich, indexed, suitable for marketplace; keep as single source of truth for listings/bookings/payments/messages/reviews.
- **API surface** – Cars search, listings CRUD, bookings, checkout, webhook, favorites, conversations, messages, reviews, payouts, notifications, owner/renter dashboards, admin. Use as-is and expose via UI where missing.
- **Stripe integration** – Checkout session and webhook flow; keep.
- **Storage abstraction** – local/s3/supabase driver; keep and use for listing images.
- **Listing wizard** – Multi-step, validated, persisted to API; keep.
- **Rent-a-car search and filters** – Location, dates, filters, sort, pagination, availability-aware; keep.
- **Car detail and “Book now”** – Detail from API, booking + Stripe redirect; keep.
- **Tailwind and component set** – Navbar, Footer, SearchBar, FilterBar, CarGrid, CarCard, CarMap, etc.; keep.
- **i18n (en/fo)** – LanguageContext and locale files; keep.
- **Validation (Zod)** – Keep for all API inputs.
- **Config (env.ts)** – Central env; keep.

---

## B) What parts could benefit from improvement

- **Detail page data source:** Prefer single source: always fetch from `/api/listings/[id]/public` for DB-backed IDs; treat static seed only as fallback or remove for production so “listings” are only from DB.
- **Legacy `lib/listings.ts` and `lib/all-cars.ts`:** Decide: either remove client-only localStorage listings and rely only on API, or clearly mark as dev/demo and not used when API returns data.
- **Dashboard UIs:** Add at least minimal pages for owner (my listings, bookings, payouts) and renter (my bookings, saved cars) using existing APIs.
- **Booking flow feedback:** After Stripe success/cancel, show a clear success/cancel message or redirect to a “booking confirmation” or “my bookings” view instead of only query params on detail page.
- **Error and loading UX:** Consistent API error handling and optional toast/notification component; shared loading/skeleton for lists and cards.
- **Map:** Optionally send map bounds to search API for “search in viewport”; later consider Mapbox for styling/geocoding.

---

## C) What is missing for a GoMore-like MVP

- **Owner dashboard page** – “My listings”, “My bookings”, “Earnings/payouts”, ability to pause/activate listing. Backend exists; need UI.
- **Renter dashboard (or “My trips”)** – “Upcoming bookings”, “Past bookings”, “Saved cars”, link to conversations. Backend exists; need UI.
- **Conversations/messages UI** – List conversations, open thread, send message. API exists; need at least one simple page or modal.
- **Post-booking experience** – After payment success: confirmation page or redirect to “My bookings” with clear status.
- **Optional but valuable:** Mapbox for better maps/geocoding; explicit “search by map area” if needed for MVP.

---

## D) What minimal backend systems should be added

- **None strictly required for core MVP.** The backend already has:
  - Auth (signup/login, session, protection)
  - Listings (draft, publish, images, availability, search)
  - Bookings (create, status, availability check)
  - Payments (Stripe Checkout + webhook)
  - Favorites, conversations, messages, reviews, notifications, payouts, owner/renter dashboards, admin

**Optional backend additions (only if needed):**

- **Email sending:** Notification system is event-ready; add a single channel (e.g. Resend) for “booking confirmed”, “new message” if you want email in MVP.
- **Mapbox geocoding:** If you want “search by place” or address → coordinates, add a small server-side or edge endpoint that calls Mapbox Geocoding API (no change to Prisma).

---

## Implementation roadmap (MVP-focused, cheap)

Goal: Add **Supabase** (DB + optional storage), keep **auth** as-is or optionally Supabase Auth later, **listings** and **booking** already in place, add **Mapbox** where useful, keep **Stripe test**. No overengineering.

### Phase 0: Preparation (no new features)

- **Document and optionally clean data sources:** Prefer API as single source for listing detail; document or remove reliance on `lib/listings.ts` / `lib/all-cars.ts` for production.
- **Ensure Supabase-ready:** `.env.example` already documents Supabase Postgres and Supabase Storage. Use `DATABASE_URL` = Supabase connection string when moving to cloud; keep Prisma. Use `UPLOAD_DRIVER=supabase` when using Supabase Storage.

### Phase 1: Database and auth (cheapest MVP)

- **Database:** Create Supabase project; create DB from existing Prisma migrations (or `db push`). Set `DATABASE_URL` (and `SHADOW_DATABASE_URL` if needed) in production env. No code change.
- **Auth:** Keep NextAuth + Credentials. No Supabase Auth in MVP unless you explicitly want magic link/OAuth later.
- **Storage (optional):** Create Supabase Storage bucket (e.g. `uploads`), public for reads. Set `UPLOAD_DRIVER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Already implemented in `lib/storage.ts`.

### Phase 2: Missing MVP UIs (reuse existing APIs)

- **Owner dashboard page:** New route (e.g. `/dashboard` or `/owner`) – fetch `/api/owner/dashboard`, show listings (with link to edit/draft), recent bookings, payouts preview, link to profile. Reuse Navbar (add “Dashboard” for owners).
- **Renter dashboard / My trips:** New route (e.g. `/my-trips` or `/renter`) – fetch `/api/renter/dashboard`, show upcoming/past bookings, saved cars, link to conversations. Add “My trips” or “Dashboard” in Navbar for logged-in users.
- **Conversations:** Minimal UI – e.g. “Messages” in Navbar → page that lists `/api/conversations` and allows opening a thread (GET/POST `/api/messages?conversationId=...`). Can be a simple list + single thread view.
- **Booking success:** On return from Stripe (success URL), redirect to renter dashboard or a “Booking confirmed” page with booking id and status, instead of only detail page with `?payment=success`.

### Phase 3: Mapbox (optional, incremental)

- **Env:** Add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (and document in `.env.example`).
- **Option A – Mapbox tiles in Leaflet:** Replace or complement OSM TileLayer with Mapbox tile URL in `CarMap.tsx` (no new deps beyond token). Improves look and consistency with “Mapbox for maps”.
- **Option B – Mapbox GL:** Add `mapbox-gl` and `react-map-gl`; replace Leaflet map on rent-a-car with Mapbox GL map; keep same markers/popups concept. Better for future geocoding and styling.
- **Geocoding (optional):** If you want location search by place name, add one API route (e.g. `/api/geocode`) that calls Mapbox Geocoding and returns coordinates; wire SearchBar or location filter to it.

### Phase 4: Stripe test and production readiness

- **Stripe:** Keep test mode for MVP. Use test keys in env; webhook in test mode (Stripe CLI or dashboard webhook to deployed URL). No code change for “test only”.
- **Vercel:** Deploy Next.js to Vercel; set env (DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, Stripe keys, optional Supabase). Run `prisma migrate deploy` in build or release. Ensure webhook URL points to production.

### Order of implementation (recommended)

1. **Phase 0** – Document/clean listing data source (and optionally remove legacy localStorage listing usage for production).
2. **Phase 1** – Supabase DB (and optionally Storage); no auth change.
3. **Phase 2** – Owner dashboard page → Renter dashboard / My trips → Conversations UI → Booking success redirect.
4. **Phase 3** – Mapbox (tiles or GL + optional geocoding) if budget allows.
5. **Phase 4** – Deploy to Vercel, Stripe test, production env.

This keeps the existing codebase intact, adds only the missing UIs and optional Mapbox/Supabase, and stays MVP-focused and cheap.
