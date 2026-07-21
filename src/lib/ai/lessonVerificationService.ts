import "server-only";

import { InvalidAiRequestError } from "@/lib/ai/errors";
import type { LessonAIProvider, VerifyLessonInput } from "@/lib/ai/provider";
import { checkRateLimit } from "@/lib/ai/rateLimit";
import { hashContent, withCache } from "@/lib/cache/requestCache";
import type { LessonVerification } from "@/lib/schema/verification";

export class InvalidVerificationRequestError extends InvalidAiRequestError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidVerificationRequestError";
  }
}

const CACHE_TTL_MS = 10 * 60_000;

/**
 * Provider-agnostic orchestration for the advisory verification pass.
 * Cached by content hash — unlike lesson-patch, verifying doesn't mutate
 * anything, so a repeated check of unchanged content is safe (and
 * desirable, per IMPLEMENTATION_PLAN.md section 18 cost control) to reuse.
 */
export async function verifyLesson(
  provider: LessonAIProvider,
  input: VerifyLessonInput
): Promise<LessonVerification> {
  if (input.lesson.sections.length === 0) {
    throw new InvalidVerificationRequestError("This lesson has no sections to check.");
  }

  checkRateLimit();

  const cacheKey = await hashContent(
    `${input.mode ?? "economical"}::${JSON.stringify(input.lesson)}`
  );
  return withCache(cacheKey, CACHE_TTL_MS, () => provider.verifyLesson(input));
}
