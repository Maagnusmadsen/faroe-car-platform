# System Audit Report — Faroe Car Platform

**Audit date:** 2025-03  
**Scope:** End-to-end marketplace platform (renters, owners, admin, payments, bookings, listings)

---

## 1. Entity Map & Data Flow

### Core Entities
- **User** — auth, role (USER/ADMIN), Stripe Connect for owners
- **UserProfile** — verification status for renters (UNVERIFIED/PENDING/VERIFIED)
- **CarListing** — owner's car, status (DRAFT/ACTIVE/PAUSED/REJECTED), pricing
- **Booking** — renter + car + dates, status, totalPrice, platformFeeAmount, ownerPayoutAmount
- **Payment** — linked to booking, type CHARGE/REFUND/PAYOUT, Stripe IDs
- **Payout** — batched owner payouts, status PENDING/COMPLETED/FAILED

### Relationships
- `totalPrice` = `platformFeeAmount` + `ownerPayoutAmount` (always)
- Payouts aggregate `ownerPayoutAmount` from COMPLETED bookings with SUCCEEDED CHARGE
- Availability: CarBlockedDate + overlapping bookings (PENDING_PAYMENT, PENDING_APPROVAL, CONFIRMED, DISPUTED)

---

## 2. CRITICAL ISSUES (Must Fix)

### 2.1 Stripe Webhook Returns 200 on Error — FIXED

**Status:** Resolved. The webhook now:
- Returns 500 on processing failures so Stripe retries
- Returns 400 on signature/body errors (non-retryable)
- Uses `StripeWebhookEvent` table for idempotency (same event processed once)

---

### 2.2 Zero-Price Listings Can Break Checkout

**Location:** `lib/listings-server.ts` line 156, `lib/pricing.ts`

**Problem:** `pricePerDay` is allowed to be 0 (`price >= 0 ? price : 0`). Pricing produces `totalPrice = 0`, `platformFeeAmount = 0`, `ownerPayoutAmount = 0`. Stripe Checkout typically has minimum charge requirements (e.g. 50 øre for DKK). A 0 DKK charge may fail or behave unexpectedly.

**Fix:** Enforce `pricePerDay > 0` at validation (wizard + API) and in `buildCreatePayload` / `buildUpdatePayload`. Reject 0 in `calculatePricingForListing` if desired.

---

### 2.3 No Payment Record Before Checkout — Webhook Is Sole Creator

**Location:** `app/api/payments/checkout/route.ts`, `app/api/stripe/webhook/route.ts`

**Problem:** The Payment record is created only when `checkout.session.completed` fires. If the webhook fails and we fix it by returning 500, Stripe will retry. But if the Payment upsert fails for another reason (e.g. duplicate key), there is no pre-created Payment to reconcile with. The flow is correct but fragile: all payment state depends on one webhook.

**Fix:** Consider creating a Payment in PENDING state when initiating checkout, then updating it in the webhook. This gives a traceable record even if the webhook fails initially. Ensure idempotency via `stripePaymentIntentId`.

---

## 3. LOGICAL INCONSISTENCIES

### 3.1 Owner Approval Flow: CONFIRMED → PENDING_PAYMENT Naming

**Location:** `app/api/bookings/[id]/status/route.ts` lines 84–88

When the owner approves, the code writes `PENDING_PAYMENT` (not `CONFIRMED`). This is correct: the renter must pay before the booking is truly confirmed. The status name `CONFIRMED` in the schema is used after payment. The logic is fine; the naming could confuse developers. Consider documenting this explicitly.

---

### 3.2 PAID Status Unused in Flow

**Location:** Schema, availability, analytics

**Problem:** The booking flow uses PENDING_APPROVAL → PENDING_PAYMENT → CONFIRMED. The `PAID` status exists but is never set. Analytics uses `paidStatuses = ["PAID", "CONFIRMED", "COMPLETED"]` for "upcoming" — so PAID is treated as equivalent to CONFIRMED for display. Availability does not block on PAID. No functional bug, but PAID is redundant.

