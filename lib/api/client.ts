/**
 * Base API client for frontend → backend requests.
 * Use this instead of raw fetch so we have a single place for base URL, headers, and error handling.
 * Does not implement auth yet; add Authorization header when Step A2 is done.
 */

import { getApiBaseUrl } from "@/config/env";

export type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiClientOptions extends Omit<RequestInit, "method" | "body"> {
  method?: RequestMethod;
  /** Optional body; will be JSON.stringify'd if object. */
  body?: unknown;
  /** Query params appended to url */
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Get the base URL for API requests. In browser uses same origin or NEXT_PUBLIC_API_URL.
 */
export function getApiUrl(): string {
  return getApiBaseUrl();
}

/**
 * Build full URL with optional query params.
 */
function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const base = getApiUrl().replace(/\/$/, "");
  const pathStr = path.startsWith("/") ? path : `/${path}`;
  let url = `${base}${pathStr}`;
  if (params && Object.keys(params).length > 0) {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") {
        search.set(k, String(v));
      }
    }
    const q = search.toString();
    if (q) url += `?${q}`;
  }
  return url;
}

/**
 * Low-level request: builds URL, sets JSON headers, handles body.
 * Does not parse response; use apiGet, apiPost, etc. or parse in caller.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: ApiClientOptions = {}
): Promise<{ data: T; response: Response }> {
  const { method = "GET", body, params, headers: customHeaders, ...rest } = options;
  const url = buildUrl(path, params as Record<string, string | number | boolean | undefined>);
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...customHeaders,
  };
  const init: RequestInit = {
    method,
    headers,
    ...rest,
  };
  if (body !== undefined && method !== "GET") {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const response = await fetch(url, init);
  const text = await response.text();
  let data: T;
  try {
    data = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    data = text as unknown as T;
  }
  if (!response.ok) {
    const err = new Error((data as { error?: string })?.error ?? response.statusText) as Error & {
      statusCode: number;
      response: Response;
      data: T;
    };
    err.statusCode = response.status;
    err.response = response;
    err.data = data;
    throw err;
  }
  return { data, response };
}

/** GET and return .data */
export async function apiGet<T>(path: string, params?: ApiClientOptions["params"]): Promise<T> {
  const { data } = await apiRequest<{ data: T }>(path, { method: "GET", params });
  return (data as { data?: T }).data ?? (data as T);
}

/** POST and return .data */
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await apiRequest<{ data: T }>(path, { method: "POST", body });
  return (data as { data?: T }).data ?? (data as T);
}

/** PUT and return .data */
export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await apiRequest<{ data: T }>(path, { method: "PUT", body });
  return (data as { data?: T }).data ?? (data as T);
}

/** PATCH and return .data */
export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await apiRequest<{ data: T }>(path, { method: "PATCH", body });
  return (data as { data?: T }).data ?? (data as T);
}

/** DELETE */
export async function apiDelete(path: string): Promise<void> {
  await apiRequest(path, { method: "DELETE" });
}
