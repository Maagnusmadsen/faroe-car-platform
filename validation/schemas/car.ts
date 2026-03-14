/**
 * Car-related Zod schemas for API request validation.
 * Used by route handlers when cars API is implemented (Step B4).
 */

import { z } from "zod";

const transmissionSchema = z.enum(["automatic", "manual"]);
const fuelTypeSchema = z.enum(["petrol", "diesel", "electric", "hybrid"]);
const vehicleTypeSchema = z.enum(["car", "van"]);
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD");

export const carCreateSchema = z.object({
  brand: z.string().min(1, "Brand is required").max(100),
  model: z.string().min(1, "Model is required").max(100),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  description: z.string().min(1, "Description is required").max(5000),
  town: z.string().min(1, "Town is required").max(200),
  pickupLocation: z.string().min(1, "Pickup location is required").max(500),
  airportPickup: z.boolean(),
  pickupInstructions: z.string().max(1000).optional(),
  transmission: transmissionSchema,
  fuelType: fuelTypeSchema,
  seats: z.number().int().min(1).max(9),
  vehicleType: vehicleTypeSchema,
  is4x4: z.boolean(),
  luggageCapacity: z.string().max(200).optional(),
  pricePerDay: z.number().positive("Price must be positive"),
  minimumRentalDays: z.number().int().min(0).optional(),
  weeklyDiscount: z.number().min(0).max(100).optional(),
  monthlyDiscount: z.number().min(0).max(100).optional(),
  blockedDates: z.array(dateStringSchema).optional(),
  imageUrls: z.array(z.string().url()).min(3, "At least 3 images required"),
});

export type CarCreateInput = z.infer<typeof carCreateSchema>;

const sortSchema = z.enum(["relevant", "newest", "price-asc", "price-desc", "rating-desc"]);

/** Query params for GET /api/cars */
export const carsQuerySchema = z.object({
  type: z.enum(["car_rental", "ride_share"]).optional(),
  location: z.string().max(200).optional(),
  island: z.string().max(100).optional(),
  town: z.string().max(200).optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  seats: z.coerce.number().int().min(1).max(9).optional(),
  transmission: transmissionSchema.optional(),
  fuelType: fuelTypeSchema.optional(),
  is4x4: z.coerce.boolean().optional(),
  airportPickup: z.coerce.boolean().optional(),
  sort: sortSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type CarsQueryInput = z.infer<typeof carsQuerySchema>;

/** Wizard payload for POST (create draft) and PATCH (update draft). All fields optional. */
export const listingWizardPayloadSchema = z
  .object({
    title: z.string().max(200).optional(),
    type: z.enum(["car_rental", "ride_share"]).optional(),
    brand: z.string().max(200).optional(),
    model: z.string().max(200).optional(),
    year: z.union([z.string(), z.number()]).optional(),
    description: z.string().max(10000).optional(),
    transmission: z.enum(["automatic", "manual", ""]).optional(),
    fuelType: z.enum(["petrol", "diesel", "electric", "hybrid", ""]).optional(),
    seats: z.union([z.number(), z.string()]).optional(),
    vehicleType: z.enum(["car", "van", ""]).optional(),
    is4x4: z.boolean().optional(),
    luggageCapacity: z.string().max(500).optional(),
    town: z.string().max(200).optional(),
    pickupLocation: z.string().max(500).optional(),
    latitude: z.union([z.number(), z.string()]).optional(),
    longitude: z.union([z.number(), z.string()]).optional(),
    airportPickup: z.boolean().optional(),
    pickupInstructions: z.string().max(2000).optional(),
    imageUrls: z.array(z.string().max(500000)).optional(),
    imageIds: z.array(z.string()).optional(),
    pricePerDay: z.union([z.string(), z.number()]).optional(),
    minimumRentalDays: z.union([z.string(), z.number()]).optional(),
    weeklyDiscount: z.union([z.string(), z.number()]).optional(),
    monthlyDiscount: z.union([z.string(), z.number()]).optional(),
    blockedDates: z.array(z.string()).optional(),
    minimumNoticeDays: z.union([z.string(), z.number()]).optional(),
    advanceBookingDays: z.union([z.string(), z.number()]).optional(),
    confirmInsurance: z.boolean().optional(),
    confirmAllowed: z.boolean().optional(),
    confirmCorrect: z.boolean().optional(),
  })
  .strict();

export type ListingWizardPayload = z.infer<typeof listingWizardPayloadSchema>;
