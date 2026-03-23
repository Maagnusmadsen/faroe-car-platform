/**
 * Server-side listing service: create draft, update draft, publish.
 * Maps wizard data to Prisma CarListing + CarImage, CarAvailabilityRule, CarBlockedDate, PickupOption.
 */

import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/db";
import { AppError, HttpStatus } from "@/lib/utils/errors";
import { getTownInfo } from "@/lib/town-coordinates";
import type { ListingWizardData } from "@/components/listing-wizard/types";
import {
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  validateStep5,
  validateStep7,
} from "@/components/listing-wizard/validateSteps";
import { deleteListingImage, deleteListingImagesFromStorage } from "@/lib/listing-images";

const DEFAULT_TOWN = "Tórshavn";
const DEFAULT_LAT = 62.0097;
const DEFAULT_LONG = -6.7716;
const DEFAULT_ISLAND = "Streymoy";

/** All step validators for publish */
const ALL_VALIDATORS = [
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  validateStep5,
  () => ({}),
  validateStep7,
];

export function validateAllWizardSteps(data: ListingWizardData): Record<string, string> {
  const errors: Record<string, string> = {};
  ALL_VALIDATORS.forEach((fn, i) => {
    const stepErrors = fn(data);
    Object.assign(errors, stepErrors);
  });
  return errors;
}

export function isListingPublishable(data: ListingWizardData): boolean {
  return Object.keys(validateAllWizardSteps(data)).length === 0;
}

/** Map Prisma CarListing + relations to ListingWizardData for the wizard form */
export function listingToWizardData(car: {
  title: string | null;
  listingType: string;
  brand: string;
  model: string;
  year: number;
  description: string;
  transmission: string;
  fuelType: string;
  seats: number;
  vehicleType: string;
  is4x4: boolean;
  luggageCapacity: string | null;
  town: string;
  pickupLocation: string;
  latitude: Decimal | number;
  longitude: Decimal | number;
  airportPickup: boolean;
  pickupInstructions: string | null;
  pricePerDay: Decimal | number;
  minRentalDays: number;
  weeklyDiscountPct: Decimal | number | null;
  monthlyDiscountPct: Decimal | number | null;
  images: { id: string; url: string; sortOrder: number }[];
  availabilityRule: { minNoticeDays: number; advanceBookingDays: number } | null;
  blockedDates: { date: Date }[];
}): ListingWizardData {
  const toStr = (v: Decimal | number | null | undefined) =>
    v == null ? "" : String(v);
  const sorted = [...car.images].sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    title: car.title ?? "",
    type: (car.listingType === "ride_share" ? "ride_share" : "car_rental") as ListingWizardData["type"],
    brand: car.brand,
    model: car.model,
    year: String(car.year),
    description: car.description,
    transmission: car.transmission as ListingWizardData["transmission"] || "",
    fuelType: car.fuelType as ListingWizardData["fuelType"] || "",
    seats: car.seats,
    vehicleType: car.vehicleType as ListingWizardData["vehicleType"] || "",
    is4x4: car.is4x4,
    luggageCapacity: car.luggageCapacity ?? "",
    town: car.town,
    pickupLocation: car.pickupLocation,
    latitude: car.latitude != null ? Number(car.latitude) : ("" as const),
    longitude: car.longitude != null ? Number(car.longitude) : ("" as const),
    airportPickup: car.airportPickup,
    pickupInstructions: car.pickupInstructions ?? "",
    imageUrls: sorted.map((i) => i.url),
    imageIds: sorted.map((i) => i.id),
    pricePerDay: toStr(car.pricePerDay),
    minimumRentalDays: toStr(car.minRentalDays),
    weeklyDiscount: toStr(car.weeklyDiscountPct),
    monthlyDiscount: toStr(car.monthlyDiscountPct),
    blockedDates: car.blockedDates.map((d) => d.date.toISOString().slice(0, 10)),
    minimumNoticeDays: car.availabilityRule ? String(car.availabilityRule.minNoticeDays) : "",
    advanceBookingDays: car.availabilityRule ? String(car.availabilityRule.advanceBookingDays) : "",
    confirmInsurance: false,
    confirmAllowed: false,
    confirmCorrect: false,
  };
}

