/**
 * Application and API error types and helpers.
 * Use in services and API routes for consistent error handling.
 */

/** HTTP status codes we use */
export const HttpStatus = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Structured app error for API responses.
 * Throw this in services or route handlers; catch in error handler and send JSON.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      error: this.message,
      ...(this.code && { code: this.code }),
      ...(this.details !== undefined && { details: this.details }),
    };
  }
}

/** 400 Bad Request – invalid input */
export function badRequest(message: string, details?: unknown): AppError {
  return new AppError(message, HttpStatus.BAD_REQUEST, "BAD_REQUEST", details);
}

/** 401 Unauthorized – not logged in */
export function unauthorized(message = "Unauthorized"): AppError {
  return new AppError(message, HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
}

/** 403 Forbidden – no permission */
export function forbidden(message = "Forbidden"): AppError {
  return new AppError(message, HttpStatus.FORBIDDEN, "FORBIDDEN");
}

/** 404 Not Found */
export function notFound(message = "Not found"): AppError {
  return new AppError(message, HttpStatus.NOT_FOUND, "NOT_FOUND");
}

/** 422 Unprocessable Entity – validation failed */
export function unprocessable(message: string, details?: unknown): AppError {
  return new AppError(message, HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", details);
}

/**
 * Normalize unknown errors to AppError for API response.
 * Use in catch blocks: throw toAppError(err);
 */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Error) {
    const status = (err as Error & { statusCode?: number }).statusCode;
    if (typeof status === "number") {
      return new AppError(err.message, status);
    }
    return new AppError(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
  return new AppError("An unexpected error occurred", HttpStatus.INTERNAL_SERVER_ERROR);
}
