/**
 * Upload limits shared by client (validation) and server (storage).
 */

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const ACCEPT_STRING = "image/jpeg,image/png,image/webp";
