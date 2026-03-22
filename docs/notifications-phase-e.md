# Phase E: Notification Preferences UI

## 1. Recommended UI Structure

- **Location**: `/profile/notifications` – dedicated page under profile
- **Entry point**: Link from profile page ("Notification preferences")
- **Layout**: Card with header (title, subtitle), list of preferences grouped by event type, Save button, back link
- **Each row**: Event label + toggle(s) for Email and/or In-app (per event’s channels)
- **States**: Loading, error (retry), empty (should not occur), success/error after save

**Design alignment**: Mirrors profile page: rounded card, Navbar/Footer, similar typography and spacing.

---

## 2. Files Added / Changed

| File | Change |
|------|--------|
| `app/api/notifications/preferences/route.ts` | Return all optional (eventType, channel) pairs; validate PATCH against allowed pairs |
| `app/profile/notifications/page.tsx` | **New**. Preferences UI with toggles |
| `app/profile/page.tsx` | Link to notification preferences |
| `locales/en.json` | `notificationPrefs.*` and `profile.notificationPreferences` |
| `docs/notifications-phase-e.md` | This doc |

---

## 3. Implementation Summary

### 3.1 API

- **GET**: Returns `preferences: [{ eventType, channel, enabled }]` for all optional (eventType, channel) pairs
- **PATCH**: Accepts `preferences: [{ eventType, channel, enabled }]`; only optional pairs are accepted
- **Optional pairs**: booking.requested (EMAIL, IN_APP), booking.reminder (EMAIL, IN_APP), message.received (EMAIL, IN_APP), review.requested (EMAIL, IN_APP), listing.published (IN_APP), trip.started (IN_APP), trip.ended (IN_APP)

### 3.2 UI

- Toggle (switch) per preference; grouped by event type
- Save persists changes via PATCH
- Success/error messages after save
- Loading and error (retry) states

---

## 4. Manual Test Steps

1. **Access**
   - Log in → Profile → Notification preferences
   - URL: `/profile/notifications`

2. **Loading**
   - Page shows loading state while fetching

3. **Display**
   - List of notification types with toggles
   - Events with both channels: two toggles (Email, In-app)
   - Events with one channel: single toggle

4. **Toggle**
   - Turn off "New booking requests" Email → Save
   - Reload → toggle remains off
   - Turn on again → Save → reload → toggle is on

5. **Error**
   - Disconnect network → Save → error message
   - Retry (for load error) or fix network → Save → success

6. **Auth**
   - Log out → visit `/profile/notifications` → redirect or 401

---

## 5. Preferences Exposed vs Not Exposed

### Exposed (optional, userCanDisable)

| Event type       | Channels  | Reason |
|------------------|-----------|--------|
| booking.requested | EMAIL, IN_APP | Incoming requests; user may prefer in-app only |
| booking.reminder  | EMAIL, IN_APP | Trip reminders; optional reminder |
| message.received  | EMAIL, IN_APP | New messages; user may limit email noise |
| review.requested  | EMAIL, IN_APP | Review prompts; engagement, not critical |
| listing.published | IN_APP   | Listing goes live; informational |
| trip.started      | IN_APP   | Trip start; informational |
| trip.ended        | IN_APP   | Trip end; informational |

### Not exposed (critical, userCanDisable: false)

| Event type        | Reason |
|-------------------|--------|
| booking.approved  | Renter must pay; must be notified |
| booking.rejected  | Renter must know outcome |
| booking.confirmed | Confirmation is essential |
| booking.cancelled | User must be informed of cancellation |
| payment.received  | Owner must know payment arrived |
| payment.receipt   | Renter must have payment confirmation |
| payout.sent       | Owner must know payout was sent |
| payout.failed     | Owner must fix bank details |
| renter.approved   | Security-related approval |
| user.welcome      | System-controlled; not user preference |
