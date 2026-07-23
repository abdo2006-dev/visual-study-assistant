import "server-only";

import { assembleLesson } from "@/lib/ai/assembleLesson";
import { getModelFor } from "@/lib/ai/config";
import { getGeminiClient } from "@/lib/ai/gemini/client";
import { AiGenerationError, generateWithRepair } from "@/lib/ai/gemini/generateWithRepair";
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
    mode = "economical",
    signal,
    onProgress,
  }: ModifyLessonInput): Promise<ModifyLessonResult> {
    const directVisualReplacement = buildDirectGeneratedVisualReplacement(lesson, message);
    if (directVisualReplacement) return directVisualReplacement;

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

    return {
      reply: aiResponse.reply,
      patches: addMissingVisualReplacementPatches({
        lesson,
        message,
        patches,
      }),
    };
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

    return { assignments };
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

function buildDirectGeneratedVisualReplacement(
  lesson: ModifyLessonInput["lesson"],
  message: string
): ModifyLessonResult | null {
  if (!isExplicitGeneratedVisualReplacementRequest(message)) return null;

  const targetSections = findVisualReplacementTargets(lesson, message);
  if (targetSections.length === 0) return null;

  const patches = targetSections.flatMap((section): LessonPatch[] => [
    ...section.visuals.map((visual) => ({
      op: "remove-visual" as const,
      sectionId: section.id,
      visualId: visual.id,
    })),
    buildGeneratedIllustrationPatch(lesson.title, section, message),
  ]);

  return {
    reply: `I queued generated illustrations to replace the repeated visuals in ${targetSections.length} section${targetSections.length === 1 ? "" : "s"}.`,
    patches,
  };
}

function addMissingVisualReplacementPatches({
  lesson,
  message,
  patches,
}: {
  lesson: ModifyLessonInput["lesson"];
  message: string;
  patches: LessonPatch[];
}): LessonPatch[] {
  if (!isVisualReplacementRequest(message)) return patches;

  const sectionsWithAdditions = new Set(
    patches
      .filter((patch) => patch.op === "add-visual")
      .map((patch) => patch.sectionId)
  );
  const removedSectionIds = patches
    .filter((patch) => patch.op === "remove-visual")
    .map((patch) => patch.sectionId);

  const backfilledPatches = removedSectionIds.flatMap((sectionId): LessonPatch[] => {
    if (sectionsWithAdditions.has(sectionId)) return [];

    const section = lesson.sections.find((candidate) => candidate.id === sectionId);
    if (!section) return [];

    sectionsWithAdditions.add(sectionId);
    return [buildGeneratedIllustrationPatch(lesson.title, section, message)];
  });

  return backfilledPatches.length > 0 ? [...patches, ...backfilledPatches] : patches;
}

function isVisualReplacementRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  const mentionsVisual =
    /\b(visual|visuals|diagram|diagrams|image|images|picture|pictures|illustration|illustrations|slider|sliders|simulation|simulations)\b/.test(
      normalized
    );
  const asksForReplacement =
    /\b(replace|fix|change|update|redo|regenerate|wrong|unrelated|repeated|duplicate|same exact|not related|poor)\b/.test(
      normalized
    );

  return mentionsVisual && asksForReplacement;
}

function isExplicitGeneratedVisualReplacementRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  const asksForGeneratedImage =
    /\b(generated|actual image|actual images|image|images|picture|pictures|illustration|illustrations)\b/.test(
      normalized
    );

  return asksForGeneratedImage && isVisualReplacementRequest(message);
}

function findVisualReplacementTargets(
  lesson: ModifyLessonInput["lesson"],
  message: string
): ModifyLessonInput["lesson"]["sections"] {
  const sectionsWithVisuals = lesson.sections.filter((section) => section.visuals.length > 0);
  if (sectionsWithVisuals.length === 0) return [];

  const normalized = message.toLowerCase();
  const explicitlyBroad = /\b(all|each|every|repeated|duplicate|same exact)\b/.test(
    normalized
  );
  if (explicitlyBroad) {
    const repeatedTemplateIds = new Set(
      [...countVisualTemplates(sectionsWithVisuals).entries()]
        .filter(([, count]) => count > 1)
        .map(([templateId]) => templateId)
    );

    const repeatedSections =
      repeatedTemplateIds.size > 0
        ? sectionsWithVisuals.filter((section) =>
            section.visuals.some((visual) => repeatedTemplateIds.has(visual.templateId))
          )
        : sectionsWithVisuals;
    return repeatedSections;
  }

  const headingMatches = sectionsWithVisuals.filter((section) => {
    const heading = section.heading?.trim().toLowerCase();
    return heading ? normalized.includes(heading) : false;
  });
  if (headingMatches.length > 0) return headingMatches;

  return sectionsWithVisuals.length === 1 ? sectionsWithVisuals : [];
}

function countVisualTemplates(
  sections: ModifyLessonInput["lesson"]["sections"]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const section of sections) {
    for (const visual of section.visuals) {
      counts.set(visual.templateId, (counts.get(visual.templateId) ?? 0) + 1);
    }
  }
  return counts;
}

function buildGeneratedIllustrationPatch(
  lessonTitle: string,
  section: ModifyLessonInput["lesson"]["sections"][number],
  message: string
): LessonPatch {
  const heading = section.heading?.trim() || "this section";
  const explanation = section.simplifiedExplanation.trim();

  return {
    op: "add-visual",
    sectionId: section.id,
    type: "generated-illustration",
    templateId: "generated-illustration",
    title: `${heading} illustration`,
    educationalPurpose: `Replace the repeated generic visual with a concept-specific image for ${heading}.`,
    accessibilityDescription: `A generated instructional illustration explaining ${heading}.`,
    parameters: {
      imagePrompt: [
        `Create one clear textbook-style science illustration for the lesson "${lessonTitle}", section "${heading}".`,
        `It must explain this exact section: ${explanation}`,
        `Student request: ${message}`,
        "Do not draw an interactive slider or reuse a generic capacitor field simulation.",
        "Use short labels, arrows, before/after panels, and callouts only where they directly clarify the concept.",
      ].join(" "),
      caption: `Generated illustration for ${heading}.`,
    },
  };
}
