# Phase B Hardening: Concurrency and Email Retry Fixes

## 1. Fix Strategy

### Issue 1: In-app concurrency / duplicate creation risk

**Strategy**: Make Notification creation idempotent per delivery using a unique constraint and upsert.

- Add `@unique` to `Notification.deliveryId` so at most one Notification exists per delivery.
- In `createInAppNotification`, when `deliveryId` is provided, use `prisma.notification.upsert` instead of `create`:
  - `where: { deliveryId }` — match existing row
  - `create` — insert when no row exists
  - `update: {}` — no-op when row exists; return existing id
- Concurrent workers both calling upsert with the same `deliveryId` will see at most one create; the other gets the existing row. No duplicate Notifications.

### Issue 2: Email retry bug with EmailLog unique constraint

**Strategy**: Update existing EmailLog on retry instead of creating a new row.

- Before sending, `findUnique` by `deliveryId` (replacing `findFirst`).
- If `existingLog?.status === "SENT"` → return success reconciled (idempotency).
- If `existingLog` exists with FAILED → proceed to send, then **update** the row.
- If no `existingLog` → send, then **create** the row.
- Retries update the same EmailLog row instead of creating, so the unique constraint is never violated.

---

## 2. Schema Changes

| Change | File |
|--------|------|
| `Notification.deliveryId` — add `@unique` | `prisma/schema.prisma` |
| Migration: `CREATE UNIQUE INDEX "Notification_deliveryId_key"` | `prisma/migrations/20260323120000_add_notification_delivery_id_unique/migration.sql` |

**Note**: Multiple rows with `deliveryId = null` remain allowed (standard SQL behavior for unique constraints).

---

## 3. Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | `Notification.deliveryId String? @unique` |
| `prisma/migrations/20260323120000_add_notification_delivery_id_unique/migration.sql` | New migration |
| `lib/notifications/channels/in-app.ts` | Use `upsert` when `deliveryId` is set |
| `lib/notifications/channels/email.ts` | Check existing log, then update or create EmailLog |
| `lib/inngest/functions/notifications.ts` | `concurrency: { limit: 1 }` on recovery function |

---

## 4. Implementation Summary

### In-app (`lib/notifications/channels/in-app.ts`)

```ts
if (input.deliveryId) {
  const notification = await prisma.notification.upsert({
    where: { deliveryId: input.deliveryId },
    create: data,
    update: {},
  });
  return notification.id;
}
const notification = await prisma.notification.create({ data });
return notification.id;
```

### Email (`lib/notifications/channels/email.ts`)

- Use `findUnique({ where: { deliveryId } })` to load any existing EmailLog.
- If status SENT → return reconciled success.
- After send: if `existingLog` exists → `update`; else → `create`.

### Inngest

- `notificationRecoveryFn`: `concurrency: { limit: 1 }` so only one recovery run executes at a time.

---

## 5. Manual Test Steps

### 5.1 In-app: Idempotency under concurrent retries

1. Apply migration: `npx prisma migrate deploy`
2. Create a FAILED in-app delivery (e.g. temporarily break DB or mock `createInAppNotification` to throw once, then succeed).
3. Trigger two concurrent retries (e.g. call `retryDelivery(deliveryId)` from two workers/processes, or run recovery twice quickly).
4. **Verify**:
   - Only one `Notification` row exists for that `deliveryId`.
   - `NotificationDelivery` is `SENT` with correct `notificationId`.

### 5.2 In-app: Unique constraint enforced

1. Attempt to create two Notifications with the same `deliveryId`:
   ```sql
   INSERT INTO "Notification" (id, "userId", type, title, "deliveryId", "createdAt")
   VALUES ('c1', '<user-id>', 'MESSAGE', 'Test', '<delivery-id>', NOW());
   INSERT INTO "Notification" (id, "userId", type, title, "deliveryId", "createdAt")
   VALUES ('c2', '<user-id>', 'MESSAGE', 'Test', '<delivery-id>', NOW());
   ```
2. **Verify**: Second insert fails with unique constraint violation.

### 5.3 Email: Retry after failure does not hit unique constraint

1. Cause a retryable email failure (e.g. temporarily invalid Resend API key or mock 503).
2. Trigger a notification that sends email; confirm first attempt fails and creates `EmailLog` with `status = FAILED`.
3. Fix Resend; wait for `nextRetryAt`; run recovery (or wait for cron).
4. **Verify**:
   - No unique constraint error on `EmailLog`.
   - `EmailLog` row is updated (not duplicated); `status` becomes `SENT`.
   - `NotificationDelivery` becomes `SENT`.

### 5.4 Email: Idempotency (no duplicate sends)

1. Before processing, create `EmailLog` with `deliveryId`, `status = "SENT"` for a pending delivery.
2. Trigger processing (or retry) for that delivery.
3. **Verify**:
   - `sendEmailNotification` returns success with `reconciled: true`.
   - Resend is not called (no new API request).
   - `NotificationDelivery` becomes `SENT` without incrementing `attemptCount`.

### 5.5 Recovery concurrency

1. Manually trigger `notificationRecoveryFn` twice in quick succession (e.g. via Inngest dev UI).
2. **Verify**: With `concurrency: { limit: 1 }`, the second run is queued until the first completes (or behaves per Inngest’s concurrency semantics).
