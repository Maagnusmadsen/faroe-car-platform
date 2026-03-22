# RentLocal Notification & Email System – Design Document

## 1. Current-State Audit

### 1.1 Email-Related Code

| Location | Purpose | Notes |
|----------|---------|-------|
| **Supabase Auth** | Signup confirmation, password reset | Handled entirely by Supabase; configured in Supabase Dashboard. No app code. |
| **app/auth/callback/route.ts** | OAuth/magic link redirect | Supabase redirects here after email confirmation. |
| **app/contact/page.tsx** | Contact | Uses `mailto:` links; no server-side email. |
| **lib/notifications-server.ts** | In-app notifications | Creates `Notification` records only; no email. |

**Resend:** Not currently in `package.json`. Design assumes Resend will be added as the email provider.

### 1.2 Notification Call Sites

| Call Site | Function | Trigger |
|-----------|----------|---------|
| `lib/supabase/sync-user.ts` | `notifyUserSignup` | New user created in Prisma |
| `lib/bookings-server.ts` | `notifyBookingCreated` | Booking created (PENDING_APPROVAL) |
| `lib/stripe-webhook.ts` | `notifyBookingConfirmed`, `notifyPaymentReceived` | checkout.session.completed |
| `app/api/bookings/[id]/status/route.ts` | `notifyBookingCancelled`, `notifyReviewReminder` | Status → CANCELLED, COMPLETED |
| `lib/messaging-server.ts` | `notifyNewMessage` | New message in conversation |
| `lib/payouts-server.ts` | `notifyPayoutCreated` | Payout record created |
| `app/api/admin/users/[id]/verification/route.ts` | `notifyRenterApproved` | Renter verification set to VERIFIED |
| `app/api/listings/[id]/publish/route.ts` | `notifyListingPublished` | Listing published |

### 1.3 Current In-App Notification Logic

- **Model:** `Notification` (userId, type, title, body, data, readAt, createdAt)
- **Types:** `BOOKING_REQUEST`, `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `PAYMENT_RECEIVED`, `PAYOUT_SENT`, `MESSAGE`, `REVIEW_RECEIVED`, `SYSTEM`
- **API:** `GET /api/notifications` (list), `PATCH /api/notifications` (mark read)

### 1.4 Gaps: Transactional Product Emails

- **None** of the above events send email today.
- User said "We use Resend" but Resend is not integrated. Design adds it.

### 1.5 Technical Debt & Architectural Problems

1. **Tight coupling:** Business logic (bookings, payments, messaging) directly calls `notify*` functions. No event abstraction.
2. **No idempotency:** Duplicate events (e.g. webhook retries) can create duplicate notifications. SYSTEM_AUDIT_REPORT.md already notes this.
3. **Webhook risk:** Stripe webhook calls `notify*` inside the transaction. If notification fails, the whole webhook fails and Stripe retries. Order: update DB → notify → record. If notify throws, tx rolls back; on retry we reprocess and could double-notify.
4. **No preferences:** Users cannot disable optional notifications.
5. **No delivery tracking:** No record of email sends, failures, or retries.
6. **No templates:** All content is hardcoded in `lib/notifications-server.ts`.
7. **SavedSearch.notifyEmail:** Exists in schema but is never used.

---

## 2. Target Architecture

### 2.1 Principles

- **Event-driven:** Business logic emits domain events. A notification service consumes them.
- **Decoupled:** No direct `sendEmail` calls from booking, payment, or messaging code.
- **Channel abstraction:** In-app, email (Resend), future SMS/push via pluggable providers.
- **Idempotent:** Same event + idempotency key = at most one notification per channel.
- **Observable:** Log events, deliveries, provider responses, failures.

### 2.2 Layered Design

```
┌─────────────────────────────────────────────────────────────────┐
│  Business Logic (bookings, payments, messaging, payouts, etc.)   │
│  → Emits: dispatchNotificationEvent({ type, idempotencyKey, ... })│
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Notification Service (lib/notifications/)                       │
│  - createNotificationEvent() – persist event, dedupe             │
│  - dispatchNotificationEvent() – orchestrate delivery            │
│  - Resolves recipients, checks preferences, selects channels     │
└─────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │ In-App       │ │ Email        │ │ (Future SMS) │
            │ Provider     │ │ Provider     │ │              │
            │              │ │ (Resend)     │ │              │
            └──────────────┘ └──────────────┘ └──────────────┘
                    │               │
                    ▼               ▼
            Notification     NotificationDelivery
            (existing)       EmailLog
