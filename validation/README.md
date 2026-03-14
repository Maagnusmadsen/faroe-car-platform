# Validation

Shared Zod schemas and validation helpers. Use on the server (API routes) and optionally on the client for form validation.

**Conventions:**
- One file per domain (e.g. `car.ts`, `booking.ts`, `user.ts`).
- Export both the schema and the inferred TypeScript type: `export const carCreateSchema = z.object({...}); export type CarCreateInput = z.infer<typeof carCreateSchema>;`
- Use `validation/parse.ts` (or lib/utils/validate) to parse and throw with safe error messages.
