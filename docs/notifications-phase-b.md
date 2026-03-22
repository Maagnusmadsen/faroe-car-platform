# Phase B: Retry + Failure States

## 1. Design Approach

### Goals
- **Reliability**: Recover from transient failures (network, 5xx, DB timeouts) via retries.
- **Observability**: Clear state for each delivery and event; easy to inspect failed items.
- **Safety**: Idempotency and no duplicate sends; distinguish retryable vs non-retryable failures.

### State Model

**NotificationEvent**
- `enqueuedAt = null` → enqueue to Inngest failed; eligible for enqueue recovery.
- `enqueuedAt` set → event is in Inngest; processing is handled by delivery records.

**NotificationDelivery**
- `PENDING` → not yet sent.
- `SENT` → successfully delivered.
- `SKIPPED` → channel disabled by user or not applicable.
- `FAILED` → delivery failed; `nextRetryAt` and `attemptCount` determine retry eligibility.

**Retry Eligibility**
- `status = FAILED`, `nextRetryAt <= now`, `attemptCount < MAX_DELIVERY_ATTEMPTS` → eligible for retry.

**Retryability**
- **Email**: 5xx, network/timeout → retryable. 4xx (invalid email, rate limit, etc.) → non-retryable.
- **In-app**: Transient DB errors (connection, timeout) → retryable. Constraint/validation errors → non-retryable.

### Exponential Backoff
- Formula: `2^attemptCount` minutes, capped at 60 min.
- Attempt 0 → 1 min, 1 → 2 min, 2 → 4 min, 3 → 8 min, 4 → 16 min, 5+ → 60 min (capped).

### Idempotency
- **Processing**: Before send, check delivery status; skip if SENT or SKIPPED.
- **Email**: Before send, check `EmailLog` for `deliveryId` + `status = SENT`; if found, return success without incrementing `attemptCount`.
- **Inngest**: `notification/dispatch` event is keyed by `eventId`; processNotificationEvent is idempotent per delivery.

### Recovery Jobs (Cron)
- **Enqueue recovery**: Events with `enqueuedAt = null`, created 1+ min ago, within 7 days → retry `inngest.send()`.
- **Delivery retry**: Deliveries with `status = FAILED`, `nextRetryAt <= now`, `attemptCount < 5` → call `retryDelivery()`.

---

## 2. Schema / Data Model Changes

### Migration: `20260322074406_add_notification_delivery_next_retry_at`

**NotificationDelivery** (new fields only):

| Field        | Type      | Description                                                                 |
|--------------|-----------|-----------------------------------------------------------------------------|
| `nextRetryAt`| `DateTime?` | When to retry; `null` = non-retryable or max attempts reached. Indexed.   |

**Existing fields used for retry logic:**
- `attemptCount` – incremented on each attempt; capped at 5.
- `lastAttemptAt` – timestamp of last attempt.
- `lastError` – last error message for inspection.

**NotificationEvent** (unchanged in Phase B, already has):
- `enqueuedAt` – `null` when enqueue failed.
- `enqueueError` – error message when enqueue failed.

---

## 3. Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | `NotificationDelivery.nextRetryAt DateTime?` added (and index) |
| `prisma/migrations/20260322074406_add_notification_delivery_next_retry_at/migration.sql` | Migration for `nextRetryAt` |
| `lib/notifications/retry.ts` | **New**. MAX_DELIVERY_ATTEMPTS, backoffMinutes, nextRetryAt, isRetryableEmail, isRetryableInApp |
| `lib/notifications/processor.ts` | Failure handling: set nextRetryAt, retryable checks; retryDelivery(); fix email catch to use isRetryableEmail |
| `lib/notifications/recovery.ts` | **New**. recoverFailedEnqueues(), retryFailedDeliveries() |
| `lib/notifications/channels/email.ts` | Idempotency: check EmailLog SENT before send; add reconciled, statusCode to result |
| `lib/inngest/functions/notifications.ts` | notificationRecoveryFn cron every 5 min |
| `app/api/inngest/route.ts` | Register notificationRecoveryFn |

---

## 4. Implementation

### 4.1 Retry Logic (`lib/notifications/retry.ts`)

```ts
export const MAX_DELIVERY_ATTEMPTS = 5;

export function backoffMinutes(attemptCount: number): number {
  const mins = Math.pow(2, attemptCount);
  return Math.min(mins, 60);
}

export function nextRetryAt(attemptCount: number): Date { ... }

export function isRetryableEmail(error: string | undefined, statusCode?: number | null): boolean {
  if (statusCode >= 500) return true;
  if (statusCode >= 400 && statusCode < 500) return false;
  // Message-based: network, timeout, Resend not configured → retryable
}

export function isRetryableInApp(error: string | undefined): boolean {
  // unique constraint, foreign key, not found → non-retryable
  // connection, timeout → retryable
}
```

### 4.2 Processor (`lib/notifications/processor.ts`)

