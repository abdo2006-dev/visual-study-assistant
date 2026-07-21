import type { VisualLesson } from "@/lib/schema/lesson";

export interface CondensedVisual {
  id: string;
  templateId: string;
  title: string;
}

export interface CondensedSection {
  id: string;
  heading?: string;
  simplifiedExplanation: string;
  visuals: CondensedVisual[];
}

export interface CondensedLesson {
  title: string;
  summary: string;
  prerequisites: string[];
  sections: CondensedSection[];
}

const MAX_EXPLANATION_CHARS = 600;

/**
 * A trimmed-down view of the lesson for the modify-lesson AI call — full
 * equations/annotations/factual-checks aren't needed to decide what to
 * patch, so leaving them out keeps the request smaller (IMPLEMENTATION_PLAN.md
 * section 13: don't send the entire application state when unnecessary).
 */
export function condenseLessonForChat(lesson: VisualLesson): CondensedLesson {
  return {
    title: lesson.title,
    summary: lesson.summary,
    prerequisites: lesson.prerequisites,
    sections: lesson.sections.map((section) => ({
      id: section.id,
      heading: section.heading,
      simplifiedExplanation: section.simplifiedExplanation.slice(0, MAX_EXPLANATION_CHARS),
      visuals: section.visuals.map((v) => ({
        id: v.id,
        templateId: v.templateId,
        title: v.title,
      })),
    })),
  };
}
