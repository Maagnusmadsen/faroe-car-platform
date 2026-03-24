/**
 * Retry and failure state logic.
 * Exponential backoff, retryable vs non-retryable classification.
 */

export const MAX_DELIVERY_ATTEMPTS = 5;

/** Backoff in minutes: 2^attemptCount, capped at 60 min. */
export function backoffMinutes(attemptCount: number): number {
  const mins = Math.pow(2, attemptCount);
  return Math.min(mins, 60);
}

export function nextRetryAt(attemptCount: number): Date {
  const mins = backoffMinutes(attemptCount);
  const d = new Date();
  d.setMinutes(d.getMinutes() + mins);
  return d;
}

/**
 * Email failures: 5xx and network/config errors are retryable.
 * 4xx (invalid email, rate limit, auth, etc.) are non-retryable – will not resolve on retry.
 * 429 (rate limit) is retryable with backoff.
 */
export function isRetryableEmail(error: string | undefined, statusCode?: number | null): boolean {
  if (statusCode != null) {
    if (statusCode >= 500) return true;
    if (statusCode === 429) return true; // rate limit – retry with backoff
    if (statusCode >= 400 && statusCode < 500) return false; // 4xx except 429
  }
  const msg = (error ?? "").toLowerCase();
  if (msg.includes("network") || msg.includes("timeout") || msg.includes("econnrefused")) return true;
  if (msg.includes("fetch")) return true;
  return false;
}

/**
 * In-app failures: transient DB errors retryable, validation/constraint non-retryable.
 */
export function isRetryableInApp(error: string | undefined): boolean {
  const msg = (error ?? "").toLowerCase();
  if (msg.includes("unique constraint") || msg.includes("foreign key") || msg.includes("not found"))
    return false;
  if (msg.includes("connection") || msg.includes("timeout") || msg.includes("econnrefused"))
    return true;
  return true;
}
