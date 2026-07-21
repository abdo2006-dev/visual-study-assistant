import "server-only";

import { InvalidAiRequestError } from "@/lib/ai/errors";
import type { ExtractSourceInput, LessonAIProvider } from "@/lib/ai/provider";
import { checkRateLimit } from "@/lib/ai/rateLimit";
import { hashContent, withCache } from "@/lib/cache/requestCache";
import type { ExtractedSource } from "@/lib/schema/extraction";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/upload/imageValidation";

export class InvalidExtractionRequestError extends InvalidAiRequestError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidExtractionRequestError";
  }
}

// Compression on the client targets well under this; this is a defensive
// upper bound in case a request bypasses that (spec section 18 cost control).
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const CACHE_TTL_MS = 10 * 60_000;

/**
 * Provider-agnostic orchestration for screenshot extraction — mirrors
 * lessonPlanService.ts: validates the request, applies rate limiting and
 * content-hash caching, then delegates to the provider.
 */
export async function extractLessonSource(
  provider: LessonAIProvider,
  input: ExtractSourceInput
): Promise<ExtractedSource> {
  if (!input.imageBase64) {
    throw new InvalidExtractionRequestError("No image was provided.");
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(input.mimeType as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw new InvalidExtractionRequestError(
      "Unsupported image type. Please upload a PNG, JPEG, or WebP image."
    );
  }

  const approximateBytes = (input.imageBase64.length * 3) / 4;
  if (approximateBytes > MAX_IMAGE_BYTES) {
    throw new InvalidExtractionRequestError(
      `That image is too large (max ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB).`
    );
  }

  checkRateLimit();

  const cacheKey = await hashContent(
    `${input.mode ?? "economical"}::${input.mimeType}::${input.imageBase64}`
  );
  return withCache(cacheKey, CACHE_TTL_MS, () => provider.extractSource(input));
}
