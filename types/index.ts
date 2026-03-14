/**
 * Shared domain and API types.
 * Re-export from lib where the source of truth lives; define API-specific shapes here.
 */

export type {
  Car,
  Transmission,
  FuelType,
  VehicleType,
} from "@/lib/cars";

/** Paginated list response shape (for future API responses) */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Generic API error shape (matches lib/utils/api-response) */
export interface ApiErrorBody {
  error: string;
  code?: string;
  details?: unknown;
}

/** Session user; role matches Prisma UserRole. Owner/renter are contextual (e.g. car.ownerId). */
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role?: "USER" | "ADMIN";
}

/** Profile API response shape (GET /api/profile). Reused for listings, bookings, reviews when loading owner/renter. */
export type { ProfileWithUser } from "@/lib/profile";
