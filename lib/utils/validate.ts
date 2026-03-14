/**
 * Request validation helpers using Zod.
 * Use in API route handlers to parse and validate body/query; throws on failure.
 */

import { z } from "zod";
import { unprocessable } from "./errors";

/**
 * Parse input with Zod schema. On success returns typed data.
 * On failure throws AppError (422) with message and optional details (e.g. field errors).
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }
  const first = result.error.errors[0];
  const message = first ? `${first.path.join(".")}: ${first.message}` : "Validation failed";
  const details = result.error.flatten();
  throw unprocessable(message, details);
}

/**
 * Parse query params (all values are strings). Use with schemas that use z.coerce for numbers.
 */
export function parseQueryOrThrow<T>(schema: z.ZodType<T>, query: Record<string, string | string[] | undefined>): T {
  const single: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    single[k] = Array.isArray(v) ? v[0] ?? "" : v ?? "";
  }
  return parseOrThrow(schema, single);
}
