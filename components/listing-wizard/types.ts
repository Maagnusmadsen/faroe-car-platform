import type { Transmission, FuelType, VehicleType } from "@/lib/cars";

export type ListingType = "car_rental" | "ride_share";

export interface ListingWizardData {
  // Step 1
  title: string;
  type: ListingType;
  brand: string;
  model: string;
  year: string;
  description: string;
  // Step 2
  transmission: Transmission | "";
  fuelType: FuelType | "";
  seats: number | "";
  vehicleType: VehicleType | "";
  is4x4: boolean;
  luggageCapacity: string;
  // Step 3
  town: string;
  pickupLocation: string;
  latitude: number | "";
  longitude: number | "";
  airportPickup: boolean;
  pickupInstructions: string;
  // Step 4 – image URLs (uploaded URLs or data URLs); imageIds[i] = CarImage.id for imageUrls[i] when from API
  imageUrls: string[];
  imageIds: string[];
  // Step 5
  pricePerDay: string;
  minimumRentalDays: string;
  weeklyDiscount: string;
  monthlyDiscount: string;
  // Step 6
  blockedDates: string[];
  minimumNoticeDays: string;
  advanceBookingDays: string;
  // Step 7
  confirmInsurance: boolean;
  confirmAllowed: boolean;
  confirmCorrect: boolean;
}

export const initialWizardData: ListingWizardData = {
  title: "",
  type: "car_rental",
  brand: "",
  model: "",
  year: "",
  description: "",
  transmission: "",
  fuelType: "",
  seats: "",
  vehicleType: "",
  is4x4: false,
  luggageCapacity: "",
  town: "",
  pickupLocation: "",
  latitude: "",
  longitude: "",
  airportPickup: false,
  pickupInstructions: "",
  imageUrls: [],
  imageIds: [],
  pricePerDay: "",
  minimumRentalDays: "",
  weeklyDiscount: "",
  monthlyDiscount: "",
  blockedDates: [],
  minimumNoticeDays: "",
  advanceBookingDays: "",
  confirmInsurance: false,
  confirmAllowed: false,
  confirmCorrect: false,
};

export type StepErrors = Partial<Record<keyof ListingWizardData, string>>;
