import type { Car } from "@/lib/cars";

export interface CarDetail extends Car {
  /** All image URLs for gallery (first image should match imageUrl). */
  images?: string[];
  owner?: {
    id: string;
    name: string;
    avatarUrl: string | null;
    ownerNote: string | null;
  };
  reviewsSummary?: {
    ratingAvg: number;
    reviewCount: number;
  };
  availability?: {
    blockedDates: string[];
    minNoticeDays: number;
    advanceBookingDays: number;
    minRentalDays: number;
  };
  pickup?: {
    location: string;
    airportPickup: boolean;
    instructions: string | null;
    options: {
      id: string;
      label: string;
      address: string | null;
      isDefault: boolean;
    }[];
  };
  features?: {
    key: string;
    value?: string | null;
  }[];
}

