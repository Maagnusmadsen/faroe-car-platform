/**
 * Storage abstraction for car listing images.
 * Drivers: local | s3 | supabase.
 * Configure via UPLOAD_DRIVER and env vars below.
 */

import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES as MAX_SIZE,
} from "@/constants/upload";

export const MAX_IMAGE_SIZE_BYTES = MAX_SIZE;

export type AllowedImageType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export function isAllowedImageType(mime: string): mime is AllowedImageType {
  return ALLOWED_IMAGE_MIME_TYPES.includes(mime as AllowedImageType);
}

function getExtension(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/** Object key for storage (S3 key or local path segment). */
export function generateImageKey(listingId: string, contentType: string): string {
  const ext = getExtension(contentType);
  return `listings/${listingId}/${randomUUID()}.${ext}`;
}

/** Key for renter verification licence upload (private; only admin/owner should view). */
export function generateVerificationLicenseKey(userId: string, contentType: string): string {
  const ext = getExtension(contentType);
  return `verification/${userId}/${randomUUID()}.${ext}`;
}

export interface StorageDriver {
  upload(buffer: Buffer, key: string, contentType: string): Promise<string>;
  delete(key: string): Promise<void>;
}

/** S3 (or S3-compatible) driver. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET, S3_PUBLIC_URL (optional base URL for public reads). */
function createS3Driver(): StorageDriver {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION ?? "eu-north-1";
  const publicBaseUrl = process.env.S3_PUBLIC_URL; // e.g. https://cdn.example.com or https://bucket.s3.region.amazonaws.com

  if (!bucket) {
    throw new Error("S3_BUCKET is required when UPLOAD_DRIVER=s3");
  }

  const client = new S3Client({
    region,
    ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
    ...(process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY && {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }),
  });

  return {
    async upload(buffer: Buffer, key: string, contentType: string): Promise<string> {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000",
        })
      );
      if (publicBaseUrl) {
        const base = publicBaseUrl.replace(/\/$/, "");
        return `${base}/${key}`;
      }
      return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    },
    async delete(key: string): Promise<void> {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
    },
  };
}

/** Local disk driver. Writes to public/uploads/ so URLs work. Set UPLOAD_LOCAL_BASE_URL for absolute URLs (e.g. http://localhost:3000). */
function createLocalDriver(): StorageDriver {
  const baseUrl = process.env.UPLOAD_LOCAL_BASE_URL ?? "http://localhost:3000";
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  return {
    async upload(buffer: Buffer, key: string, contentType: string): Promise<string> {
      const fullPath = path.join(uploadsDir, key);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, buffer);
      const url = `${baseUrl.replace(/\/$/, "")}/uploads/${key}`;
      return url;
    },
    async delete(key: string): Promise<void> {
      const fullPath = path.join(uploadsDir, key);
      await unlink(fullPath).catch(() => {
        // ignore if already deleted
      });
    },
  };
}

/** Supabase Storage driver. Uses NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET (default: uploads). Bucket must be public for getPublicUrl. */
function createSupabaseDriver(): StorageDriver {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required when UPLOAD_DRIVER=supabase");
  }
  const client = createClient(url, key);

  return {
    async upload(buffer: Buffer, key: string, contentType: string): Promise<string> {
      const { error } = await client.storage.from(bucket).upload(key, buffer, {
        contentType,
        upsert: true,
      });
      if (error) throw new Error(`Supabase storage upload failed: ${error.message}`);
      const { data } = client.storage.from(bucket).getPublicUrl(key);
      return data.publicUrl;
    },
    async delete(key: string): Promise<void> {
      await client.storage.from(bucket).remove([key]);
    },
  };
}

let _driver: StorageDriver | null = null;

/**
 * Delete all files under a prefix (e.g. verification/userId).
 * Supabase only – no-op for other drivers.
 */
export async function deleteFilesByPrefix(prefix: string): Promise<void> {
  const driver = process.env.UPLOAD_DRIVER ?? "local";
  if (driver !== "supabase") return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";
  if (!url || !key) return;

  const client = createClient(url, key);
  const { data } = await client.storage.from(bucket).list(prefix, { limit: 200 });
  if (!data?.length) return;

  const keys = data
    .filter((f) => f.name)
    .map((f) => `${prefix}/${f.name}`);
  if (keys.length > 0) {
    await client.storage.from(bucket).remove(keys);
  }
}

/** Get the configured storage driver. Uses UPLOAD_DRIVER= local | s3 | supabase (default local if unset). */
export function getStorage(): StorageDriver {
  if (_driver) return _driver;
  const driver = process.env.UPLOAD_DRIVER ?? "local";
  if (driver === "s3") {
    _driver = createS3Driver();
  } else if (driver === "supabase") {
    _driver = createSupabaseDriver();
  } else {
    _driver = createLocalDriver();
  }
  return _driver;
}
