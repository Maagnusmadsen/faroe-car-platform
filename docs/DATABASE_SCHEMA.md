# FaroeRent – Database schema (GoMore-like marketplace)

PostgreSQL schema for Supabase, managed with Prisma. This document describes all tables, relationships, indexes, and security.

---

## 1. Overview

- **Profiles:** `User`, `UserProfile`
- **Listings:** `CarListing`, `CarImage`, `CarFeature`, `CarAvailabilityRule`, `CarBlockedDate`, `PickupOption`
- **Bookings:** `Booking`, `BookingStatusHistory`
- **Payments:** `Payment`, `Payout`
- **Reviews:** `Review`, `ReviewResponse`
- **Conversations:** `Conversation`, `ConversationParticipant`, `Message`
- **Notifications:** `Notification`
- **Favorites:** `Favorite`
- **Saved search:** `SavedSearch`
- **Admin:** `AdminAuditLog`, `PlatformFeeConfig`
- **Auth (legacy):** `Account`, `Session`, `VerificationToken`

All main entities use `createdAt` and `updatedAt` where relevant. Enums keep status flows explicit and type-safe.

---

## 2. Tables and relationships

### 2.1 User & profile

| Table | Purpose |
|-------|---------|
| **User** | Core identity. `supabaseUserId` links to Supabase Auth. `role` = USER \| ADMIN. Soft delete via `deletedAt`. |
| **UserProfile** | Extended profile: phone, avatar, bio, address (country, region, city, postalCode), owner/renter notes, `verificationStatus`. 1:1 with User. |

**Relations:** User → UserProfile (1:1). User → CarListing (1:n, as owner). User → Booking (1:n, as renter). User → Favorite, Review, ConversationParticipant, Message, Notification, SavedSearch, Payout, AdminAuditLog.

---

### 2.2 Listings (cars)

| Table | Purpose |
|-------|---------|
| **CarListing** | Main listing. Owner, brand, model, year, description, `status` (DRAFT \| ACTIVE \| PAUSED \| REJECTED), price, location (town, island, lat/lng), pickup, seats, transmission, fuel, vehicleType, is4x4, rating/reviewCount. **Moderation:** `rejectionReason`, `moderatedAt`. |
| **CarImage** | Images per listing. `url`, `sortOrder`, `storageKey` (for Supabase Storage delete). |
| **CarFeature** | Key/value features (e.g. bluetooth, child_seat). Unique per (carId, featureKey). |
| **CarAvailabilityRule** | 1:1 per car: `minNoticeDays`, `advanceBookingDays`. |
| **CarBlockedDate** | Explicit blocked dates per car. Unique (carId, date). |
| **PickupOption** | Alternative pickup locations/addresses for a car. |

**Relations:** CarListing → CarImage (1:n), CarFeature (1:n), CarAvailabilityRule (1:1), CarBlockedDate (1:n), PickupOption (1:n), Booking (1:n), Favorite (1:n), Review (1:n).

---

### 2.3 Bookings

| Table | Purpose |
|-------|---------|
| **Booking** | Renter books a car. `startDate`, `endDate`, `status`, `totalPrice`, `platformFeeAmount`, `ownerPayoutAmount`, `pickupLocationSnapshot`. Optional link to `Payout` for owner payout. |
| **BookingStatusHistory** | Audit trail of status changes (optional note per change). |

**BookingStatus enum:**  
`PENDING_PAYMENT` (pending), `PENDING_APPROVAL` (optional owner-approval flow), `CONFIRMED` (approved), `REJECTED`, `PAID`, `CANCELLED`, `COMPLETED`, `DISPUTED`.

**Relations:** Booking → CarListing (n:1), User as renter (n:1), Payout (n:1 optional), BookingStatusHistory (1:n), Payment (1:n), Conversation (1:1), Review (1:n).

---

### 2.4 Payments & payouts

| Table | Purpose |
|-------|---------|
| **Payment** | Single charge/refund/payout. `type` (CHARGE \| REFUND \| PAYOUT), `amount`, `status` (PENDING \| SUCCEEDED \| FAILED \| REFUNDED). Optional `bookingId`, Stripe IDs, `metadata`. |
| **Payout** | Owner payout. Links to User; multiple Bookings can be grouped into one Payout. `stripeTransferId`, `paidAt`. |

**Relations:** Payment → Booking (n:1 optional). Payout → User (n:1), Booking (1:n).

---

### 2.5 Reviews

