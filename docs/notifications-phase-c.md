# Phase C: Observability / Admin Visibility

## 1. Recommended Observability Design

**Approach: Admin page + API + SQL reference**

- **Admin page** (`/admin/notifications`): Single-page view with summary cards and tables. Fast to scan, no drill-down required for common scenarios. Uses existing admin layout and auth.
- **API** (`GET /api/admin/notifications/observability`): Powers the page; also usable for scripts, monitoring, or future tooling.
- **SQL reference**: Documented queries for direct DB access when needed (debugging, bulk analysis, one-off reports).

**Why this combination**

- Admin page gives immediate visibility without leaving the app.
- API supports automation and integration.
- SQL lets power users work directly in the DB when necessary.

---

## 2. Files Added / Changed

| File | Change |
|------|--------|
| `lib/notifications/observability.ts` | **New**. Data layer: summary counts, enqueue failures, failed deliveries, pending retries, exhausted retries, recent email failures |
| `app/api/admin/notifications/observability/route.ts` | **New**. GET endpoint, admin-only |
| `app/admin/notifications/page.tsx` | **New**. Admin page with summary and tables |
| `components/admin/AdminSidebar.tsx` | Add "Notifications" nav item |
| `docs/notifications-phase-c.md` | This doc |

---

## 3. Implementation Summary

### 3.1 Data Layer (`lib/notifications/observability.ts`)

- `getNotificationObservabilitySummary()` – counts for enqueue failures, failed deliveries, pending retry, exhausted retries, recent email failures.
- `getEnqueueFailures(limit)` – events with `enqueuedAt = null`.
- `getFailedDeliveries(limit)` – all `status = FAILED`.
- `getPendingRetries(limit)` – FAILED with `nextRetryAt <= now` and `attemptCount < 5`.
- `getExhaustedRetries(limit)` – FAILED with `attemptCount >= 5`.
- `getRecentEmailFailures(limit)` – EmailLog with `status = FAILED` in last 7 days.

### 3.2 API

- `GET /api/admin/notifications/observability` – returns `{ summary, enqueueFailures, failedDeliveries, pendingRetries, exhaustedRetries, recentEmailFailures }`.
- Protected by `requireAdmin`.

### 3.3 Admin Page

- Summary: 5 cards (enqueue failures, failed deliveries, pending retry, exhausted retries, email failures).
- Tables for each category (only when non-empty).
- Reference section describing recovery behavior.

---

## 4. Manual Test Steps

1. **Admin access**
   - Log in as admin.
   - Open `/admin/notifications`.
   - Page loads; summary and tables render.

2. **Healthy state**
   - With no failures, page shows "No notification issues" and zeros.
   - Tables are hidden.

3. **Enqueue failures**
   - Create a `NotificationEvent` with `enqueuedAt = null`, `enqueueError = "test"` (DB or script).
   - Reload page.
   - Summary shows enqueue failures > 0; Enqueue failures table is visible with that event.

4. **Failed deliveries**
   - Trigger a delivery that fails (e.g. mock Resend 500).
   - Reload page.
   - Summary shows failed deliveries; Failed deliveries table lists the delivery.

5. **Pending retries**
   - Create a FAILED delivery with `nextRetryAt <= now`, `attemptCount < 5`.
   - Reload page.
   - Pending retries table lists it.

6. **Exhausted retries**
   - Create a FAILED delivery with `attemptCount >= 5`.
   - Reload page.
   - Exhausted retries table lists it.

7. **API**
   - `curl -H "Cookie: ..." /api/admin/notifications/observability` returns JSON.
   - Non-admin gets 403.

---

## 5. Inspecting Common Failure Scenarios

### Enqueue failures (events not reaching Inngest)

**Admin:** Go to `/admin/notifications` and use the Enqueue failures section.

**SQL:**
```sql
SELECT id, "eventType", "idempotencyKey", "sourceType", "sourceId", "createdAt", "enqueueError"
FROM "NotificationEvent"
WHERE "enqueuedAt" IS NULL
ORDER BY "createdAt" DESC
LIMIT 50;
```

### Failed deliveries (all FAILED)

**Admin:** Use the Failed deliveries section.

**SQL:**
```sql
SELECT d.id, d."eventId", d."userId", d.channel, d.status, d."attemptCount", d."lastAttemptAt", d."lastError", d."nextRetryAt",
       e."eventType", u.email
FROM "NotificationDelivery" d
JOIN "NotificationEvent" e ON e.id = d."eventId"
JOIN "User" u ON u.id = d."userId"
WHERE d.status = 'FAILED'
ORDER BY d."lastAttemptAt" DESC
LIMIT 50;
```

### Pending retries (will be retried by cron)

**Admin:** Use the Pending retries section.

**SQL:**
```sql
SELECT d.id, d."eventId", d."userId", d.channel, d."attemptCount", d."nextRetryAt", e."eventType", u.email
FROM "NotificationDelivery" d
JOIN "NotificationEvent" e ON e.id = d."eventId"
JOIN "User" u ON u.id = d."userId"
WHERE d.status = 'FAILED'
  AND d."nextRetryAt" IS NOT NULL
  AND d."nextRetryAt" <= NOW()
  AND d."attemptCount" < 5
ORDER BY d."nextRetryAt" ASC
LIMIT 50;
```

### Exhausted retries (no automatic retry)

**Admin:** Use the Exhausted retries section.

**SQL:**
```sql
SELECT d.id, d."eventId", d."userId", d.channel, d."attemptCount", d."lastError", d."lastAttemptAt", e."eventType", u.email
FROM "NotificationDelivery" d
JOIN "NotificationEvent" e ON e.id = d."eventId"
JOIN "User" u ON u.id = d."userId"
WHERE d.status = 'FAILED'
  AND d."attemptCount" >= 5
ORDER BY d."lastAttemptAt" DESC
LIMIT 50;
```

### Recent email failures (EmailLog)

**Admin:** Use the Recent email failures section.

**SQL:**
```sql
SELECT id, "deliveryId", "toEmail", subject, status, "statusCode", "createdAt", "rawResponse"
FROM "EmailLog"
WHERE status = 'FAILED'
  AND "createdAt" >= NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC
LIMIT 50;
```
