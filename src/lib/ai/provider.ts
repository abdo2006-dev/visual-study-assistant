import type { EconomyMode } from "@/lib/ai/config";
import type { CondensedLesson } from "@/lib/lessonPatch/condenseLesson";
import type { VerificationLesson } from "@/lib/lessonPatch/condenseLessonForVerification";
import type { VisualPlanningLesson } from "@/lib/lessonPatch/condenseLessonForVisualPlanning";
import type { ExtractedSource } from "@/lib/schema/extraction";
import type { VisualLesson } from "@/lib/schema/lesson";
import type { LessonPatch } from "@/lib/schema/patch";
import type { LessonVerification } from "@/lib/schema/verification";
import type { VisualBlock } from "@/lib/schema/visualBlocks";

export interface CreateLessonPlanInput {
  sourceText: string;
  mode?: EconomyMode;
  signal?: AbortSignal;
}

export interface ExtractSourceImage {
  /** Base64 image data, without the "data:image/...;base64," prefix. */
  imageBase64: string;
  mimeType: string;
}

export interface ExtractSourceInput {
  /** One or more screenshots, in reading order (e.g. consecutive pages/slides). */
  images: ExtractSourceImage[];
  mode?: EconomyMode;
  signal?: AbortSignal;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ModifyLessonInput {
  lesson: CondensedLesson;
  message: string;
  history?: ChatTurn[];
  mode?: EconomyMode;
  signal?: AbortSignal;
}

export interface ModifyLessonResult {
  reply: string;
  patches: LessonPatch[];
}

export interface VerifyLessonInput {
  lesson: VerificationLesson;
  mode?: EconomyMode;
  signal?: AbortSignal;
}

export interface PlanVisualsInput {
  lesson: VisualPlanningLesson;
  mode?: EconomyMode;
  signal?: AbortSignal;
}

export interface VisualPlanAssignment {
  sectionId: string;
  visual: VisualBlock;
}

export interface VisualPlan {
  assignments: VisualPlanAssignment[];
}

/**
 * The app depends only on this interface for AI operations, never on
 * Gemini-specific types (see IMPLEMENTATION_PLAN.md section 6).
 */
export interface LessonAIProvider {
  createLessonPlan(input: CreateLessonPlanInput): Promise<VisualLesson>;
  extractSource(input: ExtractSourceInput): Promise<ExtractedSource>;
  modifyLesson(input: ModifyLessonInput): Promise<ModifyLessonResult>;
  verifyLesson(input: VerifyLessonInput): Promise<LessonVerification>;
  planVisuals(input: PlanVisualsInput): Promise<VisualPlan>;
}
