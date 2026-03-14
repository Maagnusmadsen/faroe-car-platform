/**
 * API response type helpers for the client.
 * Matches the shapes returned by lib/utils/api-response (success/error).
 */

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: { page?: number; pageSize?: number; total?: number };
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/** Type guard: response has .data */
export function isSuccessResponse<T>(r: ApiSuccessResponse<T> | ApiErrorResponse): r is ApiSuccessResponse<T> {
  return "data" in r && r.data !== undefined;
}
