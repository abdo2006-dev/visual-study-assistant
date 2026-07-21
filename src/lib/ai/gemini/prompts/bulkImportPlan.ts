import { Type } from "@google/genai";
import { z } from "zod";

export const bulkImportPlanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    lessons: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          topic: { type: Type.STRING },
          sourceText: {
            type: Type.STRING,
            description:
              "The exact, verbatim portion of the original source text that belongs to this lesson — copied character-for-character, never paraphrased, summarized, or reworded.",
          },
        },
        required: ["title", "sourceText"],
      },
    },
  },
  required: ["lessons"],
};

export const aiBulkImportPlanSchema = z.object({
  lessons: z
    .array(
      z.object({
        title: z.string().min(1),
        topic: z.string().optional(),
        sourceText: z.string().min(1),
      })
    )
    .min(1),
});

export type AiBulkImportPlan = z.infer<typeof aiBulkImportPlanSchema>;

const SYSTEM_INSTRUCTION = `You are splitting a large block of study material into one or more coherent lessons.

Rules:
- Read the entire source text first, then identify distinct topics within it. If the whole text covers one cohesive topic, return a single lesson containing the entire text — do not split just to produce more than one.
- Every lesson's "sourceText" must be an exact, verbatim excerpt copied character-for-character from the original — never paraphrase, summarize, reword, translate, or fix typos. Copy-paste, don't rewrite.
- Together, the lessons should cover essentially all of the substantive content in the source text. It's fine to omit pure page furniture (page numbers, running headers/footers, a table of contents) — never omit actual explanatory content.
- Each lesson's sourceText should be a single contiguous excerpt (not several disconnected pieces stitched together) covering one coherent topic, in the order it appears in the source.
- Give each lesson a short, descriptive title reflecting its specific topic (not a generic label like "Part 1").
- Output must be valid JSON matching the provided schema exactly, with no other text.`;

export function buildBulkImportPlanPrompt(sourceText: string): string {
  return `${SYSTEM_INSTRUCTION}\n\nSource text:\n"""\n${sourceText}\n"""`;
}
