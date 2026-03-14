/**
 * Listing image upload, delete, and reorder.
 * Uses storage driver (S3 or local) and CarImage records.
 */

import { prisma } from "@/db";
import {
  getStorage,
  generateImageKey,
  isAllowedImageType,
  MAX_IMAGE_SIZE_BYTES,
} from "@/lib/storage";

async function getDraftListing(listingId: string, ownerId: string) {
  return prisma.carListing.findFirst({
    where: { id: listingId, ownerId, deletedAt: null, status: "DRAFT" },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function addListingImage(
  listingId: string,
  ownerId: string,
  buffer: Buffer,
  contentType: string
): Promise<{ id: string; url: string; sortOrder: number } | null> {
  const listing = await getDraftListing(listingId, ownerId);
  if (!listing) return null;

  if (!isAllowedImageType(contentType)) {
    const err = new Error("Invalid file type") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    const err = new Error("File too large") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const key = generateImageKey(listingId, contentType);
  const storage = getStorage();
  const url = await storage.upload(buffer, key, contentType);

  const maxOrder =
    listing.images.length > 0
      ? Math.max(...listing.images.map((i) => i.sortOrder))
      : -1;
  const sortOrder = maxOrder + 1;

  const image = await prisma.carImage.create({
    data: {
      carId: listingId,
      url,
      sortOrder,
      storageKey: key,
    },
  });
  return { id: image.id, url: image.url, sortOrder: image.sortOrder };
}

export async function deleteListingImage(
  imageId: string,
  ownerId: string
): Promise<boolean> {
  const image = await prisma.carImage.findFirst({
    where: { id: imageId },
    include: { car: true },
  });
  if (!image || image.car.ownerId !== ownerId || image.car.deletedAt) return false;
  if (image.car.status !== "DRAFT") return false;

  if (image.storageKey) {
    const storage = getStorage();
    await storage.delete(image.storageKey);
  }
  await prisma.carImage.delete({ where: { id: imageId } });
  return true;
}

export async function reorderListingImages(
  listingId: string,
  ownerId: string,
  imageIds: string[]
): Promise<boolean> {
  const listing = await getDraftListing(listingId, ownerId);
  if (!listing) return false;

  const updates = imageIds.map((id, index) =>
    prisma.carImage.updateMany({
      where: { id, carId: listingId },
      data: { sortOrder: index },
    })
  );
  await prisma.$transaction(updates);
  return true;
}
