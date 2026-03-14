/**
 * Standard API response helpers for Route Handlers.
 * Use with NextResponse so all API routes return consistent JSON shapes.
 */

import { NextResponse } from "next/server";
import { AppError, HttpStatus, toAppError } from "./errors";

/** Success payload – generic data */
export interface ApiSuccess<T = unknown> {
  data: T;
  meta?: { page?: number; pageSize?: number; total?: number };
}

/** Error payload – matches types/ApiErrorBody */
export interface ApiErrorPayload {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Return 200 JSON with { data }.
 */
export function jsonSuccess<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data }, { status: 200, ...init });
}

/**
 * Return 201 Created with { data }.
 */
export function jsonCreated<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data }, { status: 201, ...init });
}

/**
 * Return error response from AppError or status + message.
 */
export function jsonError(
  error: AppError | string,
  statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR
): NextResponse<ApiErrorPayload> {
  const err = typeof error === "string" ? new AppError(error, statusCode) : error;
  return NextResponse.json(err.toJSON(), { status: err.statusCode });
}

/**
 * Catch unknown error, convert to AppError, return JSON response.
 * Use in route handler: return handleApiError(err);
 */
export function handleApiError(err: unknown): NextResponse<ApiErrorPayload> {
  const appErr = toAppError(err);
  return NextResponse.json(appErr.toJSON(), { status: appErr.statusCode });
}