/** Build Prisma create payload from wizard data; use defaults for missing required fields */
function buildCreatePayload(ownerId: string, data: Partial<ListingWizardData>) {
  const town = (data.town ?? "").trim() || DEFAULT_TOWN;
  const info = getTownInfo(town);
  const brand = (data.brand ?? "").trim() || "Car";
  const model = (data.model ?? "").trim() || "—";
  const year = data.year ? parseInt(String(data.year), 10) : new Date().getFullYear();
  const desc = (data.description ?? "").trim() || "—";
  const seats = data.seats === "" || data.seats == null ? 5 : Number(data.seats);
  const priceProvided = data.pricePerDay != null && data.pricePerDay !== "";
  const priceRaw = priceProvided ? Number(data.pricePerDay) : NaN;
  const price = Number.isFinite(priceRaw) ? priceRaw : NaN;
  if (priceProvided && (!Number.isFinite(price) || price <= 0)) {
    throw new AppError("Daily price must be greater than 0", HttpStatus.BAD_REQUEST, "INVALID_PRICE");
  }
  const priceValue = priceProvided && price > 0 ? price : 1;
  const minDays = data.minimumRentalDays ? parseInt(String(data.minimumRentalDays), 10) : 1;
  const weekly = data.weeklyDiscount ? parseFloat(String(data.weeklyDiscount)) : null;
  const monthly = data.monthlyDiscount ? parseFloat(String(data.monthlyDiscount)) : null;
  const transmission = (data.transmission as "automatic" | "manual") || "manual";
  const fuelType = (data.fuelType as "petrol" | "diesel" | "electric" | "hybrid") || "petrol";
  const vehicleType = (data.vehicleType as "car" | "van") || "car";
  const pickupLocation = (data.pickupLocation ?? "").trim() || "—";
  const imageUrls = data.imageUrls ?? [];
  const blockedDates = data.blockedDates ?? [];
  const minNotice = data.minimumNoticeDays ? parseInt(String(data.minimumNoticeDays), 10) : 0;
  const advanceDays = data.advanceBookingDays ? parseInt(String(data.advanceBookingDays), 10) : 365;

  const title = (data.title ?? "").trim() || null;
  const listingType = data.type === "ride_share" ? ("ride_share" as const) : ("car_rental" as const);

  const lat = data.latitude != null && data.latitude !== "" ? Number(data.latitude) : NaN;
  const lng = data.longitude != null && data.longitude !== "" ? Number(data.longitude) : NaN;
  const useMapCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  const finalLat = useMapCoords ? lat : info.latitude;
  const finalLng = useMapCoords ? lng : info.longitude;

  return {
    ownerId,
    status: "DRAFT" as const,
    title,
    listingType,
    brand,
    model,
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    description: desc,
    pricePerDay: new Decimal(priceValue),
    minRentalDays: minDays >= 1 ? minDays : 1,
    weeklyDiscountPct: weekly != null && weekly >= 0 && weekly <= 100 ? new Decimal(weekly) : null,
    monthlyDiscountPct: monthly != null && monthly >= 0 && monthly <= 100 ? new Decimal(monthly) : null,
    location: town,
    town,
    island: info.island,
    latitude: new Decimal(finalLat),
    longitude: new Decimal(finalLng),
    pickupLocation,
    airportPickup: !!data.airportPickup,
    pickupInstructions: (data.pickupInstructions ?? "").trim() || null,
    seats: Number.isFinite(seats) && seats >= 1 && seats <= 9 ? seats : 5,
    transmission,
    fuelType,
    vehicleType,
    is4x4: !!data.is4x4,
    luggageCapacity: (data.luggageCapacity ?? "").trim() || null,
    images: {
      create: imageUrls.slice(0, 20).map((url, i) => ({ url: url.slice(0, 500000), sortOrder: i })),
    },
    availabilityRule: {
      create: { minNoticeDays: minNotice >= 0 ? minNotice : 0, advanceBookingDays: advanceDays >= 0 ? advanceDays : 365 },
    },
    blockedDates: {
      create: [...new Set(blockedDates)]
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
        .slice(0, 500)
        .map((d) => ({ date: new Date(d + "T12:00:00Z") })),
    },
    pickupOptions: {
      create: [{ label: "Default", address: pickupLocation, isDefault: true, sortOrder: 0 }],
    },
  };
}

