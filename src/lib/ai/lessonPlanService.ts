import "server-only";

import { checkRateLimit } from "@/lib/ai/rateLimit";
import type { CreateLessonPlanInput, LessonAIProvider } from "@/lib/ai/provider";
import { hashContent, withCache } from "@/lib/cache/requestCache";
import type { VisualLesson } from "@/lib/schema/lesson";

export class InvalidLessonPlanRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLessonPlanRequestError";
  }
}

const MAX_SOURCE_TEXT_LENGTH = 20_000;
const CACHE_TTL_MS = 10 * 60_000;

/**
 * Provider-agnostic orchestration: validates the request, applies rate
 * limiting and content-hash caching, then delegates to whichever
 * LessonAIProvider is passed in. The route wires up the real GeminiProvider;
 * tests pass a fake one.
 */
export async function generateLessonPlan(
  provider: LessonAIProvider,
  input: CreateLessonPlanInput
): Promise<VisualLesson> {
  const sourceText = input.sourceText.trim();

  if (!sourceText) {
    throw new InvalidLessonPlanRequestError(
      "Paste some text before generating a lesson."
    );
  }
  if (sourceText.length > MAX_SOURCE_TEXT_LENGTH) {
    throw new InvalidLessonPlanRequestError(
      `That text is too long (max ${MAX_SOURCE_TEXT_LENGTH.toLocaleString()} characters).`
    );
  }

  checkRateLimit();

  const cacheKey = await hashContent(`${input.mode ?? "economical"}::${sourceText}`);
  return withCache(cacheKey, CACHE_TTL_MS, () =>
    provider.createLessonPlan({ ...input, sourceText })
  );
}