- **deliverInApp**: On failure, set `status=FAILED`, `lastError`, `nextRetryAt` if retryable.
- **deliverEmail**: On failure (from sendEmailNotification or catch), set same; use `isRetryableEmail` for both paths.
- **retryDelivery(deliveryId)**: Fetch delivery, user; call deliverInApp/deliverEmail. Idempotent via existing SENT/SKIPPED checks.

### 4.3 Email Channel (`lib/notifications/channels/email.ts`)

- Before send: `prisma.emailLog.findFirst({ where: { deliveryId, status: "SENT" } })`.
- If found → return `{ success: true, reconciled: true }`; processor does not increment attemptCount.
- Always create EmailLog row (SENT or FAILED) for audit; idempotency prevents duplicate sends.

### 4.4 Recovery (`lib/notifications/recovery.ts`)

- **recoverFailedEnqueues()**: `NotificationEvent` where `enqueuedAt = null`, `createdAt` 1+ min ago, within 7 days. Up to 50 per run. Retry `inngest.send()`.
- **retryFailedDeliveries()**: `NotificationDelivery` where `status=FAILED`, `nextRetryAt <= now`, `attemptCount < 5`. Up to 50 per run. Call `retryDelivery()`.

### 4.5 Inngest

- `notificationRecoveryFn`: Cron `*/5 * * * *` (every 5 min). Runs both recovery jobs in parallel.

---

## 5. Manual End-to-End Test Steps

### 5.1 Enqueue Recovery

1. **Setup**: Create a `NotificationEvent` with `enqueuedAt = null` and `enqueueError = "some error"` (e.g. via DB or a test script that skips inngest.send).
2. **Wait** 1+ minute (or temporarily lower `ENQUEUE_RECOVERY_AGE_MS`).
3. **Trigger**: Wait for cron (5 min) or manually invoke `notificationRecoveryFn` in Inngest dev UI.
4. **Verify**: Event has `enqueuedAt` set, `enqueueError` null; `notification/dispatch` appears in Inngest; event is processed.

### 5.2 Retryable Email Failure (e.g. temporary Resend outage)

1. **Setup**: Disable Resend (e.g. invalid API key or mock returning 503) so email send fails with 5xx or network error.
2. **Trigger**: Create a real notification event (e.g. send a message) that triggers email delivery.
3. **Verify**:
   - `NotificationDelivery` for EMAIL has `status=FAILED`, `nextRetryAt` set, `attemptCount=1`, `lastError` populated.
   - Restore Resend; wait until `nextRetryAt` has passed.
   - Run recovery cron (or wait 5 min).
   - Delivery retries; `status` becomes `SENT`, `nextRetryAt` null.

### 5.3 Non-Retryable Email Failure (4xx)

1. **Setup**: Use invalid/blacklisted email or mock Resend to return 400/404.
2. **Trigger**: Same as above.
3. **Verify**: `NotificationDelivery` has `status=FAILED`, `nextRetryAt=null`, `lastError` with 4xx context. Recovery does not retry (nextRetryAt null).

### 5.4 Idempotency: No Duplicate Email

1. **Setup**: Before processor runs, manually create `EmailLog` with `deliveryId`, `status=SENT` for a pending delivery.
2. **Trigger**: Process the same event (or retry the delivery).
3. **Verify**: Processor finds existing SENT in EmailLog; returns success without calling Resend; `attemptCount` not incremented (reconciled path); no duplicate email sent.

### 5.5 Exhausted Retries

1. **Setup**: Keep Resend failing; let delivery fail 5 times (or manually set `attemptCount=5`, `nextRetryAt` in past).
2. **Trigger**: Run recovery.
3. **Verify**: `retryFailedDeliveries` skips delivery (`attemptCount >= MAX_DELIVERY_ATTEMPTS`); delivery stays `FAILED`, `nextRetryAt` can stay set (no update) — inspect failed deliveries via `status=FAILED` and `attemptCount=5`.

### 5.6 Inspect Failed Events / Deliveries

```sql
-- Events that failed to enqueue
SELECT id, eventType, createdAt, enqueueError
FROM "NotificationEvent"
WHERE enqueuedAt IS NULL;

-- Failed deliveries eligible for retry
SELECT id, "eventId", "userId", channel, "attemptCount", "lastError", "nextRetryAt"
FROM "NotificationDelivery"
WHERE status = 'FAILED' AND "nextRetryAt" IS NOT NULL;

-- Exhausted deliveries (no more retries)
SELECT id, "eventId", "userId", channel, "attemptCount", "lastError"
FROM "NotificationDelivery"
WHERE status = 'FAILED' AND "attemptCount" >= 5;
```

---

## Summary

Phase B adds retry and failure handling without UI changes. Enqueue and delivery recovery run every 5 minutes. Failed events and deliveries can be inspected via DB queries; idempotency and retryability rules avoid duplicate sends and unnecessary retries.
