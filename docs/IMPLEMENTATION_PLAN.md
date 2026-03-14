# FaroeRent – Implementation Plan (Analysis Only)

**Purpose:** Production-ready car-sharing marketplace (GoMore-like). This document audits the existing frontend, identifies missing backend systems, recommends architecture, and defines a step-by-step roadmap. **No UI redesign.** No code is generated in this step.

---

## 1. Existing Frontend Audit

### 1.1 Pages (App Router)

| Route | Type | Purpose |
|-------|------|---------|
| `/` | Static (client) | Landing: hero, concept section, CTAs to Rent / List |
| `/rent-a-car` | Client | Search + filter + list/map of cars; no booking yet |
| `/rent-a-car/[id]` | Client | Car detail: image, title, location, price, “Book now” (no action) |
| `/list-your-car` | Client | Hero + “How it works” + 7-step listing wizard → publish |

**Missing pages (referenced or required for full product):**
- Auth: no `/login`, `/signup`, `/forgot-password` (Navbar links to `#login`, `#signup`)
- Dashboards: no owner/renter dashboards
- Booking: no checkout/booking confirmation page
- User: no profile/settings, no “My listings”, no “My bookings”
- Messaging: no inbox/conversation pages
- Reviews: no review list or write-review UI
- Favorites: no saved-cars page
- Admin: no admin area
- Legal: footer links `#about`, `#how-it-works`, `#contact`, `#terms` (anchors only)

### 1.2 Components (Summary)