/** Build Prisma update payload from wizard data (partial) */
function buildUpdatePayload(data: Partial<ListingWizardData>) {
  const town = data.town !== undefined ? (String(data.town).trim() || DEFAULT_TOWN) : undefined;
  const info = town ? getTownInfo(town) : null;

  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = String(data.title).trim() || null;
  if (data.type !== undefined) payload.listingType = data.type === "ride_share" ? "ride_share" : "car_rental";
  if (data.brand !== undefined) payload.brand = String(data.brand).trim() || "Car";
  if (data.model !== undefined) payload.model = String(data.model).trim() || "—";
  if (data.year !== undefined) {
    const y = parseInt(String(data.year), 10);
    payload.year = Number.isFinite(y) ? y : new Date().getFullYear();
  }
  if (data.description !== undefined) payload.description = String(data.description).trim() || "—";
  if (data.transmission !== undefined) payload.transmission = (data.transmission as "automatic" | "manual") || "manual";
  if (data.fuelType !== undefined) payload.fuelType = (data.fuelType as "petrol" | "diesel" | "electric" | "hybrid") || "petrol";
  if (data.seats !== undefined) {
    const s = Number(data.seats);
    payload.seats = Number.isFinite(s) && s >= 1 && s <= 9 ? s : 5;
  }
  if (data.vehicleType !== undefined) payload.vehicleType = (data.vehicleType as "car" | "van") || "car";
  if (data.is4x4 !== undefined) payload.is4x4 = !!data.is4x4;
  if (data.luggageCapacity !== undefined) payload.luggageCapacity = String(data.luggageCapacity).trim() || null;
  if (data.town !== undefined) {
    payload.town = town!;
    payload.location = town!;
    if (info) {
      payload.island = info.island;
      const lat = data.latitude != null && data.latitude !== "" ? Number(data.latitude) : NaN;
      const lng = data.longitude != null && data.longitude !== "" ? Number(data.longitude) : NaN;
      const useMapCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      payload.latitude = new Decimal(useMapCoords ? lat : info.latitude);
      payload.longitude = new Decimal(useMapCoords ? lng : info.longitude);
    }
  }
  if (data.latitude !== undefined && data.longitude !== undefined) {
    const lat = data.latitude !== "" ? Number(data.latitude) : NaN;
    const lng = data.longitude !== "" ? Number(data.longitude) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      payload.latitude = new Decimal(lat);
      payload.longitude = new Decimal(lng);
    }
  }
  if (data.pickupLocation !== undefined) payload.pickupLocation = String(data.pickupLocation).trim() || "—";
  if (data.airportPickup !== undefined) payload.airportPickup = !!data.airportPickup;
  if (data.pickupInstructions !== undefined) payload.pickupInstructions = String(data.pickupInstructions).trim() || null;
  if (data.pricePerDay !== undefined) {
    const p = Number(data.pricePerDay);
    if (!Number.isFinite(p) || p <= 0) {
      throw new AppError("Daily price must be greater than 0", HttpStatus.BAD_REQUEST, "INVALID_PRICE");
    }
    payload.pricePerDay = new Decimal(p);
  }
  if (data.minimumRentalDays !== undefined) {
    const m = parseInt(String(data.minimumRentalDays), 10);
    payload.minRentalDays = Number.isFinite(m) && m >= 1 ? m : 1;
  }
  if (data.weeklyDiscount !== undefined) {
    const w = parseFloat(String(data.weeklyDiscount));
    payload.weeklyDiscountPct = w >= 0 && w <= 100 ? new Decimal(w) : null;
  }
  if (data.monthlyDiscount !== undefined) {
    const m = parseFloat(String(data.monthlyDiscount));
    payload.monthlyDiscountPct = m >= 0 && m <= 100 ? new Decimal(m) : null;
  }
  return payload;
}

/** Create a new draft listing. Optional initial wizard data. */
export async function createDraft(ownerId: string, data?: Partial<ListingWizardData>) {
  const payload = buildCreatePayload(ownerId, data ?? {});
  const car = await prisma.carListing.create({
    data: payload as Parameters<typeof prisma.carListing.create>[0]["data"],
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      availabilityRule: true,
      blockedDates: true,
      pickupOptions: true,
    },
  });
  return car;
}

