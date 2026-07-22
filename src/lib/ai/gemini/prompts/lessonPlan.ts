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

export const aiCuriosityQuestionSchema = z.object({
  type: z.enum(["why", "how", "what"]),
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const aiLessonSectionSchema = z.object({
  heading: z.string().optional(),
  sourceText: z.string().min(1),
  simplifiedExplanation: z.string().min(1),
  importantTerms: z
    .array(z.object({ term: z.string().min(1), definition: z.string().min(1) }))
    .default([]),
  equations: z.array(aiEquationSchema).default([]),
  curiosityQuestions: z.array(aiCuriosityQuestionSchema).default([]),
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

const curiosityQuestionSchemaForGemini = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      enum: ["why", "how", "what"],
      description: "Mainly \"why\" — the reasoning behind a claim. Use \"how\"/\"what\" only when they add real understanding.",
    },
    question: {
      type: Type.STRING,
      description: "The follow-up question a curious student would naturally ask about this section.",
    },
    answer: {
      type: Type.STRING,
      description: "A concise, concrete answer, reasoning from the section's own content or standard, well-established knowledge — never invented facts.",
    },
  },
  required: ["type", "question", "answer"],
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
    curiosityQuestions: { type: Type.ARRAY, items: curiosityQuestionSchemaForGemini },
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
- For each section, add curiosityQuestions ONLY where a sharp student would genuinely feel something is unresolved — especially a claim that sounds surprising or incomplete on its own (e.g. "the potential is zero, but the field isn't" begs "why not?"). Mostly "why" (the reasoning behind a claim, not just a restatement of it); use "how" or "what" only when they add real understanding a "why" wouldn't. Skip this entirely for sections that are already self-contained — most sections should get 0, some 1, rarely more than 2. A forced question that just restates the explanation is worse than no question.
- Every curiosityQuestions answer must reason from the source text or standard, well-established knowledge about the topic — never invented facts, numbers, or claims.
- Do not invent facts, numbers, or claims that are not in the source text and not standard, well-established knowledge about the topic.
- Output must be valid JSON matching the provided schema exactly. Do not include any text outside the JSON.`;

export function buildLessonPlanPrompt(sourceText: string): string {
  return `${SYSTEM_INSTRUCTION}\n\nSource text:\n"""\n${sourceText}\n"""`;
}
