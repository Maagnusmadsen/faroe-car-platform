/**
 * Notification system – public API.
 *
 * Usage: dispatchNotificationEvent({ type, idempotencyKey, payload })
 *
 * Business logic should call dispatchNotificationEvent instead of
 * directly creating notifications or sending emails.
 */

export { dispatchNotificationEvent } from "./service";
export type { DispatchNotificationEventInput, EventType, NotificationEventPayload } from "./types";
