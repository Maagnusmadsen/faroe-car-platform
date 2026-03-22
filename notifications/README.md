# Notifications

Event-driven notification system with in-app and email delivery.

**Implementation:** `lib/notifications/` – see `docs/NOTIFICATION_SYSTEM_DESIGN.md`.

- **Dispatch:** `dispatchNotificationEvent({ type, idempotencyKey, payload })`
- **Channels:** In-app (Notification table), Email (Resend)
- **API:** `GET /api/notifications`, `PATCH /api/notifications` (list, mark read)
