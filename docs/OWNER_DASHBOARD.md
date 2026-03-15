# Owner Dashboard – Implementation Summary

## 1. Files created or modified

### Created
- **`lib/owner-analytics.ts`** – Reusable analytics: top metrics, financial summary, car performance, revenue over time, utilization/demand, export rows, pickup map data. All queries filter by `car.ownerId = current_user_id` and `booking.status = 'COMPLETED'`.
- **`app/api/owner/analytics/route.ts`** – GET `/api/owner/analytics` – returns all dashboard data (metrics, financial, car performance, charts, utilization, pickup locations). Query params: `period`, `from`, `to`, `vatPercent`, `chartGroup`.
- **`app/api/owner/analytics/export/route.ts`** – GET `/api/owner/analytics/export?from=&to=` – returns CSV for financial/tax export.
- **`app/owner/dashboard/page.tsx`** – Owner Dashboard UI: stats cards, financial section with filters and VAT, CSV export button, revenue charts, car performance table, utilization/demand, Mapbox pickup map.
- **`components/owner-dashboard/OwnerPickupMap.tsx`** – Wrapper for pickup map (dynamic import).
- **`components/owner-dashboard/OwnerPickupMapInner.tsx`** – Mapbox map with markers for owner’s car locations (completed bookings).
- **`docs/OWNER_DASHBOARD.md`** – This file.

### Modified
- **`locales/en.json`** – Added `ownerDashboard.*` strings (title, metrics, financial, export, car performance, utilization, map, payouts).
- **`components/Navbar.tsx`** – Added “Owner Dashboard” link (translated) for logged-in users.
- **`app/profile/page.tsx`** – Fixed TypeScript: verification block only shows for UNVERIFIED/PENDING; removed dead `VERIFIED` branch inside that block.
- **`app/bookings/page.tsx`** – Wrapped content in `<Suspense>` so `useSearchParams()` satisfies Next.js prerender (no change to behaviour).

---

## 2. Database queries used for analytics

All queries use **Prisma** (PostgreSQL). No raw SQL in production paths (only Prisma `findMany`, `aggregate`, `groupBy`).

- **Top metrics**
  - `Booking` aggregate: `_sum(totalPrice, ownerPayoutAmount)`, `_count`, `_avg(totalPrice)` where `car.ownerId = ownerId` and `status = COMPLETED`.
  - Same with `endDate >= monthStart` / `yearStart` for this month/year.
  - `Booking.findMany` (last 365 days, select `startDate`/`endDate`) to compute rental days and utilization.
  - `Booking.findMany` (all completed) to compute average trip duration in JS.
  - `CarListing.count` for owner’s cars (denormalized utilization denominator: carCount × 365).

- **Financial summary**
  - `Booking.findMany` where `car.ownerId`, `status = COMPLETED`, `endDate` in selected range; select `totalPrice`, `platformFeeAmount`, `ownerPayoutAmount`. Sums and VAT done in JS.

- **Car performance**
  - `CarListing.findMany` where `ownerId`, `deletedAt: null`.
  - Per car: `Booking.aggregate` (carId, COMPLETED), `Booking.findMany` (last 365 for utilization), `Booking.findMany` (all for duration). Revenue per month = totalRevenue / months since car creation.

- **Revenue over time**
  - `Booking.findMany` where owner + COMPLETED, select `endDate`, `totalPrice`; group by day/week/month in JS.

- **Utilization & demand**
  - `Booking.findMany` (last 365, owner + COMPLETED) with `startDate`/`endDate`; expand to daily buckets in JS for day-of-week and monthly trend.
  - `CarListing.count` for available car-days.

- **Export**
  - `Booking.findMany` (owner, COMPLETED, endDate in range) with `include: { car, renter }`.

- **Pickup map**
  - `CarListing.findMany` (owner, not deleted) with `latitude`/`longitude`.
  - `Booking.groupBy` by `carId` where owner + COMPLETED for completed count per car.

No new tables or views; all from existing `Booking`, `CarListing`, `Payment`, `Payout`, `User`.

---

## 3. New Supabase / DB tables or views

**None.** The dashboard uses existing Prisma models only. Supabase is used for **Auth**; application data stays in the same PostgreSQL database accessed via Prisma. No new migrations were added.

---

## 4. How financial calculations are derived

- **Gross revenue**  
  Sum of `Booking.totalPrice` for completed bookings in the selected period (owner’s cars). This is what the renter paid.

- **Platform fees**  
  Sum of `Booking.platformFeeAmount` (set at booking creation from `lib/pricing.ts`: 15% commission on discounted rental amount). Stored on each booking.

- **Stripe fees**  
  **Not stored** in the DB. The dashboard uses an **estimate** in `lib/owner-analytics.ts`:  
  `1.4% of totalPrice + 1.8 DKK` per charge (approximation for EU card). Used only for display and CSV export; actual Stripe fees come from Stripe Dashboard or reporting.

- **Net payout to owner**  
  Sum of `Booking.ownerPayoutAmount` for the same completed bookings. Matches what the platform records for payouts; actual money to the owner is sent via Stripe Connect (transfer at checkout), and `Payout` records represent batched payouts in the app.

- **Estimated VAT owed**  
  `vatPercent` (e.g. 25%) × net payout, for display only. Not legal/tax advice.

- **Net income before tax**  
  Net payout minus estimated VAT.

- **CSV export**  
  One row per completed booking: `booking_id`, `car_name`, `renter_name`, `trip_start`, `trip_end`, `rental_price` (= totalPrice), `platform_fee`, `stripe_fee` (estimated), `net_payout`. Suitable for accounting/tax preparation; Stripe fee column is explicitly estimated.

---

## 5. Suggestions for future analytics improvements

- **Caching**  
  Cache aggregated metrics (e.g. top metrics, financial summary) per owner with a short TTL (e.g. 5–15 minutes) to reduce load and speed up the dashboard.

- **Stripe Reporting API**  
  Optionally pull actual fee and payout data from Stripe (Balance Transactions, Payouts) and show “Actual Stripe fees” and “Actual payouts” alongside or instead of estimates.

- **Real Stripe payouts**  
  Today, “Payouts” are in-app `Payout` records. If you later implement real Stripe Transfers to Connect accounts, sync status (e.g. `COMPLETED`/`FAILED`) from webhooks and show it on the dashboard.

- **VAT configuration**  
  Store VAT rate (and rules) in platform config or per-region so owners see correct estimates without typing a percentage.

- **Date range presets**  
  Add “Last 7 days”, “Last 30 days”, “Last quarter” and ensure financial summary and export use the same range.

- **Charts**  
  Introduce a small chart library (e.g. Recharts) for line/area revenue charts and clearer tooltips.

- **Trip/tracking data**  
  If you add trip or location history (e.g. GPS during rental), you could show trip heatmaps and popular routes on the Mapbox map.

- **RLS / API security**  
  Keep enforcing `car.ownerId = session.user.id` in all analytics and export endpoints; consider rate limiting or CAPTCHA on export to prevent abuse.
