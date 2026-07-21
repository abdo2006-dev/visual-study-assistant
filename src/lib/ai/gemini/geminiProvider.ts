import "server-only";

import { assembleLesson } from "@/lib/ai/assembleLesson";
import { getModelFor } from "@/lib/ai/config";
import { getGeminiClient } from "@/lib/ai/gemini/client";
import { AiGenerationError, generateWithRepair } from "@/lib/ai/gemini/generateWithRepair";
import {
  EXTRACTION_PROMPT,
  extractionResponseSchema,
} from "@/lib/ai/gemini/prompts/extraction";
import {
  aiLessonPlanSchema,
  buildLessonPlanPrompt,
  lessonPlanResponseSchema,
} from "@/lib/ai/gemini/prompts/lessonPlan";
import type {
  CreateLessonPlanInput,
  ExtractSourceInput,
  LessonAIProvider,
} from "@/lib/ai/provider";
import { extractedSourceSchema } from "@/lib/schema/extraction";
import type { ExtractedSource } from "@/lib/schema/extraction";
import type { VisualLesson } from "@/lib/schema/lesson";

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
    imageBase64,
    mimeType,
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
      initialParts: [
        { inlineData: { mimeType, data: imageBase64 } },
        { text: EXTRACTION_PROMPT },
      ],
      signal,
    });
  }
}
