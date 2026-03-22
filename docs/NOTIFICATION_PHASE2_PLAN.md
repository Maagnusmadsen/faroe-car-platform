# Notification System – Phase 2 Implementation Plan

## 1. Current State (Inspection Summary)

### Architecture
- **Entry point:** `dispatchNotificationEvent()` in `lib/notifications/service.ts`
- **Call sites (8):** `bookings-server.ts`, `stripe-webhook.ts`, `bookings/[id]/status`, `messaging-server.ts`, `payouts-server.ts`, `sync-user.ts`, `listings/[id]/publish`, `admin/users/[id]/verification`
- **Flow:** Synchronous end-to-end. Each call: idempotency check → create event → enrich payload → resolve recipients → for each recipient/channel → deliver (in-app or email)
- **Stripe webhook:** Already decoupled – notifications run after DB transaction, with `.catch()` so webhook success does not depend on them

### Database
- `NotificationEvent` – idempotency key, payload
- `NotificationDelivery` – status (PENDING|SENT|FAILED|SKIPPED), attemptCount, lastError
- `NotificationPreference` – userId, eventType, channel, enabled
- `EmailLog` – provider, status, rawResponse, sentAt

### Gaps
| Area | Current | Gap |
|------|---------|-----|
| Processing | Synchronous | No queue; request waits for all deliveries |
| Retries | None | Failed deliveries stay FAILED; no retry logic |
| Templates | Inline HTML strings | No React/component-based; hard to preview; no i18n |
| Batching | None | Rapid messages = one email per message |
| Preferences UI | API only | No way for users to change settings |

---

## 2. Phased Plan

### Phase A: Async/Background Processing with Inngest ✅ IMPLEMENTED

**What:** Move delivery (in-app + email) into Inngest functions. Callers invoke `dispatchNotificationEvent`, which creates the event and enqueues an Inngest job; the job performs recipient resolution and channel delivery.

**Why it matters:**
- Request latency: booking/payment flows no longer wait for email sends
- Reliability: Inngest retries on failure
- Decoupling: business logic never blocks on external services (Resend)
- Foundation for retries and observability

**Files that will change:**
- `package.json` – add `inngest`
- New: `app/api/inngest/route.ts` – Inngest webhook handler
- New: `lib/inngest/client.ts` – Inngest client
- New: `lib/inngest/functions/notifications.ts` – `notification/dispatch` function
- `lib/notifications/service.ts` – `dispatchNotificationEvent` creates event, then `inngest.send()` instead of calling `deliverInApp` / `deliverEmail` directly
- `lib/notifications/index.ts` – potentially export a `processNotificationEvent` for Inngest to call (or keep it internal to the Inngest function)
- `config/env.ts` – add `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY` (optional)

**Risks:**
- Inngest requires a public webhook URL; local dev needs Inngest dev server or ngrok
- Eventual consistency: user might see in-app notification a few seconds after action
- Need to handle “Inngest unavailable” gracefully (fallback to sync? or fail-safe?)

**Now or later:** **Now.** This is the backbone. Retries, batching, and better observability all benefit from async processing.

---

### Phase B: Retry and Failure States

**What:**
- Add retry logic for FAILED deliveries (exponential backoff, max attempts)
- Extend `DeliveryStatus` or add `nextRetryAt` to support retry scheduling
- Optionally add `RETRYING` or keep `FAILED` and use `nextRetryAt` to decide when to retry
- Admin/debug view of failed deliveries (optional, can be Phase F)

**Why it matters:**
- Transient Resend/network failures get retried instead of being lost
- Clear distinction between “will retry” vs “permanently failed”
- Production-grade reliability for a marketplace

**Files that will change:**
- `prisma/schema.prisma` – add `nextRetryAt DateTime?` to `NotificationDelivery` (and maybe `maxAttempts Int @default(5)`)
- New migration
- `lib/notifications/service.ts` or new `lib/notifications/retry.ts` – retry logic when processing a delivery
- Inngest function – on `notification/dispatch`, check for existing FAILED deliveries with `nextRetryAt <= now` and retry; or run a separate `notification/retry-failed` cron
- `lib/notifications/channels/email.ts` – no change; retry is at orchestration level

**Risks:**
- Retry storms if Resend is down
- Need sensible max attempts and backoff to avoid infinite retries

**Now or later:** **After Phase A.** Retries fit naturally into Inngest (step retries + cron for stale failures). Doing retries before async adds complexity to the sync path.

---

### Phase C: Template UX Improvements

**What:**
- Move templates from inline strings to React Email (or similar) components for better DX and preview
- Add template preview route (e.g. `/api/notifications/templates/preview?event=booking.confirmed`)
- Optional: i18n readiness (pass locale to templates; use locale in subject/body)
- Improve layout (responsive tweaks, dark-mode safe, etc.)

