import type { EconomyMode } from "@/lib/ai/config";
import type { CondensedLesson } from "@/lib/lessonPatch/condenseLesson";
import type { VerificationLesson } from "@/lib/lessonPatch/condenseLessonForVerification";
import type { ExtractedSource } from "@/lib/schema/extraction";
import type { VisualLesson } from "@/lib/schema/lesson";
import type { LessonPatch } from "@/lib/schema/patch";
import type { LessonVerification } from "@/lib/schema/verification";

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

/**
 * The app depends only on this interface for AI operations, never on
 * Gemini-specific types (see IMPLEMENTATION_PLAN.md section 6).
 */
export interface LessonAIProvider {
  createLessonPlan(input: CreateLessonPlanInput): Promise<VisualLesson>;
  extractSource(input: ExtractSourceInput): Promise<ExtractedSource>;
  modifyLesson(input: ModifyLessonInput): Promise<ModifyLessonResult>;
  verifyLesson(input: VerifyLessonInput): Promise<LessonVerification>;
}
