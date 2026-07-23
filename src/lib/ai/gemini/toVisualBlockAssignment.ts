import type { RawVisualAssignment } from "@/lib/ai/gemini/prompts/visualPlanning";
import { templateParamsSchemas } from "@/lib/schema/templates/templateParamsSchemas";
import { visualBlockTypeSchema, type VisualBlock } from "@/lib/schema/visualBlocks";

export interface VisualAssignment {
  sectionId: string;
  visual: VisualBlock;
}

/**
 * Narrows Gemini's flat visual-plan envelope down to a real VisualBlock,
 * expanding `parametersJson` and validating it against that specific
 * template's own parameter schema (never trusted as-is — same principle as
 * VisualBlockRenderer, just applied at generation time instead of render
 * time). Returns null for anything that doesn't validate — an unknown
 * templateId, malformed JSON, or parameters that fail that template's
 * schema — so one bad assignment doesn't affect the rest of the lesson.
 */
export function toVisualBlockAssignment(raw: RawVisualAssignment): VisualAssignment | null {
  const typeResult = visualBlockTypeSchema.safeParse(raw.type);
  if (!typeResult.success) return null;

  const paramsSchema = templateParamsSchemas[raw.templateId];
  if (!paramsSchema) return null;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw.parametersJson);
  } catch {
    return null;
  }

  const paramsResult = paramsSchema.safeParse(parsedJson);
  if (!paramsResult.success) return null;

  const visual: VisualBlock = {
    id: crypto.randomUUID(),
    type: typeResult.data,
    templateId: raw.templateId,
    title: raw.title,
    educationalPurpose: raw.educationalPurpose,
    accessibilityDescription: raw.accessibilityDescription,
    parameters: paramsResult.data as Record<string, unknown>,
    controls: [],
    annotations: [],
    factualChecks: [],
    generationStatus:
      raw.templateId === "generated-illustration" &&
      typeof (paramsResult.data as Record<string, unknown>).imageDataUrl !== "string"
        ? "pending"
        : "ready",
  };

  return { sectionId: raw.sectionId, visual };
}
