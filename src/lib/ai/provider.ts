import type { EconomyMode } from "@/lib/ai/config";
import type { VisualLesson } from "@/lib/schema/lesson";

export interface CreateLessonPlanInput {
  sourceText: string;
  mode?: EconomyMode;
  signal?: AbortSignal;
}

/**
 * The app depends only on this interface for AI operations, never on
 * Gemini-specific types (see IMPLEMENTATION_PLAN.md section 6). Methods are
 * added as the milestone that needs them lands — `extractSource`
 * (Milestone 4), `modifyLesson` (Milestone 7), `verifyLesson` (Milestone 8).
 */
export interface LessonAIProvider {
  createLessonPlan(input: CreateLessonPlanInput): Promise<VisualLesson>;
}
