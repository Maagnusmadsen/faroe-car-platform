# Auth

Authentication and authorization utilities. Used by API route handlers and (optionally) middleware.

**When to add here (Step A2):**
- Session handling (NextAuth getServerSession or custom).
- `guards.ts` – requireAuth(), requireRole(), getSession() that throw or return null.
- Optional: middleware.ts at project root to protect routes.

Until Step A2, guards are stubs; they do not perform real auth checks.
