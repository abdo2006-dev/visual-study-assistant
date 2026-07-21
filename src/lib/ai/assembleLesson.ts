import type { AiLessonPlan } from "@/lib/ai/gemini/prompts/lessonPlan";
import {
  LESSON_SCHEMA_VERSION,
  type LessonSource,
  type VisualLesson,
  visualLessonSchema,
} from "@/lib/schema/lesson";

/**
 * Turns a provider's narrow lesson-plan output into a complete, validated
 * VisualLesson: assigns ids/timestamps, attaches the source, and leaves
 * `visuals` empty on every section (visual planning is a separate AI
 * operation added in Milestone 5). Kept provider-agnostic so any future
 * LessonAIProvider implementation reuses the same assembly step.
 */
export function assembleLesson(
  plan: AiLessonPlan,
  source: LessonSource
): VisualLesson {
  const now = new Date().toISOString();

  const lesson: VisualLesson = {
    schemaVersion: LESSON_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    title: plan.title,
    subject: plan.subject,
    topic: plan.topic,
    source,
    summary: plan.summary,
    prerequisites: plan.prerequisites,
    learningObjectives: plan.learningObjectives,
    sections: plan.sections.map((section) => ({
      id: crypto.randomUUID(),
      heading: section.heading,
      sourceText: section.sourceText,
      simplifiedExplanation: section.simplifiedExplanation,
      importantTerms: section.importantTerms,
      equations: section.equations.map((equation) => ({
        id: crypto.randomUUID(),
        ...equation,
      })),
      visuals: [],
    })),
    createdAt: now,
    updatedAt: now,
  };

  return visualLessonSchema.parse(lesson);
}
