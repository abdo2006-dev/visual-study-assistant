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
  return withCache(cacheKey, CACHE_TTL_MS, async () => {
    const lesson = await provider.createLessonPlan({ ...input, sourceText });
    return attachPlannedVisuals(provider, lesson, input.mode, input.signal);
  });
}

/**
 * Best-effort: a lesson is fully usable with no visuals (that's exactly
 * today's behavior), so a visual-planning failure — rate limit, timeout,
 * malformed AI output that survives generateWithRepair's one retry — must
 * never fail lesson generation itself. Any error here is swallowed (after
 * logging) and the lesson is returned exactly as createLessonPlan produced
 * it.
 */
async function attachPlannedVisuals(
  provider: LessonAIProvider,
  lesson: VisualLesson,
  mode: EconomyMode | undefined,
  signal: AbortSignal | undefined
): Promise<VisualLesson> {
  try {
    const { assignments } = await provider.planVisuals({
      lesson: condenseLessonForVisualPlanning(lesson),
      mode,
      signal,
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
