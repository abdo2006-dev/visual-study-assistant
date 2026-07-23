import "server-only";

import type { GoogleGenAI, Modality } from "@google/genai";

import { assembleLesson } from "@/lib/ai/assembleLesson";
import { geminiImageGenerationModel, getModelFor } from "@/lib/ai/config";
import { getGeminiClient } from "@/lib/ai/gemini/client";
import { AiGenerationError, generateWithRepair } from "@/lib/ai/gemini/generateWithRepair";
import { recordGeminiUsage } from "@/lib/ai/usageContext";
import {
  aiBulkImportPlanSchema,
  buildBulkImportPlanPrompt,
  bulkImportPlanResponseSchema,
} from "@/lib/ai/gemini/prompts/bulkImportPlan";
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
  PlanBulkImportInput,
  PlanVisualsInput,
  VerifyLessonInput,
  VisualPlan,
  VisualPlanAssignment,
} from "@/lib/ai/provider";
import type { BulkImportPlan } from "@/lib/schema/bulkImportPlan";
import { extractedSourceSchema } from "@/lib/schema/extraction";
import type { ExtractedSource } from "@/lib/schema/extraction";
import type { VisualLesson } from "@/lib/schema/lesson";
import type { LessonPatch } from "@/lib/schema/patch";
import type { LessonVerification } from "@/lib/schema/verification";

export { AiGenerationError };

const IMAGE_RESPONSE_MODALITIES = ["TEXT", "IMAGE"] as unknown as Modality[];
const GENERATED_ILLUSTRATION_TEMPLATE_ID = "generated-illustration";

export class GeminiProvider implements LessonAIProvider {
  async createLessonPlan({
    sourceText,
    instructions,
    mode = "balanced",
    signal,
  }: CreateLessonPlanInput): Promise<VisualLesson> {
    const client = getGeminiClient();
    const model = getModelFor(mode);

    const plan = await generateWithRepair({
      client,
      model,
      schema: aiLessonPlanSchema,
      responseSchema: lessonPlanResponseSchema,
      initialParts: [{ text: buildLessonPlanPrompt(sourceText, instructions) }],
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
    mode = "balanced",
    signal,
    onProgress,
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
      onProgress,
    });

    const patches = aiResponse.patches
      .map(toLessonPatch)
      .filter((patch): patch is LessonPatch => patch !== null);

    const materializedPatches = await materializeGeneratedIllustrationPatches(
      client,
      patches,
      signal,
      onProgress
    );

    return { reply: aiResponse.reply, patches: materializedPatches };
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

  async planVisuals({ lesson, mode = "balanced", signal }: PlanVisualsInput): Promise<VisualPlan> {
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

    return {
      assignments: await materializeGeneratedIllustrationAssignments(
        client,
        assignments,
        signal
      ),
    };
  }

  async planBulkImport({
    sourceText,
    mode = "economical",
    signal,
  }: PlanBulkImportInput): Promise<BulkImportPlan> {
    const client = getGeminiClient();
    const model = getModelFor(mode);

    return generateWithRepair({
      client,
      model,
      schema: aiBulkImportPlanSchema,
      responseSchema: bulkImportPlanResponseSchema,
      initialParts: [{ text: buildBulkImportPlanPrompt(sourceText) }],
      signal,
    });
  }
}

async function materializeGeneratedIllustrationPatches(
  client: GoogleGenAI,
  patches: LessonPatch[],
  signal?: AbortSignal,
  onProgress?: (message: string) => void
): Promise<LessonPatch[]> {
  const materialized: LessonPatch[] = [];

  for (const patch of patches) {
    if (patch.op !== "add-visual" || patch.templateId !== GENERATED_ILLUSTRATION_TEMPLATE_ID) {
      materialized.push(patch);
      continue;
    }

    const imagePrompt = getImagePrompt(patch.parameters);
    if (!imagePrompt) continue;

    onProgress?.("Generating a custom visual image...");
    const image = await generateEducationalImage(client, imagePrompt, signal);
    materialized.push({
      ...patch,
      parameters: {
        ...patch.parameters,
        imageDataUrl: image.dataUrl,
        mimeType: image.mimeType,
      },
    });
  }

  return materialized;
}

async function materializeGeneratedIllustrationAssignments(
  client: GoogleGenAI,
  assignments: VisualPlanAssignment[],
  signal?: AbortSignal
): Promise<VisualPlanAssignment[]> {
  const materialized: VisualPlanAssignment[] = [];

  for (const assignment of assignments) {
    if (assignment.visual.templateId !== GENERATED_ILLUSTRATION_TEMPLATE_ID) {
      materialized.push(assignment);
      continue;
    }

    const imagePrompt = getImagePrompt(assignment.visual.parameters);
    if (!imagePrompt) continue;

    try {
      const image = await generateEducationalImage(client, imagePrompt, signal);
      materialized.push({
        ...assignment,
        visual: {
          ...assignment.visual,
          parameters: {
            ...assignment.visual.parameters,
            imageDataUrl: image.dataUrl,
            mimeType: image.mimeType,
          },
        },
      });
    } catch (err) {
      console.error("[visual-image-generation] failed, dropping generated illustration", err);
    }
  }

  return materialized;
}

function getImagePrompt(parameters: Record<string, unknown>): string | null {
  const imagePrompt = parameters.imagePrompt;
  return typeof imagePrompt === "string" && imagePrompt.trim().length >= 20
    ? buildEducationalImagePrompt(imagePrompt.trim())
    : null;
}

function buildEducationalImagePrompt(imagePrompt: string): string {
  return `Create a clear instructional science-study illustration for a lesson.

Requirements:
- Make the visual directly explain the requested concept, not a generic diagram.
- Use clean textbook-style composition with high contrast and readable labels.
- Prefer arrows, before/after panels, callouts, and simple symbolic objects over decorative art.
- Include only short labels; avoid paragraphs of text inside the image.
- Do not add unrelated apparatus, extra equations, or invented facts.

Concept to visualize:
${imagePrompt}`;
}

async function generateEducationalImage(
  client: GoogleGenAI,
  imagePrompt: string,
  signal?: AbortSignal
): Promise<{ dataUrl: string; mimeType: string }> {
  const response = await client.models.generateContent({
    model: geminiImageGenerationModel,
    contents: imagePrompt,
    config: {
      responseModalities: IMAGE_RESPONSE_MODALITIES,
      abortSignal: signal,
    },
  });

  const usage = response.usageMetadata;
  recordGeminiUsage({
    model: geminiImageGenerationModel,
    promptTokens: usage?.promptTokenCount ?? 0,
    candidatesTokens: usage?.candidatesTokenCount ?? 0,
    thoughtsTokens: usage?.thoughtsTokenCount ?? 0,
    totalTokens: usage?.totalTokenCount ?? 0,
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find(
    (part) => part.inlineData?.data && part.inlineData.mimeType?.startsWith("image/")
  );
  const data = imagePart?.inlineData?.data;
  const mimeType = imagePart?.inlineData?.mimeType;

  if (!data || !mimeType) {
    throw new AiGenerationError("Gemini did not return an image for that visual.");
  }

  return { dataUrl: `data:${mimeType};base64,${data}`, mimeType };
}
