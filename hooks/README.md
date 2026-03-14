# Hooks

Shared React hooks for data fetching, auth, and UI state. Prefer hooks over ad-hoc logic in components.

**When to add here:**
- `useApi.ts` – generic API fetch with loading/error (wraps lib/api client).
- `useAuth.ts` – session, user, login/logout (wraps NextAuth or auth context).
- `useCars.ts` – fetch cars list with search params (Step C6).
- `useCar.ts` – fetch single car by id.
- `useBooking.ts` / `useMyBookings.ts` – booking data for dashboards.

Keep hooks thin; put business logic in services and call from API routes.
