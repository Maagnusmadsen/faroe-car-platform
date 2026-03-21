import type { Car } from "@/lib/cars";
import type { ListingWizardData } from "./types";
import { getTownInfo } from "@/lib/town-coordinates";

/**
 * Build a Car object from wizard data for submission.
 * imageUrls[0] becomes imageUrl; coordinates from town.
 */
export function buildCarFromWizard(data: ListingWizardData): Omit<Car, "id"> {
  const townInfo = getTownInfo(data.town);
  const seats = data.seats === "" ? 5 : Number(data.seats);
  const raw = Number(data.pricePerDay);
  const pricePerDay = Number.isFinite(raw) && raw > 0 ? raw : 1;
  const imageUrl =
    data.imageUrls?.length > 0
      ? data.imageUrls[0]
      : "https://images.unsplash.com/photo-1494976388531-d1058494cd4f?w=800&q=80";

  return {
    brand: data.brand.trim(),
    model: data.model.trim(),
    year: parseInt(String(data.year), 10) || new Date().getFullYear(),
    description: data.description.trim(),
    pricePerDay,
    location: data.town.trim(),
    rating: 5,
    imageUrl,
    latitude: townInfo.latitude,
    longitude: townInfo.longitude,
    island: townInfo.island,
    town: data.town.trim(),
    pickupLocation: data.pickupLocation.trim() || undefined,
    airportPickup: data.airportPickup,
    seats: Number.isFinite(seats) ? seats : 5,
    transmission: (data.transmission as Car["transmission"]) || "manual",
    fuelType: (data.fuelType as Car["fuelType"]) || "petrol",
    is4x4: data.is4x4,
    vehicleType: (data.vehicleType as Car["vehicleType"]) || "car",
    blockedDates:
      data.blockedDates?.length ? [...data.blockedDates] : undefined,
  };
}
