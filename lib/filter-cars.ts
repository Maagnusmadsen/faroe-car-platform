/**
 * Client-side car filtering by location, price, seats, transmission, fuel, 4x4.
 * Kept pure for performance and testability.
 */

import type { Car, Transmission, FuelType } from "./cars";

export type ListingTypeFilter = "" | "car_rental" | "ride_share";

export interface CarFilters {
  listingType: ListingTypeFilter;
  island: string;
  town: string;
  pickupLocation: string;
  priceMin: number | null;
  priceMax: number | null;
  seats: number | null;
  transmission: Transmission | "";
  fuelType: FuelType | "";
  is4x4: boolean | null;
  /** When true, only show cars with airport pickup at Vágar */
  airportPickupOnly: boolean | null;
}

export const defaultCarFilters: CarFilters = {
  listingType: "",
  island: "",
  town: "",
  pickupLocation: "",
  priceMin: null,
  priceMax: null,
  seats: null,
  transmission: "",
  fuelType: "",
  is4x4: null,
  airportPickupOnly: null,
};

function matchesString(value: string, filter: string): boolean {
  if (!filter.trim()) return true;
  return value.toLowerCase().includes(filter.trim().toLowerCase());
}

export function filterCars(cars: Car[], filters: CarFilters): Car[] {
  return cars.filter((car) => {
    if (filters.listingType && car.type !== filters.listingType) return false;
    if (filters.island && car.island !== filters.island) return false;
    if (filters.town && !matchesString(car.town, filters.town)) return false;
    if (
      filters.pickupLocation &&
      !matchesString(car.pickupLocation ?? car.location, filters.pickupLocation)
    )
      return false;
    if (filters.priceMin != null && car.pricePerDay < filters.priceMin)
      return false;
    if (filters.priceMax != null && car.pricePerDay > filters.priceMax)
      return false;
    if (filters.seats != null && car.seats < filters.seats) return false;
    if (filters.transmission && car.transmission !== filters.transmission)
      return false;
    if (filters.fuelType && car.fuelType !== filters.fuelType) return false;
    if (filters.is4x4 !== null && car.is4x4 !== filters.is4x4) return false;
    if (filters.airportPickupOnly === true && !car.airportPickup) return false;
    return true;
  });
}

export type SortOption = "relevant" | "newest" | "price-asc" | "price-desc" | "rating-desc";

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function filterCarsByViewport(cars: Car[], bounds: MapBounds | null): Car[] {
  if (!bounds) return cars;
  return cars.filter(
    (car) =>
      car.latitude >= bounds.south &&
      car.latitude <= bounds.north &&
      car.longitude >= bounds.west &&
      car.longitude <= bounds.east
  );
}

export function sortCars(cars: Car[], sort: SortOption): Car[] {
  const copy = [...cars];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.pricePerDay - b.pricePerDay);
    case "price-desc":
      return copy.sort((a, b) => b.pricePerDay - a.pricePerDay);
    case "rating-desc":
      return copy.sort((a, b) => b.rating - a.rating);
    case "newest":
      // Server returns newest-first; no createdAt on Car for client sort
      return copy;
    default:
      return copy;
  }
}