```

### 2.3 Flow

1. **Event emission:** `dispatchNotificationEvent({ type: "booking.confirmed", idempotencyKey: `booking-${bookingId}-confirmed`, payload: { bookingId, renterId, carId, ... } })`
2. **Idempotency:** Check `NotificationEvent` for existing event with same idempotency key. If exists, return early (optionally still return created).
3. **Recipient resolution:** From event type + payload → userId(s), email(s).
4. **Preference check:** For non-critical events, check `NotificationPreference`. Skip disabled channels.
5. **Channel dispatch:**
   - In-app: Create `Notification` record (existing model).
   - Email: Render template, call Resend, create `NotificationDelivery` + `EmailLog`.
6. **Persistence:** Event, delivery attempts, provider responses stored for debugging.

---

## 3. Database Schema

### 3.1 New Tables

**NotificationEvent**
- Purpose: Immutable record of domain events that triggered notifications.
- Columns: id, eventType, idempotencyKey (unique), payload (JSON), sourceId (e.g. bookingId), sourceType, createdAt
- Indexes: idempotencyKey (unique), eventType, createdAt, sourceType+sourceId

**NotificationDelivery**
- Purpose: Per-recipient, per-channel delivery attempt.
- Columns: id, eventId, userId, channel (IN_APP | EMAIL), status (PENDING | SENT | FAILED), notificationId (for in-app), emailLogId (for email), attemptCount, lastAttemptAt, lastError, createdAt, updatedAt
- Indexes: eventId, userId+channel, status

**NotificationPreference**
- Purpose: User preferences for optional notifications.
- Columns: id, userId, eventType, channel, enabled (default true), updatedAt
- Unique: (userId, eventType, channel)

**EmailLog**
- Purpose: Audit trail for email sends (Resend response, status, etc.).
- Columns: id, deliveryId, provider (RESEND), providerMessageId, toEmail, subject, status (SENT | FAILED | BOUNCED), statusCode, rawResponse (JSON), sentAt, createdAt
- Indexes: deliveryId, providerMessageId, toEmail, sentAt

### 3.2 Existing `Notification` Table

- Keep as-is for in-app display. It remains the target of the IN_APP channel.
- Optionally add `eventId` and `deliveryId` for traceability (migration adds these).

---

## 4. Event Taxonomy

| Event Type | Recipient(s) | Channels (default) | Critical? | User can disable? |
|------------|--------------|--------------------|-----------|--------------------|
| `booking.requested` | Owner | in-app, email | No | Yes (email) |
| `booking.approved` | Renter | in-app, email | Yes | No |
| `booking.rejected` | Renter | in-app, email | Yes | No |
| `booking.confirmed` | Renter | in-app, email | Yes | No |
| `booking.cancelled` | Renter, Owner | in-app, email | Yes | No |
| `booking.reminder` | Renter | in-app, email | No | Yes |
| `trip.started` | Renter, Owner | in-app | No | Yes |
| `trip.ended` | Renter, Owner | in-app | No | Yes |
| `payment.received` | Owner | in-app, email | Yes | No |
| `payment.receipt` | Renter | in-app, email | Yes | No |
| `payout.sent` | Owner | in-app, email | Yes | No |
| `payout.failed` | Owner | in-app, email | Yes | No |
| `message.received` | Other participant | in-app, email | No | Yes (email) |
| `review.requested` | Renter, Owner | in-app, email | No | Yes |
| `listing.published` | Owner | in-app | No | Yes |
| `renter.approved` | Renter | in-app, email | Yes | No |
| `user.welcome` | New user | in-app | No | N/A |

---

## 5. Service Design

### 5.1 Public API

```ts
// Emit event – call from business logic. Idempotent.
dispatchNotificationEvent({
  type: "booking.confirmed",
  idempotencyKey: `booking-${bookingId}-confirmed`,
  payload: { bookingId, renterId, carId, ownerId, amount, currency, startDate, endDate },
});

