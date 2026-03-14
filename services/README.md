# Services

Server-side business logic layer. Services are used by API route handlers and should be independent of HTTP/request details.

**When to add here (later steps):**
- `car.service.ts` – listing CRUD, availability
- `booking.service.ts` – create booking, pricing, availability checks
- `user.service.ts` – profile, preferences
- `auth.service.ts` – session, token refresh (or use NextAuth)
- `payment.service.ts` – Stripe payment intents, payouts
- `message.service.ts` – threads, send message
- `review.service.ts` – create review, aggregate ratings
- `notification.service.ts` – create, list, mark read

Do not implement business logic in API handlers; keep it in services for testability and reuse.
