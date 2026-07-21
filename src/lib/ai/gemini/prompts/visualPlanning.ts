import { Type } from "@google/genai";
import { z } from "zod";

import type { VisualPlanningLesson } from "@/lib/lessonPatch/condenseLessonForVisualPlanning";
import { TEMPLATE_DESCRIPTIONS } from "@/lib/ai/gemini/prompts/templateDescriptions";
import { KNOWN_TEMPLATE_IDS } from "@/lib/schema/knownTemplateIds";
import { visualBlockTypeSchema } from "@/lib/schema/visualBlocks";

/**
 * Same parametersJson-string trick as lessonPatch.ts: Gemini's structured
 * output can't describe a truly heterogeneous "parameters" shape ahead of
 * time (it depends on whichever template gets picked per section), so it
 * travels as a JSON string here and gets parsed + validated against that
 * template's own schema afterward (see toVisualBlockAssignment.ts) — never
 * trusted as-is.
 */
export const visualPlanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    assignments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sectionId: { type: Type.STRING },
          type: { type: Type.STRING, enum: visualBlockTypeSchema.options },
          templateId: { type: Type.STRING, enum: KNOWN_TEMPLATE_IDS },
          title: { type: Type.STRING },
          educationalPurpose: { type: Type.STRING },
          accessibilityDescription: { type: Type.STRING },
          parametersJson: {
            type: Type.STRING,
            description:
              "A JSON-encoded object string containing ONLY the parameter fields you want to set for this templateId; omitted fields fall back to sensible defaults.",
          },
        },
        required: [
          "sectionId",
          "type",
          "templateId",
          "title",
          "educationalPurpose",
          "accessibilityDescription",
          "parametersJson",
        ],
      },
    },
  },
  required: ["assignments"],
};

const rawVisualAssignmentSchema = z.object({
  sectionId: z.string().min(1),
  type: z.string().min(1),
  templateId: z.string().min(1),
  title: z.string().min(1),
  educationalPurpose: z.string().min(1),
  accessibilityDescription: z.string().min(1),
  parametersJson: z.string().min(1),
});

export const aiVisualPlanSchema = z.object({
  assignments: z.array(rawVisualAssignmentSchema),
});

export type RawVisualAssignment = z.infer<typeof rawVisualAssignmentSchema>;
export type AiVisualPlan = z.infer<typeof aiVisualPlanSchema>;

const SYSTEM_INSTRUCTION = `You are choosing which sections of a study lesson would benefit from an interactive visual diagram, and configuring that diagram. The student specifically struggles to visualize abstract material, so lean toward attaching a visual whenever a listed template's physical/mathematical setup genuinely matches the section — cost is not a concern, so don't hold back just because a section seems minor. Skipping is still correct for sections a diagram can't meaningfully help with (pure definitions, historical asides, general commentary with no concrete quantity or process to depict).

Rules:
- At most one visual per section.
- Attach a visual whenever any listed template's setup genuinely matches the section's content — including as a general-purpose fallback (e.g. "coordinate-geometry" can plot an equation's shape or key variables even without a more specific template). Only skip a section when truly nothing listed fits, or the section has no concrete quantity/process/relationship to depict.
- Never invent a templateId, and never attach a template whose physical/mathematical setup doesn't actually match — a wrong-but-present visual is worse than none, so a genuine mismatch is the only reason to skip, not caution about frequency.
- sectionId must exactly match one of the section ids given below.
- parametersJson must be a JSON-encoded object string (e.g. "{\\"sphereType\\":\\"shell\\"}") using ONLY fields from that template's parameter shape — omit any field to accept its default. It must describe configuration (which variant, what to show, an initial value), never facts that could be wrong; all physics/math formulas are already hard-coded in the template itself.

Available templates:

${TEMPLATE_DESCRIPTIONS}

If truly no section warrants a visual, return an empty assignments array — but that should be rare. Output valid JSON matching the provided schema exactly, with no other text.`;

export function buildVisualPlanningPrompt(lesson: VisualPlanningLesson): string {
  return `${SYSTEM_INSTRUCTION}

Lesson (subject: ${lesson.subject}):
${JSON.stringify(lesson, null, 2)}`;
}
