/**
 * Single source of truth for all cars: static seed data + user-submitted listings.
 * Rent a Car page and detail page should use getAllCars() / getCarById() from here.
 */

import { cars } from "./cars";
import { getListings } from "./listings";
import type { Car } from "./cars";

export type { Car } from "./cars";

/**
 * Returns static cars + user-submitted listings.
 * Safe to call on server (listings will be empty until client hydrates) and on client.
 */
export function getAllCars(): Car[] {
  const listings = getListings();
  return [...cars, ...listings];
}

/**
 * Find a car by id (static or listing).
 */
export function getCarById(id: string): Car | undefined {
  const fromStatic = cars.find((c) => c.id === id);
  if (fromStatic) return fromStatic;
  return getListings().find((c) => c.id === id);
}