// Lower-level (used internally or for manual sends)
createNotificationEvent(...);
createInAppNotification(userId, type, title, body, data);
sendEmailNotification(userId, eventType, payload);
```

### 5.2 File Structure

```
lib/notifications/
├── index.ts              # Public API: dispatchNotificationEvent, etc.
├── service.ts            # Core orchestration
├── events.ts             # Event type definitions, recipient resolution
├── channels/
│   ├── in-app.ts         # In-app provider
│   └── email.ts          # Email provider (Resend)
├── providers/
│   └── resend.ts         # Resend client wrapper
├── templates/
│   ├── index.ts          # Template registry
│   ├── layout.tsx        # Shared layout (or .ts for string templates)
│   └── *.ts              # Per-event templates
├── preferences.ts        # Preference checks
└── types.ts              # Shared types
```

---

## 6. Migration Strategy

### Phase 1: Add schema and service (no behavior change)
- Add Prisma models: NotificationEvent, NotificationDelivery, NotificationPreference, EmailLog.
- Add optional `eventId`, `deliveryId` to Notification.
- Implement notification service, Resend provider, templates.
- **Do not** wire business logic yet.

### Phase 2: Wire events, keep in-app compatibility
- Replace direct `notify*` calls with `dispatchNotificationEvent`.
- Map old NotificationType to new event types.
- In-app notifications continue to work via new service.
- Email starts sending for configured events.

### Phase 3: Preferences and cleanup
- Add preferences API and UI.
- Deprecate/remove old `lib/notifications-server.ts` helpers.
- Add idempotency keys at all call sites.

### Phase 4: Stripe webhook decoupling
- Move notification dispatch **after** transaction commit (e.g. `prisma.$transaction(...).then(() => dispatchNotificationEvent(...))`).
- Ensures webhook success does not depend on notification delivery.

---

## 7. Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `RESEND_API_KEY` | Resend API key | `re_xxx` |
| `EMAIL_FROM_ADDRESS` | Sender email | `notifications@rentlocal.fo` |
| `EMAIL_FROM_NAME` | Sender name | `RentLocal` |
| `EMAIL_REPLY_TO` | Reply-to (optional) | `support@rentlocal.fo` |
| `NEXT_PUBLIC_APP_URL` or existing base URL | Links in emails | `https://rentlocal.fo` |
| `SUPPORT_EMAIL` | Support contact | `support@rentlocal.fo` |

---

## 9. Migration Plan (Executed)

### Phase 1 ✅
- Added Prisma models: NotificationEvent, NotificationDelivery, NotificationPreference, EmailLog
- Added eventId, deliveryId to Notification
- Implemented `lib/notifications/` service, Resend provider, templates

### Phase 2 ✅
- Replaced all `notify*` calls with `dispatchNotificationEvent`
- Removed `lib/notifications-server.ts`
- Stripe webhook: notifications dispatched after transaction commit (decoupled)

### Phase 3 ✅
- Added `GET/PATCH /api/notifications/preferences`
- Preferences apply to optional events only; critical events cannot be disabled

### Phase 4 ✅
- Stripe webhook already decoupled – notifications run after DB commit

### Environment setup for production
Add to `.env` / Vercel:
```
RESEND_API_KEY=re_xxx
EMAIL_FROM_ADDRESS=notifications@rentlocal.fo
EMAIL_FROM_NAME=RentLocal
EMAIL_REPLY_TO=support@rentlocal.fo
SUPPORT_EMAIL=support@rentlocal.fo
```
Without `RESEND_API_KEY`, email channel is skipped (in-app only).

---

## 10. Follow-Up Recommendations

1. **Queue-based processing:** When ready, move `dispatchNotificationEvent` to a job queue (e.g. Inngest, Trigger.dev, BullMQ) so delivery is fully async.
2. **Rate limiting:** Resend has limits; consider batching or deferral for high-volume events.
3. **Localization:** Templates use env-based URLs; add `locale` to payload and template selection for i18n.
4. **Saved search alerts:** Implement using `notification_event` + cron to detect new matches and emit `saved_search.match` events.
5. **Webhook for Resend:** Use Resend webhooks for bounce/complaint handling; update EmailLog and possibly user status.
