import type { EconomyMode } from "@/lib/ai/config";
import type { ExtractedSource } from "@/lib/schema/extraction";
import type { VisualLesson } from "@/lib/schema/lesson";

export interface CreateLessonPlanInput {
  sourceText: string;
  mode?: EconomyMode;
  signal?: AbortSignal;
}

export interface ExtractSourceInput {
  /** Base64 image data, without the "data:image/...;base64," prefix. */
  imageBase64: string;
  mimeType: string;
  mode?: EconomyMode;
  signal?: AbortSignal;
}

/**
 * The app depends only on this interface for AI operations, never on
 * Gemini-specific types (see IMPLEMENTATION_PLAN.md section 6). Methods are
 * added as the milestone that needs them lands — `modifyLesson`
 * (Milestone 7), `verifyLesson` (Milestone 8).
 */
export interface LessonAIProvider {
  createLessonPlan(input: CreateLessonPlanInput): Promise<VisualLesson>;
  extractSource(input: ExtractSourceInput): Promise<ExtractedSource>;
}
