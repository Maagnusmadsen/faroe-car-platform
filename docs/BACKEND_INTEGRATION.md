# Backend Integration Strategy

This document describes how the existing frontend integrates with the backend (API routes and services) as each step is implemented. **No UI redesign**; we only replace data sources and add new pages where needed.

---

## 1. API surface

- **Base URL:** Same origin in production (`/api`). Optional `NEXT_PUBLIC_API_URL` for a separate API host.
- **Convention:** Next.js App Router Route Handlers under `app/api/.../route.ts`.
- **Response shape:** All JSON. Success: `{ data: T }`. Error: `{ error: string, code?: string, details?: unknown }`.
- **Helpers:** Use `lib/utils/api-response.ts` (jsonSuccess, jsonError, handleApiError) and `lib/utils/errors.ts` (AppError, badRequest, notFound, etc.) in every route.

---

## 2. Frontend → API

- **Client:** Use `lib/api/client.ts`: `apiGet`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete`. Base URL comes from `config/env.ts` (`getApiBaseUrl()`).
- **Auth (Step A2):** Add session (e.g. NextAuth). In `apiRequest`, attach `Authorization: Bearer <token>` or send cookies. Auth helpers live in `auth/guards.ts`; use `requireAuth()` in route handlers that need a logged-in user.
- **Typing:** Request/response types in `types/api.ts` and `types/index.ts`. Keep in sync with validation schemas in `validation/schemas/`.

---

## 3. Route handler pattern

```ts
// app/api/cars/route.ts (example, Step B4)
import { NextRequest } from "next/server";
import { jsonSuccess, handleApiError } from "@/lib/utils/api-response";
import { parseOrThrow } from "@/lib/utils/validate";
import { carCreateSchema } from "@/validation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = parseOrThrow(carsQuerySchema, Object.fromEntries(searchParams));
    // const cars = await carService.list(query);
    return jsonSuccess([]);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    // const session = await requireAuth();
    const body = await request.json();
    const input = parseOrThrow(carCreateSchema, body);
    // const car = await carService.create(session.user.id, input);
    return jsonSuccess({ id: "placeholder" }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
```

- **Validation:** Always use Zod via `parseOrThrow` (or `parseQueryOrThrow` for query). Schemas in `validation/schemas/`.
- **Errors:** Let AppError (and Zod validation errors converted via parseOrThrow) bubble; catch in handler and return `handleApiError(err)`.

---

## 4. Per-page integration (when each step is done)

| Page / flow        | Current data source     | After backend step | Change |
|--------------------|-------------------------|--------------------|--------|
| `/rent-a-car`      | `getAllCars()` (lib)    | `GET /api/cars`    | Replace useState/useEffect that calls getAllCars with apiGet("/api/cars", params). Keep FilterBar, CarGrid, map unchanged. |
| `/rent-a-car/[id]` | `getCarById(id)` (lib)  | `GET /api/cars/[id]` | Fetch in useEffect with apiGet(`/api/cars/${id}`). Keep CarDetailContent unchanged. |
| List-your-car wizard | `addListing()` (localStorage) | `POST /api/cars` + upload images | On publish: upload images (POST /api/upload or presigned), then POST /api/cars with image URLs. Redirect to car detail or dashboard. |
| Auth               | None                    | NextAuth + session | Add /login, /signup; Navbar shows Profile/Logout when session exists. Protect /list-your-car and dashboard. |

---

## 5. Services and DB

- **Services:** All business logic in `services/` (e.g. car.service.ts, booking.service.ts). Route handlers only: parse input, call service, return response.
- **DB:** Used only inside services (or inside route handlers via a single DB entrypoint from `db/`). Never expose raw DB in API response; map to API types.

---

## 6. File layout summary

- `app/api/` – Route Handlers only; thin layer.
- `services/` – Business logic; call DB and external APIs.
- `db/` – Connection and schema; used by services.
- `lib/api/` – Frontend API client and response types.
- `lib/utils/` – Errors, api-response, validate, price, dates.
- `validation/` – Zod schemas for request bodies and query.
- `auth/` – getSession, requireAuth, requireRole (used in API routes).
- `types/` – Shared and API types.
- `config/` – Env and app config.

This keeps the existing UI intact and makes it clear where to plug in each backend step.
