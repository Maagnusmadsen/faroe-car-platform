/**
 * Client-side store for user-submitted car listings.
 * Persists to localStorage so listings survive refresh.
 * In production this would be replaced by an API + database.
 */

import type { Car } from "./cars";

const LISTINGS_KEY = "faroe-rent-listings";

let memoryListings: Car[] = [];

function loadFromStorage(): Car[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LISTINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(list: Car[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LISTINGS_KEY, JSON.stringify(list));
  } catch {
    // ignore quota or other errors
  }
}

/**
 * Load listings from localStorage. Call once on client init.
 */
export function loadListings(): Car[] {
  memoryListings = loadFromStorage();
  return memoryListings;
}

/**
 * Get all user-submitted listings (from memory; call loadListings() in app first if needed).
 */
export function getListings(): Car[] {
  if (typeof window !== "undefined" && memoryListings.length === 0) {
    memoryListings = loadFromStorage();
  }
  return memoryListings;
}

/**
 * Add a new listing and persist. Returns the added car (with id set).
 * Use a temporary/mock ownerId until auth exists.
 */
export function addListing(car: Omit<Car, "id"> & { id?: string }): Car {
  const list = getListings();
  const id = car.id || `listing-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const newCar: Car = {
    ...car,
    id,
  };
  memoryListings = [...list, newCar];
  saveToStorage(memoryListings);
  return newCar;
}