**Why it matters:**
- Easier to iterate on email design
- Preview reduces “send and hope” when changing templates
- Professional look builds trust

**Files that will change:**
- New: `lib/notifications/templates/components/` – React Email components
- `lib/notifications/templates/index.ts` – render React Email to HTML string (via `@react-email/render` or `render`)
- `lib/notifications/templates/layout.tsx` – convert to React component
- New: `app/api/notifications/templates/preview/route.ts` – dev-only preview endpoint
- `package.json` – add `@react-email/components` (or chosen lib)

**Risks:**
- React Email adds build complexity; must run in Node (server) context
- Larger template surface area to maintain

**Now or later:** **Later.** Current templates work. This is quality-of-life; do after core reliability (A, B) and user-facing features (preferences UI).

---

### Phase D: Message Batching / Anti-Spam Logic

**What:**
- For `message.received`: instead of sending one email per message, batch messages into a digest (e.g. “You have 3 new messages”) or throttle (max 1 email per conversation per N minutes)
- Add `NotificationDelivery` metadata or a separate table to track “last email sent at” per user/conversation
- Configurable window (e.g. 15 min) – if another message arrives in window, extend window and don’t send yet; when window expires, send one digest

**Why it matters:**
- Prevents email flooding during rapid chat
- Reduces unsubscribes and spam complaints
- Aligns with how Airbnb/Booking.com handle message notifications

**Files that will change:**
- `prisma/schema.prisma` – possibly add `NotificationThrottle` or use `NotificationDelivery.data` to store throttle state
- `lib/notifications/events.ts` – or new `lib/notifications/batching.ts` – batching/throttle rules
- `lib/notifications/service.ts` – for `message.received`, check throttle; either create a “digest” event or defer sending
- Inngest: may need `notification/message-digest` function that runs on a delay and aggregates

**Risks:**
- Complexity: digest content, timing, and edge cases (conversation vs user-level)
- Users might expect immediate email for first message

**Now or later:** **Later.** Most impactful when message volume is high. Do after A + B; can coincide with Phase C or E.

---

### Phase E: Preferences UI

**What:**
- Add a “Notification preferences” section to the profile page (or a dedicated `/profile/notifications` page)
- Toggle switches for each optional event type (e.g. “Email me when someone sends a message”)
- Uses existing `GET /api/notifications/preferences` and `PATCH /api/notifications/preferences`
- Locale strings for labels

**Why it matters:**
- Users can control optional emails; reduces complaints and unsubscribes
- Shows platform maturity
- API already exists; UI is the missing piece

**Files that will change:**
- `app/profile/page.tsx` – add “Notification preferences” section or link to subpage
- New (optional): `app/profile/notifications/page.tsx` – dedicated notifications settings page
- `locales/en.json` (and da.json if exists) – keys for preference labels
- Possibly a shared `NotificationPreferencesForm` component

**Risks:**
- Low. Straightforward form + API integration.

**Now or later:** **Soon.** High user value, low effort. Can be done in parallel with or right after Phase A.

---

### Phase F: Observability & Admin (Optional)

**What:**
- Admin page to view failed deliveries, retry manually, inspect EmailLog
- Structured logging (e.g. Pino) with correlation IDs
- Metrics: delivery success rate, latency

**Why it matters:**
- Debug production issues
- Monitor health of notification pipeline

**Now or later:** **Later.** Do when you have operational pain or before scaling.

---

## 3. Recommended Implementation Order

| Order | Phase | Rationale |
|-------|-------|-----------|
| 1 | **A: Inngest** | Foundation for async, retries, and future scaling. Unblocks B and D. |
| 2 | **E: Preferences UI** | Quick win; API exists. Can be done in parallel with A or right after. |
| 3 | **B: Retries** | Depends on A. Adds reliability with minimal extra code once async is in place. |
| 4 | **D: Batching** | Depends on A (for delayed/digest jobs). Do when message volume justifies it. |
| 5 | **C: Template UX** | Independent. Do when you want to invest in email polish. |
| 6 | **F: Observability** | As needed for operations. |

**Suggested sequence:**
1. **Phase A** (Inngest) – 1–2 days
2. **Phase E** (Preferences UI) – 0.5–1 day
3. **Phase B** (Retries) – 0.5–1 day
4. **Phase D** (Batching) – 1 day (when needed)
5. **Phase C** (Templates) – 1–2 days (when prioritising email quality)
6. **Phase F** (Observability) – as needed

---

## 4. Dependencies Between Phases

```
A (Inngest) ──┬──► B (Retries)     [retries run inside Inngest]
              ├──► D (Batching)    [digest/defer uses Inngest]
              └──► (all future)    [everything flows through queue]

E (Preferences UI)  [independent; uses existing API]
C (Templates)       [independent]
F (Observability)   [enhances A+B]
```
