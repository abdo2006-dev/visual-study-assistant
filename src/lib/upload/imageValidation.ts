export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

/** Raw upload cap before compression — generous since compression shrinks it well below this. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export type ImageValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateImageFile(file: File): ImageValidationResult {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return {
      valid: false,
      error: "Please upload a PNG, JPEG, or WebP image.",
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      error: `That image is too large (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB).`,
    };
  }
  return { valid: true };
}
