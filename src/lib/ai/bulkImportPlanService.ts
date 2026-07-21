import "server-only";

import { InvalidAiRequestError } from "@/lib/ai/errors";
import type { LessonAIProvider, PlanBulkImportInput } from "@/lib/ai/provider";
import { checkRateLimit } from "@/lib/ai/rateLimit";
import { hashContent, withCache } from "@/lib/cache/requestCache";
import type { BulkImportPlan } from "@/lib/schema/bulkImportPlan";

export class InvalidBulkImportRequestError extends InvalidAiRequestError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBulkImportRequestError";
  }
}

// Generous relative to a single lesson's 20,000-char cap, since this is
// meant for pasting several lessons' worth of material at once — but still
// bounded so one outline call can't run away in cost or latency.
const MAX_SOURCE_TEXT_LENGTH = 60_000;
const MAX_PROPOSED_LESSONS = 20;
const CACHE_TTL_MS = 10 * 60_000;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Provider-agnostic orchestration for the bulk-import outline pass —
 * mirrors lessonPlanService.ts. The one extra step beyond validation, rate
 * limiting, and caching: dropping any proposed lesson whose sourceText
 * isn't actually a verbatim excerpt of the original (whitespace differences
 * aside), since the prompt explicitly forbids paraphrasing but nothing
 * stops a model from doing it anyway — this is the same "never trust AI
 * output as-is" principle as toLessonPatch/toVisualBlockAssignment, applied
 * to plain text instead of structured parameters.
 */
export async function generateBulkImportPlan(
  provider: LessonAIProvider,
  input: PlanBulkImportInput
): Promise<BulkImportPlan> {
  const sourceText = input.sourceText.trim();

  if (!sourceText) {
    throw new InvalidBulkImportRequestError("Paste some text before importing.");
  }
  if (sourceText.length > MAX_SOURCE_TEXT_LENGTH) {
    throw new InvalidBulkImportRequestError(
      `That text is too long (max ${MAX_SOURCE_TEXT_LENGTH.toLocaleString()} characters) — try splitting it into smaller batches.`
    );
  }

  checkRateLimit();

  const cacheKey = await hashContent(`${input.mode ?? "economical"}::bulk::${sourceText}`);
  const plan = await withCache(cacheKey, CACHE_TTL_MS, () =>
    provider.planBulkImport({ ...input, sourceText })
  );

  const normalizedOriginal = normalizeWhitespace(sourceText);
  const verified = plan.lessons.filter((lesson) =>
    normalizedOriginal.includes(normalizeWhitespace(lesson.sourceText))
  );

  if (verified.length === 0) {
    throw new InvalidBulkImportRequestError(
      "The AI's proposed split didn't match the source text — please try again."
    );
  }

  return { lessons: verified.slice(0, MAX_PROPOSED_LESSONS) };
}