**Suggestion:** Either use PAID explicitly (e.g. set PAID when payment succeeds, then CONFIRMED when trip starts) or remove it from analytics and document that CONFIRMED implies paid.

---

### 3.3 Revenue vs Net vs Gross Terminology

**Location:** Owner analytics, admin analytics, dashboards

- Owner dashboard: "totalRevenue" = sum of `totalPrice` (gross), "netEarnings" = sum of `ownerPayoutAmount`
- Admin: "totalPlatformRevenue" = gross, "platformFees", "totalOwnerEarnings"

Terminology is consistent. Owner "revenue" is renter-paid amount (gross); "net" is post-fee. No fix needed; document in a glossary.

---

## 4. POTENTIAL BUGS

### 4.1 Floating-Point Rounding in Pricing

**Location:** `lib/pricing.ts` lines 102–103

```ts
const ownerPayoutAmount = renterTotalAmount - platformFeeAmount;
```

`renterTotalAmount` and `platformFeeAmount` are derived from rounded values. In edge cases, floating-point arithmetic could yield e.g. 84.9999999. The test uses `Math.round()` for comparison.

**Fix:** Explicitly round `ownerPayoutAmount` before returning: `Math.round(renterTotalAmount - platformFeeAmount)`.

---

### 4.2 Users API: Combining filter=pending with search

**Location:** `app/api/admin/users/route.ts`

When `filter === "pending"`, `where.profile = { verificationStatus: "PENDING" }` is set. Users without a profile will not match. This is correct. Prisma relation filters work as expected. No bug identified.

---

### 4.3 Admin revenueLastMonth Date Range

**Location:** `lib/admin-analytics.ts` lines 146–152

```ts
endDate: { gte: lastMonthStart, lt: monthStart }
```

For "last month" we want `endDate` in [first day of last month, first day of this month). `lt: monthStart` is correct. For January, `lastMonthStart` is Dec 1; `monthStart` is Jan 1. Correct.

---

### 4.4 Booking endDate Stored as End-of-Day

**Location:** `lib/bookings-server.ts` line 77

```ts
endDate: new Date(endDate + "T23:59:59.999Z"),
```

Schema uses `@db.Date`, which in PostgreSQL stores only the date. The time portion is effectively truncated. Overlap checks use `startDate`/`endDate`; for DATE columns, Jan 1–5 and Jan 5–10 correctly overlap on Jan 5. No bug.

---

### 4.5 Car Search: availabilityRule Optional

**Location:** `lib/availability-server.ts`, `lib/car-search.ts`

Cars without `CarAvailabilityRule` are not in the rules loop, so they are not marked unavailable by rules. Effectively "no rule = no restriction". Cars created via the wizard get an `availabilityRule` from `buildCreatePayload`. Cars created another way might not — worth verifying all creation paths create the rule.

---

## 5. EDGE CASE RISKS

### 5.1 Same-Day Booking

**Location:** `lib/pricing.ts` — `diffInDays`

`diffInDays("2025-01-05", "2025-01-05")` = 0. `days <= 0` throws. Same-day is rejected. Correct.

---

### 5.2 Cancelling After Completion

**Location:** `app/api/bookings/[id]/status/route.ts` line 59

```ts
if (booking.status === "COMPLETED") {
  return jsonError("Booking is already completed", 409);
}
```

Completed bookings cannot be mutated. Correct.

---

### 5.3 Listing With No Bookings

**Location:** Owner analytics, admin analytics

`getOwnerCarPerformance` and `getAdminListingPerformance` handle empty bookings (count 0, revenue 0, utilization 0). No crash.

---

### 5.4 User With No Listings (Owner Dashboard)

**Location:** `hooks/useOwnerDashboard.ts`, owner pages

`hasListings` gates dashboard data. Users without listings see the "List your car" CTA. Correct.

---

### 5.5 Negative or Invalid Values

**Location:** Various

- Pricing: `diffInDays` and `minRentalDays` validated.
- Listing: `pricePerDay >= 0` in buildCreatePayload (zero allowed; see Critical 2.2).
- No evidence of negative `platformFeeAmount` or `ownerPayoutAmount` from pricing.

---

