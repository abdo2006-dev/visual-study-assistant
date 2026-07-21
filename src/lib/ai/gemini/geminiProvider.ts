import "server-only";

import { assembleLesson } from "@/lib/ai/assembleLesson";
import { getModelFor } from "@/lib/ai/config";
import { getGeminiClient } from "@/lib/ai/gemini/client";
import { parseStructuredJson } from "@/lib/ai/gemini/jsonRepair";
import {
  aiLessonPlanSchema,
  buildLessonPlanPrompt,
  lessonPlanResponseSchema,
} from "@/lib/ai/gemini/prompts/lessonPlan";
import type { CreateLessonPlanInput, LessonAIProvider } from "@/lib/ai/provider";
import type { VisualLesson } from "@/lib/schema/lesson";

export class LessonPlanGenerationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LessonPlanGenerationError";
  }
}

async function generateJson(
  client: ReturnType<typeof getGeminiClient>,
  model: string,
  prompt: string,
  signal?: AbortSignal
): Promise<string> {
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: lessonPlanResponseSchema,
      abortSignal: signal,
    },
  });

  const text = response.text;
  if (!text) {
    throw new LessonPlanGenerationError("Gemini returned an empty response.");
  }
  return text;
}

export class GeminiProvider implements LessonAIProvider {
  async createLessonPlan({
    sourceText,
    mode = "economical",
    signal,
  }: CreateLessonPlanInput): Promise<VisualLesson> {
    const client = getGeminiClient();
    const model = getModelFor(mode);
    const prompt = buildLessonPlanPrompt(sourceText);

    const firstAttempt = await generateJson(client, model, prompt, signal);
    const firstResult = parseStructuredJson(firstAttempt, aiLessonPlanSchema);
    if (firstResult.success) {
      return assembleLesson(firstResult.data, {
        kind: "pasted-text",
        originalText: sourceText,
      });
    }

    // One repair attempt: re-prompt with the validation error so Gemini can
    // fix its own output, rather than failing the user's request outright.
    const repairPrompt = `${prompt}\n\nYour previous response was invalid: ${firstResult.error}\n\nPrevious response:\n${firstAttempt}\n\nReturn corrected JSON matching the schema exactly, with no other text.`;
    const secondAttempt = await generateJson(client, model, repairPrompt, signal);
    const secondResult = parseStructuredJson(secondAttempt, aiLessonPlanSchema);
    if (secondResult.success) {
      return assembleLesson(secondResult.data, {
        kind: "pasted-text",
        originalText: sourceText,
      });
    }

    throw new LessonPlanGenerationError(
      `Gemini did not return a valid lesson plan after a repair attempt: ${secondResult.error}`
    );
  }
}
