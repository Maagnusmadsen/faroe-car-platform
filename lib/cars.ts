/** Transmission type */
export type Transmission = "automatic" | "manual";

/** Fuel type */
export type FuelType = "petrol" | "diesel" | "electric" | "hybrid";

/** Vehicle type for listing */
export type VehicleType = "car" | "van";

/** Listing type: car_rental or ride_share */
export type ListingType = "car_rental" | "ride_share";

export interface Car {
  id: string;
  /** Display title; if not set, use brand + model */
  title?: string;
  /** car_rental or ride_share */
  type?: ListingType;
  brand: string;
  model: string;
  year: number;
  pricePerDay: number;
  location: string;
  rating: number;
  imageUrl: string;
  description?: string;
  /** Coordinates for map (Faroe Islands) */
  latitude: number;
  longitude: number;
  /** Island name (e.g. Streymoy, Eysturoy) */
  island: string;
  /** Town or bygd */
  town: string;
  /** Specific pickup location if available */
  pickupLocation?: string;
  /** Can be picked up at Vágar Airport */
  airportPickup: boolean;
  seats: number;
  transmission: Transmission;
  fuelType: FuelType;
  is4x4: boolean;
  /** car or van; optional for backward compatibility */
  vehicleType?: VehicleType;
  /** Dates when the car is blocked (YYYY-MM-DD); owner-set unavailability */
  blockedDates?: string[];
}

/** Faroe Islands islands/locations for filters */
export const FAROE_ISLANDS = [
  "Streymoy",
  "Eysturoy",
  "Vágar",
  "Suðuroy",
  "Borðoy",
  "Kalsoy",
  "Sandoy",
] as const;

export const cars: Car[] = [
  {
    id: "1",
    brand: "Toyota",
    model: "Yaris",
    year: 2022,
    pricePerDay: 399,
    location: "Tórshavn",
    rating: 4.9,
    imageUrl: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&q=80",
    latitude: 62.0097,
    longitude: -6.7716,
    island: "Streymoy",
    town: "Tórshavn",
    pickupLocation: "Tórshavn harbour",
    airportPickup: false,
    seats: 5,
    transmission: "manual",
    fuelType: "petrol",
    is4x4: false,
  },
  {
    id: "2",
    brand: "Volkswagen",
    model: "Golf",
    year: 2021,
    pricePerDay: 499,
    location: "Klaksvík",
    rating: 5.0,
    imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
    latitude: 62.2261,
    longitude: -6.589,
    island: "Borðoy",
    town: "Klaksvík",
    pickupLocation: "Klaksvík bus station",
    airportPickup: false,
    seats: 5,
    transmission: "automatic",
    fuelType: "diesel",
    is4x4: false,
  },
  {
    id: "3",
    brand: "Hyundai",
    model: "Tucson",
    year: 2023,
    pricePerDay: 649,
    location: "Runavík",
    rating: 4.8,
    imageUrl: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&q=80",
    latitude: 62.1094,
    longitude: -6.7217,
    island: "Eysturoy",
    town: "Runavík",
    pickupLocation: "Runavík ferry terminal",
    airportPickup: false,
    seats: 5,
    transmission: "automatic",
    fuelType: "diesel",
    is4x4: true,
  },
  {
    id: "4",
    brand: "Peugeot",
    model: "208",
    year: 2020,
    pricePerDay: 429,
    location: "Tórshavn",
    rating: 4.7,
    imageUrl: "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80",
    latitude: 62.012,
    longitude: -6.768,
    island: "Streymoy",
    town: "Tórshavn",
    airportPickup: false,
    seats: 5,
    transmission: "manual",
    fuelType: "petrol",
    is4x4: false,
  },
  {
    id: "5",
    brand: "Škoda",
    model: "Octavia",
    year: 2022,
    pricePerDay: 549,
    location: "Vágur",
    rating: 4.9,
    imageUrl: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80",
    latitude: 61.4733,
    longitude: -6.8092,
    island: "Suðuroy",
    town: "Vágur",
    pickupLocation: "Vágur harbour",
    airportPickup: false,
    seats: 5,
    transmission: "manual",
    fuelType: "diesel",
    is4x4: false,
  },
  {
    id: "6",
    brand: "Nissan",
    model: "Qashqai",
    year: 2021,
    pricePerDay: 579,
    location: "Eiði",
    rating: 4.6,
    imageUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80",
    latitude: 62.2992,
    longitude: -7.0922,
    island: "Eysturoy",
    town: "Eiði",
    airportPickup: true,
    seats: 5,
    transmission: "automatic",
    fuelType: "petrol",
    is4x4: true,
  },
];
