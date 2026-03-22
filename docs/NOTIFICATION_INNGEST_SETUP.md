# Notification System – Inngest Setup (Phase A)

## 1. Implementation Approach

### Summary
`dispatchNotificationEvent` remains the public entrypoint. It now:
1. Performs idempotency check (existing event → return early)
2. Creates `NotificationEvent` in DB
3. Sends `notification/dispatch` event to Inngest (non-blocking from caller's perspective)
4. On success: updates event with `enqueuedAt`
5. On failure: logs error, updates event with `enqueueError`, returns (no sync fallback)
6. Returns immediately with `{ eventId, alreadyExisted }`

Actual delivery (recipient resolution, in-app, email) runs in an Inngest background function. Callers no longer wait for Resend or delivery logic. Events with failed enqueue (`enqueuedAt` null, `enqueueError` set) can be recovered by a future retry mechanism.

### Idempotency
- **Event creation:** Idempotency key prevents duplicate events
- **Delivery processing:** Each delivery checks if status is already SENT or SKIPPED; skips if so. Safe for Inngest retries.

### Enqueue failure
If `inngest.send()` throws, we log the error and update the event with `enqueueError`. No sync fallback. The event remains in DB for later recovery (e.g. a cron job that retries enqueue for events with `enqueuedAt` null).

---

## 2. Files Changed

| File | Change |
|------|--------|
| `package.json` | Added `inngest` dependency |
| `lib/inngest/client.ts` | **New** – Inngest client |
| `lib/inngest/functions/notifications.ts` | **New** – Inngest function for `notification/dispatch` |
| `app/api/inngest/route.ts` | **New** – Inngest serve handler (GET, POST, PUT) |
| `lib/notifications/processor.ts` | **New** – Extracted `processNotificationEvent` (delivery logic) |
| `lib/notifications/service.ts` | **Refactored** – Creates event, sends to Inngest, marks event on failure |
| `prisma/schema.prisma` | Added `enqueuedAt`, `enqueueError` to `NotificationEvent` |

---

## 3. Code Changes

### `lib/notifications/service.ts`
- Removed all delivery logic (enrichPayload, resolveRecipients, deliverInApp, deliverEmail)
- Now: idempotency check → create event → `inngest.send({ name: "notification/dispatch", data: { eventId } })` → on success update `enqueuedAt`, on failure update `enqueueError` and log → return
- No sync fallback; events with failed enqueue are marked for later recovery

### `lib/notifications/processor.ts` (new)
- Contains `processNotificationEvent(eventId)`
- Same logic as previous service: enrich, resolve recipients, for each recipient/channel deliver
- **Idempotency:** `deliverInApp` and `deliverEmail` skip if delivery status is already SENT or SKIPPED

### `lib/inngest/functions/notifications.ts` (new)
- Inngest function triggered by `notification/dispatch`
- Calls `processNotificationEvent(event.data.eventId)`
- `retries: 3` (Inngest default retry behavior)

---

## 4. Setup Steps

### Local development

1. **Install dependencies** (already done):
   ```bash
   npm install inngest --legacy-peer-deps
   ```

2. **Start Inngest Dev Server** (in a separate terminal):
   ```bash
   npx --ignore-scripts=false inngest-cli@latest dev
   ```
   - UI at http://localhost:8288
   - Auto-discovers app at your Next.js URL (default http://localhost:3000)

3. **Start Next.js**:
   ```bash
   npm run dev
   ```

4. **No env vars required for local dev** – Inngest Dev Server works without keys.

### Production (Vercel)

1. **Sign up at [inngest.com](https://www.inngest.com)**

2. **Create an app** and get:
   - **Event Key** (for sending events)
   - **Signing Key** (for verifying webhook requests)

3. **Add environment variables** in Vercel:
   - `INNGEST_EVENT_KEY` – event key (optional for some plans)
   - `INNGEST_SIGNING_KEY` – signing key (for production webhook verification)

4. **Configure the Inngest dashboard** with your production URL (e.g. `https://your-app.vercel.app`).

5. **Deploy** – Inngest will discover your functions at `/api/inngest`.

---

## 5. End-to-End Test Instructions

### Prerequisites
- Next.js dev server running (`npm run dev`)
- Inngest Dev Server running (`npx --ignore-scripts=false inngest-cli@latest dev`)
- Database with at least one user
- Resend API key configured (optional – in-app works without it)

### Test 1: Event emission and Inngest receive

1. Open Inngest Dev Server UI: http://localhost:8288

2. Trigger an event that emits a notification (e.g. create a booking, send a message, or use a minimal test):
   - **Option A:** Create a booking (requires full flow)
   - **Option B:** Sign up a new user (triggers `user.welcome`)
   - **Option C:** Add a test API route that calls `dispatchNotificationEvent`:

   ```ts
   // app/api/test-notification/route.ts (temporary)
   import { dispatchNotificationEvent } from "@/lib/notifications";

   export const dynamic = "force-dynamic";

   export async function GET() {
     const { eventId, alreadyExisted } = await dispatchNotificationEvent({
       type: "user.welcome",
       idempotencyKey: `test-${Date.now()}`,
       payload: { userId: "<YOUR_USER_ID>" },
       sourceId: "<YOUR_USER_ID>",
       sourceType: "user",
     });
     return Response.json({ eventId, alreadyExisted });
   }
   ```

3. Call the trigger (e.g. `GET http://localhost:3000/api/test-notification`).

4. In Inngest UI → **Runs**: you should see a run for `notification-process-event` with status Completed.

5. In your app: check that the user received an in-app notification (or email if Resend is configured).

### Test 2: Idempotency

1. Call the same trigger twice with the **same** idempotency key.
2. Second call should return `alreadyExisted: true` and **not** create a new Inngest event.
3. Inngest Runs: only one run for that event.

### Test 3: Enqueue failure when Inngest unavailable

1. **Stop** the Inngest Dev Server.
2. Trigger a notification (e.g. sign up, or call test API).
3. Check logs: you should see `"Inngest send failed; event marked for recovery"`.
4. Event should remain in DB with `enqueuedAt` null and `enqueueError` set.
5. Notification will not be delivered until recovery (future phase).
6. Restart Inngest Dev Server.

### Test 4: Inngest function retry (optional)

1. Temporarily break Resend (e.g. invalid API key) or add a throw in `processNotificationEvent`.
2. Trigger a notification.
3. In Inngest Runs: function should show retries (up to 3).
4. Restore working state.

---

## 6. Verification Checklist

- [ ] `dispatchNotificationEvent` returns quickly (no wait for Resend)
- [ ] Inngest Dev Server shows `notification-process-event` function
- [ ] Triggering a real flow (e.g. signup) creates an Inngest run
- [ ] In-app notifications appear for the user
- [ ] Emails are sent (if Resend configured)
- [ ] Duplicate idempotency key returns `alreadyExisted: true` and does not duplicate deliveries
- [ ] With Inngest stopped, event is created and marked with enqueueError; no delivery until recovery
