import "server-only";

import { assembleLesson } from "@/lib/ai/assembleLesson";
import { getModelFor } from "@/lib/ai/config";
import { getGeminiClient } from "@/lib/ai/gemini/client";
import { AiGenerationError, generateWithRepair } from "@/lib/ai/gemini/generateWithRepair";
import {
  buildExtractionParts,
  extractionResponseSchema,
} from "@/lib/ai/gemini/prompts/extraction";
import {
  buildLessonPatchPrompt,
  lessonPatchAiResponseSchema,
  lessonPatchResponseSchema,
} from "@/lib/ai/gemini/prompts/lessonPatch";
import {
  aiLessonPlanSchema,
  buildLessonPlanPrompt,
  lessonPlanResponseSchema,
} from "@/lib/ai/gemini/prompts/lessonPlan";
import {
  aiVerificationSchema,
  buildVerificationPrompt,
  verificationResponseSchema,
} from "@/lib/ai/gemini/prompts/verification";
import {
  aiVisualPlanSchema,
  buildVisualPlanningPrompt,
  visualPlanResponseSchema,
} from "@/lib/ai/gemini/prompts/visualPlanning";
import { toLessonPatch } from "@/lib/ai/gemini/toLessonPatch";
import { toVisualBlockAssignment } from "@/lib/ai/gemini/toVisualBlockAssignment";
import type {
  CreateLessonPlanInput,
  ExtractSourceInput,
  LessonAIProvider,
  ModifyLessonInput,
  ModifyLessonResult,
  PlanVisualsInput,
  VerifyLessonInput,
  VisualPlan,
  VisualPlanAssignment,
} from "@/lib/ai/provider";
import { extractedSourceSchema } from "@/lib/schema/extraction";
import type { ExtractedSource } from "@/lib/schema/extraction";
import type { VisualLesson } from "@/lib/schema/lesson";
import type { LessonPatch } from "@/lib/schema/patch";
import type { LessonVerification } from "@/lib/schema/verification";

export { AiGenerationError };

export class GeminiProvider implements LessonAIProvider {
  async createLessonPlan({
    sourceText,
    mode = "economical",
    signal,
  }: CreateLessonPlanInput): Promise<VisualLesson> {
    const client = getGeminiClient();
    const model = getModelFor(mode);

    const plan = await generateWithRepair({
      client,
      model,
      schema: aiLessonPlanSchema,
      responseSchema: lessonPlanResponseSchema,
      initialParts: [{ text: buildLessonPlanPrompt(sourceText) }],
      signal,
    });

    return assembleLesson(plan, { kind: "pasted-text", originalText: sourceText });
  }

  async extractSource({
    images,
    mode = "economical",
    signal,
  }: ExtractSourceInput): Promise<ExtractedSource> {
    const client = getGeminiClient();
    const model = getModelFor(mode);

    return generateWithRepair({
      client,
      model,
      schema: extractedSourceSchema,
      responseSchema: extractionResponseSchema,
      initialParts: buildExtractionParts(images),
      signal,
    });
  }

  async modifyLesson({
    lesson,
    message,
    history = [],
    mode = "economical",
    signal,
  }: ModifyLessonInput): Promise<ModifyLessonResult> {
    const client = getGeminiClient();
    const model = getModelFor(mode);

    const aiResponse = await generateWithRepair({
      client,
      model,
      schema: lessonPatchAiResponseSchema,
      responseSchema: lessonPatchResponseSchema,
      initialParts: [{ text: buildLessonPatchPrompt(lesson, message, history) }],
      signal,
    });

    const patches = aiResponse.patches
      .map(toLessonPatch)
      .filter((patch): patch is LessonPatch => patch !== null);

    return { reply: aiResponse.reply, patches };
  }

  async verifyLesson({
    lesson,
    mode = "economical",
    signal,
  }: VerifyLessonInput): Promise<LessonVerification> {
    const client = getGeminiClient();
    const model = getModelFor(mode);

    const aiResponse = await generateWithRepair({
      client,
      model,
      schema: aiVerificationSchema,
      responseSchema: verificationResponseSchema,
      initialParts: [{ text: buildVerificationPrompt(lesson) }],
      signal,
    });

    return {
      checkedAt: new Date().toISOString(),
      summary: aiResponse.summary,
      issues: aiResponse.issues,
    };
  }

  async planVisuals({ lesson, mode = "economical", signal }: PlanVisualsInput): Promise<VisualPlan> {
    const client = getGeminiClient();
    const model = getModelFor(mode);

    const aiResponse = await generateWithRepair({
      client,
      model,
      schema: aiVisualPlanSchema,
      responseSchema: visualPlanResponseSchema,
      initialParts: [{ text: buildVisualPlanningPrompt(lesson) }],
      signal,
    });

    const assignments = aiResponse.assignments
      .map(toVisualBlockAssignment)
      .filter((assignment): assignment is VisualPlanAssignment => assignment !== null);

    return { assignments };
  }
}
