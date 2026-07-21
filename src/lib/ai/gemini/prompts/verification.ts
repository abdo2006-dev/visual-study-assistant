import { Type } from "@google/genai";
import { z } from "zod";

import type { VerificationLesson } from "@/lib/lessonPatch/condenseLessonForVerification";
import { verificationIssueCategorySchema } from "@/lib/schema/verification";

export const verificationResponseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "One or two sentences on the overall check, shown to the user.",
    },
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            enum: [...verificationIssueCategorySchema.options],
          },
          description: { type: Type.STRING },
          sectionId: { type: Type.STRING },
          equationId: { type: Type.STRING },
          visualId: { type: Type.STRING },
        },
        required: ["category", "description"],
      },
    },
  },
  required: ["summary", "issues"],
};

export const aiVerificationSchema = z.object({
  summary: z.string().min(1),
  issues: z.array(
    z.object({
      category: verificationIssueCategorySchema,
      description: z.string().min(1),
      sectionId: z.string().optional(),
      equationId: z.string().optional(),
      visualId: z.string().optional(),
    })
  ),
});

export type AiVerification = z.infer<typeof aiVerificationSchema>;

const SYSTEM_INSTRUCTION = `You are proofreading a study lesson for consistency, not grading its pedagogy.

For each section, compare its sourceText, simplifiedExplanation, equations, and visuals against each other, and flag ONLY concrete inconsistencies, using one of these categories:
- unsupported-label: the explanation, an equation, or a visual references something (a term, a quantity, a label) that never appears in the sourceText and isn't standard, well-established knowledge about the topic.
- conflicting-direction: two parts of the section disagree about a direction (e.g. a field pointing inward vs. outward, current direction, propagation direction).
- incorrect-sign: a sign (positive/negative, increasing/decreasing) is inconsistent between the explanation and an equation or visual.
- missing-boundary: a condition or boundary the sourceText describes (e.g. "for r < R") is missing or wrong in an equation's appliesWhen or the visual.
- inconsistent-variable: the same symbol or quantity is used to mean two different things, or two different symbols are used for the same thing, without explanation.
- other: any other concrete inconsistency that doesn't fit the categories above.

Be conservative: if a section is consistent, don't invent a problem for it. This check is advisory, not a correctness proof — say so implicitly by only reporting concrete mismatches, not style opinions or missing-nice-to-have content.

Reference the sectionId (and equationId/visualId, if applicable) of whatever you flag. Output valid JSON matching the provided schema exactly, with no other text.`;

export function buildVerificationPrompt(lesson: VerificationLesson): string {
  return `${SYSTEM_INSTRUCTION}

Lesson to check:
${JSON.stringify(lesson, null, 2)}`;
}
