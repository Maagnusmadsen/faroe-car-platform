/**
 * API request/response types.
 * Use for route handlers and API client. Keep in sync with validation schemas.
 */

import type { Car } from "@/lib/cars";

/** GET /api/cars query params (search & filter) */
export interface CarsQueryParams {
  location?: string;
  island?: string;
  town?: string;
  startDate?: string;
  endDate?: string;
  priceMin?: number;
  priceMax?: number;
  seats?: number;
  transmission?: string;
  fuelType?: string;
  is4x4?: boolean;
  airportPickup?: boolean;
  page?: number;
  pageSize?: number;
}

/** POST /api/cars body (create listing) */
export interface CreateCarBody {
  brand: string;
  model: string;
  year: number;
  description: string;
  town: string;
  pickupLocation: string;
  airportPickup: boolean;
  pickupInstructions?: string;
  transmission: string;
  fuelType: string;
  seats: number;
  vehicleType: string;
  is4x4: boolean;
  luggageCapacity?: string;
  pricePerDay: number;
  minimumRentalDays?: number;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
  blockedDates?: string[];
  imageUrls: string[];
}

/** Car API response (same as Car for now; can add computed fields later) */
export type CarResponse = Car;
