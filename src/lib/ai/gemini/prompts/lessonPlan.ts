import { Type } from "@google/genai";
import { z } from "zod";

import { subjectSchema } from "@/lib/schema/subject";

/**
 * What we ask Gemini to produce: no ids, timestamps, schemaVersion, source,
 * or visuals — the server assigns those, and visual planning is a separate
 * AI operation added in Milestone 5. Keeping this schema narrow is also
 * what keeps the Gemini structured-output schema below in sync with what
 * we actually validate.
 */
export const aiEquationSchema = z.object({
  latex: z.string().min(1),
  plainLanguageReading: z.string().optional(),
  symbols: z
    .array(
      z.object({
        symbol: z.string().min(1),
        meaning: z.string().min(1),
        unit: z.string().optional(),
      })
    )
    .default([]),
  appliesWhen: z.string().optional(),
});

export const aiLessonSectionSchema = z.object({
  heading: z.string().optional(),
  sourceText: z.string().min(1),
  simplifiedExplanation: z.string().min(1),
  importantTerms: z
    .array(z.object({ term: z.string().min(1), definition: z.string().min(1) }))
    .default([]),
  equations: z.array(aiEquationSchema).default([]),
});

export const aiLessonPlanSchema = z.object({
  title: z.string().min(1),
  subject: subjectSchema,
  topic: z.string().optional(),
  summary: z.string().min(1),
  prerequisites: z.array(z.string()).default([]),
  learningObjectives: z.array(z.string()).default([]),
  sections: z.array(aiLessonSectionSchema).min(1),
});

export type AiLessonPlan = z.infer<typeof aiLessonPlanSchema>;

const symbolSchemaForGemini = {
  type: Type.OBJECT,
  properties: {
    symbol: { type: Type.STRING },
    meaning: { type: Type.STRING },
    unit: { type: Type.STRING },
  },
  required: ["symbol", "meaning"],
};

const equationSchemaForGemini = {
  type: Type.OBJECT,
  properties: {
    latex: {
      type: Type.STRING,
      description: "The equation in LaTeX, without surrounding $ delimiters.",
    },
    plainLanguageReading: { type: Type.STRING },
    symbols: { type: Type.ARRAY, items: symbolSchemaForGemini },
    appliesWhen: {
      type: Type.STRING,
      description: "Condition under which this equation applies, e.g. \"r < R\".",
    },
  },
  required: ["latex"],
};

const sectionSchemaForGemini = {
  type: Type.OBJECT,
  properties: {
    heading: { type: Type.STRING },
    sourceText: {
      type: Type.STRING,
      description: "The portion of the original source text this section covers.",
    },
    simplifiedExplanation: {
      type: Type.STRING,
      description: "A clearer, more concrete rewording aimed at someone who found the source text hard to follow.",
    },
    importantTerms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          definition: { type: Type.STRING },
        },
        required: ["term", "definition"],
      },
    },
    equations: { type: Type.ARRAY, items: equationSchemaForGemini },
  },
  required: ["sourceText", "simplifiedExplanation"],
};

export const lessonPlanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    subject: {
      type: Type.STRING,
      enum: subjectSchema.options,
    },
    topic: { type: Type.STRING },
    summary: { type: Type.STRING },
    prerequisites: { type: Type.ARRAY, items: { type: Type.STRING } },
    learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
    sections: { type: Type.ARRAY, items: sectionSchemaForGemini },
  },
  required: ["title", "subject", "summary", "sections"],
};

const SYSTEM_INSTRUCTION = `You are an expert tutor turning a student's pasted explanation into a structured lesson plan.

Rules:
- Break the source text into sections, each covering one coherent idea, object, process, or relationship.
- For each section, write a simplifiedExplanation that is more concrete and easier to follow than the source text — favor plain language over jargon, and be specific rather than vague.
- Extract every equation that appears or is clearly implied, as LaTeX.
- Extract terms a student would need defined to follow the section.
- Do not invent facts, numbers, or claims that are not in the source text and not standard, well-established knowledge about the topic.
- Output must be valid JSON matching the provided schema exactly. Do not include any text outside the JSON.`;

export function buildLessonPlanPrompt(sourceText: string): string {
  return `${SYSTEM_INSTRUCTION}\n\nSource text:\n"""\n${sourceText}\n"""`;
}