/** Get listing by id if it belongs to owner and is draft (or any status for owner). */
export async function getListingForOwner(listingId: string, ownerId: string) {
  const car = await prisma.carListing.findFirst({
    where: { id: listingId, ownerId, deletedAt: null },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      availabilityRule: true,
      blockedDates: true,
      pickupOptions: true,
    },
  });
  return car;
}

/** Update draft or active listing with partial wizard data. Replaces images, availabilityRule, blockedDates when provided. */
export async function updateDraft(listingId: string, ownerId: string, data: Partial<ListingWizardData>) {
  const car = await getListingForOwner(listingId, ownerId);
  if (!car) return null;
  // Allow edit for both DRAFT and ACTIVE (owner can update published listing)
  if (car.status !== "DRAFT" && car.status !== "ACTIVE") return null;

  const updatePayload = buildUpdatePayload(data);

  if (data.imageIds !== undefined && Array.isArray(data.imageIds)) {
    const keepSet = new Set(data.imageIds);
    const current = await prisma.carImage.findMany({
      where: { carId: listingId },
      select: { id: true },
    });
    for (const img of current) {
      if (!keepSet.has(img.id)) {
        await deleteListingImage(img.id, ownerId);
      }
    }
    for (let i = 0; i < data.imageIds.length; i++) {
      await prisma.carImage.updateMany({
        where: { id: data.imageIds[i], carId: listingId },
        data: { sortOrder: i },
      });
    }
  } else if (data.imageUrls !== undefined) {
    await prisma.carImage.deleteMany({ where: { carId: listingId } });
    if (data.imageUrls.length > 0) {
      await prisma.carImage.createMany({
        data: data.imageUrls.slice(0, 20).map((url, i) => ({
          carId: listingId,
          url: url.slice(0, 500000),
          sortOrder: i,
        })),
      });
    }
  }

  if (data.blockedDates !== undefined) {
    await prisma.carBlockedDate.deleteMany({ where: { carId: listingId } });
    const dates = [...new Set(data.blockedDates)]
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .slice(0, 500);
    if (dates.length > 0) {
      await prisma.carBlockedDate.createMany({
        data: dates.map((d) => ({ carId: listingId, date: new Date(d + "T12:00:00Z") })),
      });
    }
  }

  if (data.minimumNoticeDays !== undefined || data.advanceBookingDays !== undefined) {
    const minNotice = data.minimumNoticeDays !== undefined ? parseInt(String(data.minimumNoticeDays), 10) : car.availabilityRule?.minNoticeDays ?? 0;
    const advance = data.advanceBookingDays !== undefined ? parseInt(String(data.advanceBookingDays), 10) : car.availabilityRule?.advanceBookingDays ?? 365;
    await prisma.carAvailabilityRule.upsert({
      where: { carId: listingId },
      create: { carId: listingId, minNoticeDays: minNotice >= 0 ? minNotice : 0, advanceBookingDays: advance >= 0 ? advance : 365 },
      update: { minNoticeDays: minNotice >= 0 ? minNotice : 0, advanceBookingDays: advance >= 0 ? advance : 365 },
    });
  }

  if (Object.keys(updatePayload).length > 0) {
    await prisma.carListing.update({
      where: { id: listingId },
      data: updatePayload as Parameters<typeof prisma.carListing.update>[0]["data"],
    });
  }

  return getListingForOwner(listingId, ownerId);
}