| Table | Purpose |
|-------|---------|
| **Review** | Written after a **completed** booking. Reviewer (renter), reviewee (owner), rating 1–5, body. One review per (bookingId, reviewerId). |
| **ReviewResponse** | Owner response to a review (1:1 per review). |

**Relations:** Review → Booking, CarListing, User (reviewer), User (reviewee). ReviewResponse → Review, User (author).

---

### 2.6 Conversations & messages

| Table | Purpose |
|-------|---------|
| **Conversation** | One conversation per booking (buyer–seller). |
| **ConversationParticipant** | Users in the conversation (renter + owner). Unique (conversationId, userId). |
| **Message** | Messages in a conversation. `body`, `readAt`, `createdAt`, `updatedAt`. |

**Relations:** Conversation → Booking (1:1), ConversationParticipant (1:n), Message (1:n). Message → Conversation, User (sender).

---

### 2.7 Notifications, favorites, saved search

| Table | Purpose |
|-------|---------|
| **Notification** | Per-user notifications. `type` (e.g. BOOKING_CONFIRMED, MESSAGE, REVIEW_RECEIVED), `title`, `body`, `data` (JSON), `readAt`. |
| **Favorite** | User’s saved listings. Composite PK (userId, carId). |
| **SavedSearch** | Saved search filters (query JSON, optional email notify). |

---

### 2.8 Admin & platform

| Table | Purpose |
|-------|---------|
| **AdminAuditLog** | Who did what: `action`, `entityType`, `entityId`, `payload`, optional `userId`, `ipAddress`. |
| **PlatformFeeConfig** | Fee rules (e.g. percentage or fixed), `effectiveFrom` / `effectiveTo`. |

---

## 3. Indexes (recommended / existing)

Prisma schema already defines indexes; below is a concise map.

- **User:** (supabaseUserId unique), (email unique).
- **CarListing:** ownerId, status, town, island, (status, town), (status, pricePerDay), (latitude, longitude).
- **CarImage:** carId.
- **CarBlockedDate:** carId, date, (carId, date) unique.
- **Booking:** carId, renterId, status, payoutId, (renterId, status, endDate), (startDate, endDate), (carId, startDate, endDate).
- **Message:** conversationId, senderId, (conversationId, createdAt) for chronological listing.
- **Notification:** userId, (userId, readAt) for unread list.
- **Favorite:** userId, carId, composite PK (userId, carId).
- **Review:** carId, revieweeId, unique (bookingId, reviewerId).

Additional indexes can be added in Prisma or raw SQL if query patterns change (e.g. full-text on CarListing.description).

---

## 4. Row Level Security (RLS) – Supabase

Prisma runs with the database URL (e.g. pooler) and does **not** enforce RLS by itself. For direct Supabase client access (e.g. Realtime, PostgREST), enable RLS and attach policies.

See **`supabase/rls_policies.sql`** for:

- Enabling RLS on public tables that hold user data.
- Policies so users see only their own rows (or rows they’re allowed to see, e.g. their bookings, their listings, conversations they participate in).
- Service role (e.g. app backend using Prisma) typically bypasses RLS; keep `DATABASE_URL` / server-side access with a role that has full access, and use RLS only for client-side or PostgREST access if you expose it.

**Security summary:**

- **App (Next.js) today:** Auth via Supabase Auth; all writes/reads go through your API routes and Prisma (server-side). No RLS required for that path.
- **If you add Supabase client queries from the browser** (e.g. realtime subscriptions, or PostgREST): then add RLS so users cannot read or write other users’ data. The SQL file gives a minimal policy set for that.

---

## 5. created_at / updated_at

- **User, UserProfile:** createdAt, updatedAt.
- **CarListing, CarAvailabilityRule, PickupOption, Booking, Payment, Payout, Conversation, Message, ReviewResponse, PlatformFeeConfig:** createdAt, updatedAt (and Message has updatedAt as of latest schema).
- **CarImage, CarFeature, CarBlockedDate, BookingStatusHistory, Review, Notification, Favorite, SavedSearch, AdminAuditLog:** createdAt (and updatedAt where it matters).

---

## 6. MVP vs scale

- **MVP:** Current schema is enough: users, profiles, listings, images, availability rules, blocked dates, bookings (with full status set), payments, payouts, reviews, conversations/messages, notifications, favorites, saved search, audit log and fee config.
- **Scale:** Add indexes as needed from real query patterns; consider partitioning for `Booking`, `Message`, `Notification` by time if tables grow very large; keep RLS policies simple and avoid heavy joins in policies.
