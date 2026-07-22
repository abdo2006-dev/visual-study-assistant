import { z } from "zod";

import { equationBlockSchema } from "./equations";
import { subjectSchema } from "./subject";
import { visualBlockSchema } from "./visualBlocks";

export const LESSON_SCHEMA_VERSION = 1;

export const lessonSourceSchema = z.object({
  kind: z.enum(["pasted-text", "screenshot", "mock"]),
  originalText: z.string().optional(),
  /** Data URLs of the (already compressed) screenshot(s), when kind is "screenshot". */
  originalImages: z.array(z.string()).optional(),
});

export const importantTermSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
});

export const curiosityQuestionTypeSchema = z.enum(["why", "how", "what"]);

/**
 * A proactive follow-up the AI anticipates a curious student would ask about
 * a section — mainly "why" (the reasoning behind a claim), occasionally
 * "how"/"what" — shown collapsed by default so it doesn't clutter a section
 * that doesn't need it. See AI_PIPELINE.md's "Curiosity questions" section.
 */
export const curiosityQuestionSchema = z.object({
  id: z.string().min(1),
  type: curiosityQuestionTypeSchema,
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const lessonSectionSchema = z.object({
  id: z.string().min(1),
  heading: z.string().optional(),
  sourceText: z.string(),
  simplifiedExplanation: z.string(),
  importantTerms: z.array(importantTermSchema).default([]),
  equations: z.array(equationBlockSchema).default([]),
  visuals: z.array(visualBlockSchema).default([]),
  curiosityQuestions: z.array(curiosityQuestionSchema).default([]),
});

export const visualLessonSchema = z.object({
  schemaVersion: z.literal(LESSON_SCHEMA_VERSION),
  id: z.string().min(1),
  title: z.string().min(1),
  subject: subjectSchema,
  topic: z.string().optional(),
  source: lessonSourceSchema,
  summary: z.string(),
  prerequisites: z.array(z.string()).default([]),
  learningObjectives: z.array(z.string()).default([]),
  sections: z.array(lessonSectionSchema).default([]),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type LessonSource = z.infer<typeof lessonSourceSchema>;
export type ImportantTerm = z.infer<typeof importantTermSchema>;
export type CuriosityQuestion = z.infer<typeof curiosityQuestionSchema>;
export type LessonSection = z.infer<typeof lessonSectionSchema>;
export type VisualLesson = z.infer<typeof visualLessonSchema>;