### 5.6 Empty States in UI

Owner and admin pages generally handle `loading`, `error`, and empty data. Quick spot-check: tables show "No X found" when empty. No major gaps noted.

---

## 6. ARCHITECTURE IMPROVEMENTS

### 6.1 Centralize Monetary Formatting

**Location:** Multiple pages

`formatCurrency` / `formatPrice` / `formatMoney` are defined in multiple places (owner-dashboard-utils, admin pages, bookings page). Consolidate in a shared util (e.g. `lib/format.ts`) to avoid drift.

---

### 6.2 Platform Fee Config in DB vs Code

**Location:** `lib/pricing.ts`, `PlatformFeeConfig` model

Pricing uses hardcoded `PLATFORM_COMMISSION_PERCENT = 15`. The schema has `PlatformFeeConfig` but it is unused. For flexibility (A/B tests, regions), consider reading fee from DB with a sensible default.

---

### 6.3 Stripe Webhook Idempotency

**Location:** `app/api/stripe/webhook/route.ts`

Payment upsert by `stripePaymentIntentId` is idempotent. Booking status update is idempotent (setting CONFIRMED again is safe). Notifications may fire twice on retries. Consider tracking processed event IDs to avoid duplicate notifications.

---

### 6.4 Admin Route Protection

**Location:** `components/admin/AdminLayout.tsx`

Admin layout checks `user.role === "ADMIN"` and redirects non-admins. API routes use `requireAdmin`. Double layer is good. No change needed.

---

## 7. MINOR IMPROVEMENTS

### 7.1 Booking Validation: endDate > startDate in Schema

**Location:** `validation/schemas/booking.ts`

`bookingCreateSchema` validates date format but not `endDate > startDate`. The pricing layer throws, but schema-level validation would fail fast with a clearer error.

**Suggestion:** Add `.refine((data) => data.endDate > data.startDate, "End date must be after start date")`.

---

### 7.2 Decimal to Number Conversion

**Location:** Various

Prisma `Decimal` fields are often converted with `Number(x)` or `x.toString()`. Ensure consistent handling (e.g. `Number(b.ownerPayoutAmount)` vs `Number(b.ownerPayoutAmount?.toString())`) to avoid null/undefined edge cases.

---

### 7.3 Admin Dashboard: revenueLastMonth for First Month

**Location:** `lib/admin-analytics.ts`

For the first month of platform existence, `revenueLastMonth` is 0. The dashboard trend calculation handles this (`revenueTrend = null` when `revenueLastMonth === 0`). No bug.

---

## 8. DATA CONSISTENCY SUMMARY

| Check | Status |
|-------|--------|
| totalPrice = platformFeeAmount + ownerPayoutAmount | ✓ Enforced in pricing |
| Owner dashboard net = sum(ownerPayoutAmount) | ✓ |
| Admin platform revenue = sum(totalPrice) | ✓ |
| Admin platform fees = sum(platformFeeAmount) | ✓ |
| Payout eligibility: COMPLETED + SUCCEEDED CHARGE | ✓ |
| Stripe charge amount = booking.totalPrice | ✓ |
| Stripe application_fee = booking.platformFeeAmount | ✓ |

---

## 9. RECOMMENDED ACTION ORDER

1. **Critical:** Fix Stripe webhook error handling (return 5xx on failure, ensure idempotency).
2. **Critical:** Enforce `pricePerDay > 0` to avoid zero-charge checkout.
3. **High:** Round `ownerPayoutAmount` in pricing for consistency.
4. **Medium:** Add `endDate > startDate` to booking schema validation.
5. **Low:** Centralize currency formatting.
6. **Low:** Consider using `PlatformFeeConfig` for fee configuration.

---

## 10. OVERALL ASSESSMENT

The system is well-structured with clear separation of concerns. The booking flow, pricing, and payout logic are consistent. The main production risks are:

1. **Stripe webhook failure handling** — highest impact; can leave paid bookings unconfirmed.
2. **Zero-price edge case** — lower probability but can cause checkout failures.

With those addressed and the minor improvements applied, the platform should be reliable for production use.
