import "server-only";

import type { EconomyMode } from "@/lib/ai/config";
import { InvalidAiRequestError } from "@/lib/ai/errors";
import type { CreateLessonPlanInput, LessonAIProvider } from "@/lib/ai/provider";
import { checkRateLimit } from "@/lib/ai/rateLimit";
import { hashContent, withCache } from "@/lib/cache/requestCache";
import { condenseLessonForVisualPlanning } from "@/lib/lessonPatch/condenseLessonForVisualPlanning";
import type { VisualLesson } from "@/lib/schema/lesson";
import type { VisualBlock } from "@/lib/schema/visualBlocks";

export class InvalidLessonPlanRequestError extends InvalidAiRequestError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLessonPlanRequestError";
  }
}

const MAX_SOURCE_TEXT_LENGTH = 20_000;
const MAX_INSTRUCTIONS_LENGTH = 500;
const CACHE_TTL_MS = 10 * 60_000;

// Vercel's Hobby plan caps a serverless function's total run time at 60s
// (see route.ts's `maxDuration`), and lesson planning is two sequential
// Gemini calls (createLessonPlan, then planVisuals) inside that one
// request. REQUEST_BUDGET_MS leaves a safety margin under that hard
// ceiling for the response to actually get serialized and sent; if
// planning the lesson's text already ate most of that budget, visual
// planning gets whatever's left rather than a fixed share, and is skipped
// outright below MIN_VISUAL_PLANNING_BUDGET_MS — a lesson with no visual
// beats the whole request timing out with nothing at all.
const REQUEST_BUDGET_MS = 55_000;
const MIN_VISUAL_PLANNING_BUDGET_MS = 5_000;

export interface GenerateLessonPlanOptions {
  /**
   * Called synchronously at each phase boundary so the route can stream a
   * live status to the client instead of leaving it staring at a spinner
   * for the whole (often 10-20s) round trip. Never called for a cache hit,
   * since that resolves near-instantly and has nothing to narrate.
   */
  onProgress?: (message: string) => void;
}

/**
 * Provider-agnostic orchestration: validates the request, applies rate
 * limiting and content-hash caching, then delegates to whichever
 * LessonAIProvider is passed in. The route wires up the real GeminiProvider;
 * tests pass a fake one.
 */
export async function generateLessonPlan(
  provider: LessonAIProvider,
  input: CreateLessonPlanInput,
  { onProgress }: GenerateLessonPlanOptions = {}
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
  const instructions = input.instructions?.trim() || undefined;
  if (instructions && instructions.length > MAX_INSTRUCTIONS_LENGTH) {
    throw new InvalidLessonPlanRequestError(
      `Instructions are too long (max ${MAX_INSTRUCTIONS_LENGTH.toLocaleString()} characters).`
    );
  }

  checkRateLimit();

  const cacheKey = await hashContent(
    `${input.mode ?? "balanced"}::${instructions ?? ""}::${sourceText}`
  );
  return withCache(cacheKey, CACHE_TTL_MS, async () => {
    const startedAt = Date.now();
    onProgress?.("Reading your text and drafting sections...");
    const lesson = await provider.createLessonPlan({ ...input, sourceText, instructions });
    onProgress?.("Choosing visuals for each section...");
    const remainingBudgetMs = REQUEST_BUDGET_MS - (Date.now() - startedAt);
    return attachPlannedVisuals(provider, lesson, input.mode, input.signal, remainingBudgetMs);
  });
}

/**
 * Best-effort: a lesson is fully usable with no visuals (that's exactly
 * today's behavior), so a visual-planning failure — rate limit, timeout,
 * malformed AI output that survives generateWithRepair's one retry, or
 * simply running out of the request's remaining time budget — must never
 * fail lesson generation itself. Any error here is swallowed (after
 * logging) and the lesson is returned exactly as createLessonPlan produced
 * it.
 */
export async function attachPlannedVisuals(
  provider: LessonAIProvider,
  lesson: VisualLesson,
  mode: EconomyMode | undefined,
  signal: AbortSignal | undefined,
  budgetMs: number
): Promise<VisualLesson> {
  if (budgetMs < MIN_VISUAL_PLANNING_BUDGET_MS) {
    console.error(
      `[visual-planning] skipped — only ${budgetMs}ms left in the request budget, lesson will have no visuals`
    );
    return lesson;
  }

  try {
    const visualPlanningSignal = AbortSignal.timeout(budgetMs);
    const combinedSignal = signal
      ? AbortSignal.any([signal, visualPlanningSignal])
      : visualPlanningSignal;

    const { assignments } = await provider.planVisuals({
      lesson: condenseLessonForVisualPlanning(lesson),
      mode,
      signal: combinedSignal,
    });

    if (assignments.length === 0) return lesson;

    const visualBySectionId = new Map<string, VisualBlock>();
    for (const assignment of assignments) {
      if (!visualBySectionId.has(assignment.sectionId)) {
        visualBySectionId.set(assignment.sectionId, assignment.visual);
      }
    }

    return {
      ...lesson,
      sections: lesson.sections.map((section) => {
        const visual = visualBySectionId.get(section.id);
        if (!visual) return section;
        return {
          ...section,
          visuals: [{ ...visual, sourceSectionId: section.id }],
        };
      }),
    };
  } catch (err) {
    console.error("[visual-planning] failed, lesson will have no visuals", err);
    return lesson;
  }
}