/** Get public listing (ACTIVE only) for display. Returns null if not found or not ACTIVE. */
export async function getPublicListing(listingId: string) {
  const car = await prisma.carListing.findFirst({
    where: { id: listingId, status: "ACTIVE", deletedAt: null },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      blockedDates: true,
      availabilityRule: true,
      features: true,
      pickupOptions: { orderBy: { sortOrder: "asc" } },
      owner: {
        include: {
          profile: true,
        },
      },
    },
  });
  if (!car) return null;

  const primaryImage =
    car.images[0]?.url ??
    "https://images.unsplash.com/photo-1494976388531-d1058494cd4f?w=800&q=80";

  const blockedDates = car.blockedDates.map((d) =>
    d.date.toISOString().slice(0, 10)
  );

  const minNoticeDays = car.availabilityRule?.minNoticeDays ?? 0;
  const advanceBookingDays = car.availabilityRule?.advanceBookingDays ?? 365;

  const ownerProfile = car.owner.profile;

  return {
    // Basic card fields (backwards compatible with Car)
    id: car.id,
    title: car.title ?? undefined,
    type: car.listingType,
    brand: car.brand,
    model: car.model,
    year: car.year,
    pricePerDay: Number(car.pricePerDay),
    location: car.location,
    rating: car.ratingAvg ? Number(car.ratingAvg) : 5,
    imageUrl: primaryImage,
    description: car.description,
    latitude: Number(car.latitude),
    longitude: Number(car.longitude),
    island: car.island,
    town: car.town,
    pickupLocation: car.pickupLocation || undefined,
    airportPickup: car.airportPickup,
    seats: car.seats,
    transmission: car.transmission,
    fuelType: car.fuelType,
    is4x4: car.is4x4,
    vehicleType: car.vehicleType,
    blockedDates,

    // Detail-only fields
    images: car.images.map((img) => img.url),
    owner: {
      id: car.owner.id,
      name: car.owner.name ?? car.owner.profile?.ownerNote ?? "Car owner",
      avatarUrl: ownerProfile?.avatarUrl ?? null,
      ownerNote: ownerProfile?.ownerNote ?? null,
    },
    reviewsSummary: {
      ratingAvg: car.ratingAvg ? Number(car.ratingAvg) : 5,
      reviewCount: car.reviewCount,
    },
    availability: {
      blockedDates,
      minNoticeDays,
      advanceBookingDays,
      minRentalDays: car.minRentalDays,
    },
    pickup: {
      location: car.pickupLocation,
      airportPickup: car.airportPickup,
      instructions: car.pickupInstructions,
      options: car.pickupOptions.map((opt) => ({
        id: opt.id,
        label: opt.label,
        address: opt.address,
        isDefault: opt.isDefault,
      })),
    },
    features: car.features.map((f) => ({
      key: f.featureKey,
      value: f.featureValue,
    })),
  };
}

/** Publish draft: require Stripe Connect, validate all steps, then set status to ACTIVE. */
export async function publishListing(listingId: string, ownerId: string, wizardData: ListingWizardData) {
  const car = await getListingForOwner(listingId, ownerId);
  if (!car) return { success: false, error: "NOT_FOUND" as const };
  if (car.status !== "DRAFT") return { success: false, error: "NOT_DRAFT" as const };

  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { stripeConnectAccountId: true },
  });
  if (!owner?.stripeConnectAccountId) {
    return { success: false, error: "STRIPE_CONNECT_REQUIRED" as const };
  }

  const errors = validateAllWizardSteps(wizardData);
  if (Object.keys(errors).length > 0) {
    return { success: false, error: "VALIDATION" as const, errors };
  }

  const price = Number(car.pricePerDay);
  if (!Number.isFinite(price) || price <= 0) {
    return {
      success: false,
      error: "VALIDATION" as const,
      errors: { pricePerDay: "Daily price must be greater than 0" },
    };
  }

  await prisma.carListing.update({
    where: { id: listingId },
    data: { status: "ACTIVE" },
  });
  return { success: true };
}

/** Soft-delete a listing (set deletedAt). Only owner can delete. Also removes images from Storage. */
export async function deleteListing(listingId: string, ownerId: string) {
  const car = await getListingForOwner(listingId, ownerId);
  if (!car) return false;
  await deleteListingImagesFromStorage(listingId);
  await prisma.carListing.update({
    where: { id: listingId },
    data: { deletedAt: new Date() },
  });
  return true;
}

/** Soft-delete a listing as admin. No owner check. Also removes images from Storage. */
export async function deleteListingAsAdmin(listingId: string): Promise<boolean> {
  const car = await prisma.carListing.findFirst({
    where: { id: listingId, deletedAt: null },
    select: { id: true },
  });
  if (!car) return false;
  await deleteListingImagesFromStorage(listingId);
  await prisma.carListing.update({
    where: { id: listingId },
    data: { deletedAt: new Date() },
  });
  return true;
}