**Layout & global**
- `Navbar` – Logo, Rent a Car, List Your Car, Login (#), Sign up (#), LanguageSwitcher; transparent over hero / solid on scroll
- `Footer` – Logo, About, How it works, Contact, Terms & Privacy (all #)
- `LanguageSwitcher` – EN/FO; locale in `LanguageContext` + localStorage

**Rent a car flow**
- `SearchHero` – Wraps search bar
- `SearchBar` – Location (text + datalist), Pick-up date, Drop-off date, Search button
- `FilterBar` – Sort + “More filters” opening modal
- `FiltersModal` – Island, town, pickup, price range, seats, transmission, fuel, 4x4, airport pickup
- `FilterDropdown`, `SortDropdown`, `FilterChips`, `TransmissionFilter`, `FuelTypeFilter`, `SeatsFilter`, `PriceRangeFilter`, `AirportPickupFilter`, `MainFilters`, `AdvancedFilters`, `FilterToggle`
- `CarGrid` – Grid of `CarCard`
- `CarCard` – Image, brand+model, location, rating, price/day, “View details” → `/rent-a-car/[id]`
- `CarMap` (dynamic, no SSR) – Leaflet map, markers, `CarMarker` popup
- `MapToggle` – Switch list/map view

**Car detail**
- `CarDetailContent` – Back link, image, title, location, rating, price, “Book now” (no handler)

**List your car flow**
- `ListingWizard` – Stepper (Step X of 7 + progress bar), one step at a time, Back/Next, Publish on step 7
- Steps: `Step1CarDetails`, `Step2Specifications`, `Step3Location`, `Step4Photos`, `Step5Pricing`, `Step6Availability`, `Step7Review`
- `WizardStepper`, `validateSteps`, `buildCarFromWizard`, shared `types` and `styles`

### 1.3 Forms & Data Entry

- **Search (rent):** Location, start date, end date; submit sets `hasSearched` and filters by availability (client-side).
- **List your car (wizard):**
  - Step 1: brand, model, year, description (required)
  - Step 2: transmission, fuel, seats, vehicle type, 4x4, luggage (optional)
  - Step 3: town, pickup location, airport pickup, pickup instructions (optional)
  - Step 4: photos (min 3), reorder/remove; stored as data URLs in memory then first used as `imageUrl`
  - Step 5: price per day, min rental days, weekly/monthly discount %
  - Step 6: blocked dates (single days), min notice days, advance booking days
  - Step 7: review summary + confirm insurance / allowed to rent / info correct → Publish
- **Publish:** Builds `Car` from wizard, calls `addListing()` (localStorage), success message, redirect to `/rent-a-car/[id]`.
- **No forms yet:** Login, signup, booking, payment, messaging, reviews, profile, favorites.

### 1.4 Data Layer (Current)

- **`lib/cars.ts`** – `Car` type (id, brand, model, year, pricePerDay, location, rating, imageUrl, description?, lat/long, island, town, pickupLocation?, airportPickup, seats, transmission, fuelType, is4x4, vehicleType?, blockedDates?); static seed array `cars`.
- **`lib/listings.ts`** – In-memory + localStorage; `getListings()`, `addListing(car)`; no `ownerId`; id format `listing-{timestamp}-{random}`.
- **`lib/all-cars.ts`** – `getAllCars()` = seed + listings, `getCarById(id)`; used by rent page and detail page.
- **`lib/bookings.ts`** – Mock `Booking[]` (id, carId, startDate, endDate); used only for availability.
- **`lib/availability.ts`** – `isCarAvailableForRange(carId, start, end)` (bookings), `getAvailableCars(cars, start, end)` (bookings + car.blockedDates).
- **`lib/filter-cars.ts`** – `CarFilters`, `filterCars()`, `sortCars()`, `filterCarsByViewport()` (client-side).
- **`lib/date-utils.ts`** – parseDate, toDateString, dateRangesOverlap, isValidDateRange.
- **`lib/town-coordinates.ts`** – Town name → lat/long/island for Faroe Islands.

**No backend:** No API routes under `app/api/`, no server-side DB, no auth, no file upload (images are data URLs in localStorage).

---

## 2. User Journeys (Current vs Target)

### 2.1 Landing Page
- **Current:** Hero, concept, CTAs to Rent a Car and List Your Car; Login/Sign up are anchors.
- **Gaps:** No real auth; no personalized CTAs; no “My bookings” / “My listings” for logged-in users.

### 2.2 Car Search / Results
- **Current:** Location + dates + Search → client-side filter by availability (mock bookings + blockedDates); filters (island, town, price, seats, transmission, fuel, 4x4, airport); sort; list/map; card → detail.
- **Gaps:** No server-side search; no real availability (bookings are mock); no booking flow from results/detail; no favorites; no “save search”.

### 2.3 List-Your-Car Flow
- **Current:** Hero → How it works → 7-step wizard → publish to localStorage → redirect to car detail.
- **Gaps:** No auth (anyone can “publish”); no real image upload (data URLs); no server persistence; no ownership; no edit/delete listing; no “My listings” dashboard.

### 2.4 Auth-Related
- **Current:** Nav links to `#login` and `#signup`; no pages, no session, no protected routes.
- **Gaps:** Sign up, login, logout, session, password reset, email verification; role (owner/renter); protect list-your-car and dashboards.

### 2.5 Navigation / Header
- **Current:** Rent a Car, List Your Car, Login (#), Sign up (#), language.
- **Gaps:** When logged in: replace Login/Sign up with profile/dashboard/logout; optional inbox/messages indicator.

---

## 3. Missing Backend Systems (Per Area)

### 3.1 Database
- **Missing:** Persistent store for users, cars, bookings, payments, messages, reviews, favorites, availability blocks.
- **Current:** Static seed + localStorage listings; mock bookings in code.

### 3.2 Authentication & Authorization
- **Missing:** User registration, login, session (e.g. JWT or session cookies), password reset, email verification; RBAC (owner vs renter vs admin); protected routes and API guards.
- **Current:** None; Navbar shows login/signup as anchors.

### 3.3 User Profiles
- **Missing:** Profile entity (name, email, phone, avatar, driver license if needed); profile API; settings; “My account” page.
- **Current:** No user model or profile UI.

### 3.4 Car Listings
- **Missing:** Server CRUD for listings; ownership (ownerId); status (draft/active/paused); validation; audit.
- **Current:** Client-only `addListing` to localStorage; no update/delete; no ownerId.

### 3.5 Image Uploads
- **Missing:** File upload API; virus/type checks; durable storage (e.g. S3/Vercel Blob); CDN URLs; multiple images per car; resize/optimization.
- **Current:** Base64 data URLs in memory/localStorage; first image only as `imageUrl`.

### 3.6 Search & Filtering
- **Missing:** Server-side search (location, dates, attributes); indexing (e.g. DB or search engine); pagination.
- **Current:** Client-side only; all cars loaded then filtered.

### 3.7 Availability & Calendar
- **Missing:** Stored availability (blocked dates, min notice, advance window); conflict checks; calendar API for owners.
- **Current:** `blockedDates` on Car in memory/localStorage; mock bookings in code.

### 3.8 Booking Engine
- **Missing:** Create booking (car, dates, renter, status); validate availability and min/max days; pricing calculation (daily + weekly/monthly discounts); hold/expiry; confirmation flow.
- **Current:** “Book now” button only; no booking creation.

### 3.9 Pricing Logic
- **Missing:** Stored pricing rules (price per day, min days, weekly/monthly discount); server-side price calculation; currency; display vs charge.
- **Current:** Wizard collects price + discounts; not used in any booking or payment.

### 3.10 Payments
- **Missing:** Payment provider (e.g. Stripe); checkout; capture on trip start or end; refunds; payment history.
- **Current:** None.

### 3.11 Commissions & Payouts
- **Missing:** Platform commission %; payout to owner (schedule, method, statements); balances; payouts API.
- **Current:** None.

### 3.12 Messaging
- **Missing:** Threads (booking-related or general); real-time or polling; notifications; moderation.
- **Current:** No UI or backend.

### 3.13 Reviews
- **Missing:** Review entity (booking, reviewer, rating, text); aggregate rating per car; display on car detail and profile.
- **Current:** `Car.rating` is static or default 5 for new listings; no review source.

### 3.14 Favorites
- **Missing:** Favorite/saved cars per user; list and remove; used in search/dashboard.
- **Current:** None.

### 3.15 Dashboards
- **Missing:** Owner: my listings, calendar, bookings, earnings, payouts, messages. Renter: my bookings, past trips, messages, reviews. Shared: profile, settings.
- **Current:** No dashboard pages.

### 3.16 Admin
- **Missing:** Admin role; moderation (listings, users, reviews); platform config; basic analytics; support tools.
- **Current:** None.

### 3.17 Notifications
- **Missing:** In-app and/or email (booking request, payment, message, review); preferences; delivery.
- **Current:** None.

### 3.18 Validation & Security
- **Missing:** Server-side validation (inputs, file types, sizes); rate limiting; CSRF; secure headers; auth on all mutating APIs.
- **Current:** Client-side validation in wizard only.

### 3.19 Observability & Logging
- **Missing:** Structured logs; request IDs; error tracking; metrics (e.g. bookings, revenue); alerts.
- **Current:** None.

### 3.20 Testing
- **Missing:** Unit tests for lib (availability, filters, date utils); API tests; e2e for critical flows (search, list car, book).
- **Current:** No tests in repo.

---

## 4. Recommended Production-Ready Architecture

### 4.1 Stack (Suggested)

- **Frontend:** Existing Next.js 16 (App Router), React 19, Tailwind 4 – keep as is.
- **API:** Next.js Route Handlers (`app/api/...`) or dedicated Node service; REST or tRPC; consistent error and auth middleware.
- **Database:** PostgreSQL (or Supabase/Neon) for relational data (users, cars, bookings, payments, messages, reviews, favorites); migrations (e.g. Drizzle or Prisma).
- **Auth:** NextAuth.js (or Auth.js) with credentials + optional OAuth; JWT or database sessions; role in token/session.
- **Files:** Object storage (e.g. S3, Vercel Blob, Cloudflare R2); signed upload URLs or server proxy; CDN for reads.
- **Payments:** Stripe (Connect for marketplace: platform + owner payouts); webhooks for payment events.
- **Real-time (later):** WebSockets or Server-Sent Events for messaging/notifications if needed; else polling.
- **Search (optional):** Postgres full-text or Elasticsearch/Meilisearch if search scale demands it.
- **Observability:** Logging (e.g. Pino), error tracking (e.g. Sentry), metrics (e.g. Vercel Analytics or custom).

### 4.2 High-Level Architecture

```
[Browser]
  → Next.js (App Router): /, /rent-a-car, /rent-a-car/[id], /list-your-car, /login, /signup, /dashboard/*, etc.
  → API: /api/auth/*, /api/cars/*, /api/bookings/*, /api/users/*, /api/upload/*, /api/messages/*, /api/reviews/*, /api/payments/* (webhooks), etc.
  → Auth middleware: protect /list-your-car, /dashboard/*, and mutating API routes.

[API layer]
  → Validation (e.g. Zod), auth (session/JWT), rate limit
  → Services: auth, cars, bookings, availability, pricing, payments, messages, reviews, notifications
  → DB (PostgreSQL), Blob storage, Stripe
```

### 4.3 Data Model (Conceptual)

- **users** – id, email, hashed password, name, phone, avatar_url, role (owner | renter | admin), email_verified, created_at, updated_at.
- **cars** – id, owner_id, brand, model, year, description, location, town, island, lat, lng, pickup_location, airport_pickup, seats, transmission, fuel_type, vehicle_type, is_4x4, price_per_day, min_rental_days, weekly_discount_pct, monthly_discount_pct, status (draft | active | paused), rating_avg, created_at, updated_at.
- **car_images** – id, car_id, url, sort_order.
- **car_availability** – id, car_id, date (or start/end), type (blocked | available), min_notice_days, advance_booking_days (can be on car or separate table).
- **bookings** – id, car_id, renter_id, start_date, end_date, status (pending | confirmed | cancelled | completed), total_price, platform_fee, owner_payout, payment_intent_id, created_at, updated_at.
- **payments** – id, booking_id, type (charge | refund | payout), amount, currency, stripe_id, status, created_at.
- **messages** – id, booking_id (nullable), sender_id, recipient_id, body, read_at, created_at; or threads with thread_participants and messages.
- **reviews** – id, booking_id, reviewer_id, reviewee_id (owner), car_id, rating, body, created_at.
- **favorites** – user_id, car_id (unique).
- **notifications** – id, user_id, type, payload, read_at, created_at.

(Exact schema and normalisation to be decided in the “database design” step.)

### 4.4 Security Principles

- Auth on all state-changing APIs; ownership checks (e.g. only owner can edit/delete car).
- Validate and sanitise all inputs; limit file types/sizes for uploads.
- Use parameterised queries / ORM to avoid SQL injection.
- Store secrets in env; use Stripe webhook signing; HTTPS only.
- Rate limiting on auth and public APIs; optional CAPTCHA on signup/login.

### 4.5 Frontend Integration (Without Redesign)

- Keep existing pages and components; add only: auth pages, dashboards, booking checkout, messaging, reviews, favorites, profile/settings.
- Replace direct use of `getAllCars()` / `getListings()` / `addListing()` with API calls (e.g. `fetch` or client wrapper); keep `Car` type and filter/sort logic where possible, feeding from API response.
- Listing wizard: keep 7 steps; on publish, call API to create listing (with auth) and upload images to API → storage; redirect to car detail or “My listings”.
- Rent page: load cars (and availability) from API; keep current filters/sort/map; “Book now” → booking flow (dates, price summary, payment) then confirmation.
- Navbar: when logged in, show Profile/Dashboard/Logout (and optional Messages); when not, keep Login / Sign up but point to real routes.

---

## 5. Step-by-Step Implementation Roadmap

Order is chosen so that each step has minimal dependencies and can be tested before moving on. No UI redesign; only wiring and new pages where needed.

### Phase A – Foundation

**A1. Project & database setup**
- Add PostgreSQL (local + cloud); migration tool (e.g. Drizzle/Prisma); env for `DATABASE_URL`.
- Define and run initial schema: users, cars, car_images, car_availability (or blocked_dates on cars), bookings (minimal).
- No API or UI changes yet; goal: DB and migrations in place.

**A2. Authentication**
- Add NextAuth.js (or Auth.js): credentials (email + password), session (JWT or DB), role in session.
- Implement sign up (register user, hash password), login, logout.
- Add pages: `/login`, `/signup` (and optionally `/forgot-password`); wire Navbar links.
- Protect `/list-your-car` (and later dashboard) for logged-in users only.
- **Test:** Sign up, log in, log out, access list-your-car when logged in/out.

**A3. User profiles (minimal)**
- Profile table/fields (name, phone, avatar_url); API: GET/PATCH `/api/users/me` (and avatar upload if needed).
- Optional: `/profile` or `/settings` page to show/edit name, email, phone.
- **Test:** Update profile and see changes.

### Phase B – Listings & Media

**B4. Car listings API**
- CRUD API for cars: `POST/GET/PATCH/DELETE /api/cars` (and `GET /api/cars/[id]`); associate with `owner_id` from session; validate input (Zod).
- Migrate listing wizard: on publish, call `POST /api/cars` with wizard payload (no images yet); store in DB; redirect to car detail.
- Deprecate or remove localStorage listings; rent page and detail page load cars from API.
- **Test:** List a car as logged-in user; see it on rent-a-car and detail; edit/delete as owner.

**B5. Image upload & storage**
- Choose blob storage (e.g. Vercel Blob/S3); upload API (e.g. `POST /api/upload` or presigned URL); validate type/size; return stable URL.
- Extend cars schema: `car_images` (car_id, url, sort_order); API to add/remove/reorder images per car.
- Wizard step 4: upload files to API, get URLs; submit car with `imageUrls`; set first as primary for `imageUrl` in UI.
- **Test:** Publish listing with 3+ images; see them on detail and in list.

### Phase C – Search, Availability, Booking

**C6. Search & filtering API**
- `GET /api/cars`: query params (location, island, town, price range, seats, transmission, fuel, 4x4, airport pickup, dates); return only available cars for dates if provided; pagination.
- Reuse existing `Car` shape and filters where possible; move availability check to server (bookings + blocked dates).
- Rent page: fetch from `GET /api/cars` with current search/filters; keep existing FilterBar/FilterModal and sort.
- **Test:** Search by location/dates/filters; results match DB and availability.

**C7. Availability & calendar**
- Persist availability: blocked dates (and optional min notice, advance window) in DB; API for owner to read/update (e.g. `GET/PUT /api/cars/[id]/availability`).
- Use in search/booking: exclude cars with blocked dates or insufficient notice/advance.
- Optional: simple calendar UI in owner dashboard.
- **Test:** Block dates; search over those dates; car excluded.

**C8. Booking engine**
- Create booking: validate car exists, dates available, min/max days; compute price (daily + weekly/monthly discounts); insert booking (status e.g. pending_payment).
- API: `POST /api/bookings` (car_id, start_date, end_date); return booking + price summary.
- Car detail: “Book now” → date selection (prefill from search if present) → request/confirmation step; show price summary.
- **Test:** Create booking; see it in DB; availability reflects it.

**C9. Pricing logic**
- Centralise rules: price_per_day, min_rental_days, weekly_discount_pct, monthly_discount_pct; server-side function to compute total; currency (DKK).
- Use in booking creation and in price display (detail, checkout).
- **Test:** Price matches expected for given days and discounts.

### Phase D – Payments & Payouts

**D10. Payments (Stripe)**
- Stripe Connect (marketplace): platform account; owners as connected accounts (or standalone Stripe for simplicity first).
- Checkout: create PaymentIntent (or Checkout Session) for booking total; capture on confirm or on trip start (business rule).
- API: `POST /api/bookings/[id]/pay` (or similar); webhook for payment success/failure; update booking status.
- **Test:** End-to-end: select dates → see price → pay (test mode) → booking confirmed.

**D11. Commissions & payouts**
- Store platform_fee (e.g. %) per booking; compute owner_payout; record in payments table.
- Payouts: Stripe Transfer to owner (Connect) or manual; payout history API for owner dashboard.
- **Test:** After payment, fee and payout recorded; owner sees payout balance/history.

### Phase E – Communication & Reputation

**E12. Messaging**
- Schema: threads (e.g. booking_id, owner_id, renter_id), messages (thread_id, sender_id, body, read_at).
- API: create thread (e.g. when booking confirmed), send message, list threads, list messages, mark read.
- UI: Inbox (list threads), conversation view; link from booking/dashboard.
- **Test:** Owner and renter can exchange messages for a booking.

**E13. Reviews**
- Schema: reviews (booking_id, reviewer_id, reviewee_id, car_id, rating, body); aggregate rating per car (and per user if needed).
- API: POST review (after trip), GET reviews for car/user.
- Car detail: show rating and list reviews; “Write review” from renter dashboard for completed booking.
- **Test:** Complete booking → write review → see on car and profile.

### Phase F – Engagement & Dashboards

**F14. Favorites**
- Schema: favorites (user_id, car_id); API: add/remove, list.
- Car card/detail: “Save” heart; “Saved” page or dashboard section.
- **Test:** Save car; see in favorites; remove.

**F15. Owner dashboard**
- Page: My listings (table/cards, edit/delete, toggle active), calendar/availability, bookings (incoming), earnings, payouts, messages.
- APIs already from cars, bookings, payments, messages; add aggregates if needed.
- **Test:** Owner sees own data only; actions work.

**F16. Renter dashboard**
- Page: My bookings (upcoming, past), messages, reviews written, favorites.
- **Test:** Renter sees own bookings and can message/review.

### Phase G – Platform & Quality

**G17. Admin-ready structure**
- Admin role in users; middleware or guard: allow access to `/admin` (or `/dashboard/admin`) only for admin.
- Minimal admin: list users, list cars (with status), list bookings; optional: toggle car visibility, resolve disputes.
- **Test:** Non-admin cannot access admin routes; admin can.

**G18. Notifications**
- Table: notifications (user_id, type, payload, read_at); API: list, mark read.
- Create notifications on: booking request, payment, message, review.
- UI: bell icon in Navbar; dropdown or page; optional email (e.g. Resend/SendGrid).
- **Test:** Trigger events; notification appears; mark read.

**G19. Validation & security hardening**
- Centralise server validation (Zod) on all API inputs; file upload limits and types; rate limiting (e.g. on auth, upload, booking).
- Ensure auth on every mutating route; ownership checks; secure headers (CSP, etc.).
- **Test:** Invalid input rejected; rate limit triggers; forbidden when not owner.

**G20. Observability & logging**
- Structured logging (request id, user id, route, duration, errors); error tracking (e.g. Sentry); optional metrics (bookings, revenue).
- **Test:** Logs and errors visible in chosen tools.

**G21. Testing strategy**
- Unit tests: lib (availability, filter-cars, date-utils), pricing and booking rules.
- API tests: auth, cars CRUD, bookings create, payment webhook.
- E2E (e.g. Playwright): sign up → list car → search → book → pay (test mode).
- **Test:** CI runs tests; critical paths covered.

---

## 6. Summary

| Area | Current state | Backend needed |
|------|----------------|----------------|
| **Pages** | 4 (home, rent, detail, list-your-car) | Auth, dashboards, booking checkout, messaging, reviews, profile, admin |
| **Auth** | Nav links only (#) | Full auth + session + protected routes |
| **Listings** | Wizard → localStorage | API + DB + images; ownership |
| **Search/filter** | Client-side only | API with availability + pagination |
| **Booking** | “Book now” only | Booking engine + pricing + payments |
| **Payments** | None | Stripe; commissions; payouts |
| **Messaging** | None | Threads + messages API + UI |
| **Reviews** | Static rating | Reviews API + aggregates + UI |
| **Favorites** | None | Favorites API + UI |
| **Dashboards** | None | Owner + renter + admin |
| **Admin** | None | Role + minimal moderation |
| **Notifications** | None | Table + API + UI (+ optional email) |
| **Validation/Security** | Client only | Server validation, rate limit, auth |
| **Observability** | None | Logging, errors, metrics |
| **Testing** | None | Unit, API, E2E |

The roadmap (Section 5) is ordered so each step builds on the previous one and can be tested in isolation. Implement one phase/step at a time; do not skip steps; keep the existing UI and only add or wire what is necessary for a production-ready marketplace.
