import type { VisualLesson } from "@/lib/schema/lesson";

export interface VisualPlanningEquation {
  latex: string;
  appliesWhen?: string;
}

export interface VisualPlanningSection {
  id: string;
  heading?: string;
  sourceText: string;
  simplifiedExplanation: string;
  equations: VisualPlanningEquation[];
}

export interface VisualPlanningLesson {
  title: string;
  subject: string;
  sections: VisualPlanningSection[];
}

/**
 * What the visual-planning pass gets to see: enough to judge which (if any)
 * template fits each section's actual physical/mathematical content. Always
 * called right after assembleLesson, so every section's `visuals` is still
 * empty here — there's nothing useful to condense from it yet.
 */
export function condenseLessonForVisualPlanning(lesson: VisualLesson): VisualPlanningLesson {
  return {
    title: lesson.title,
    subject: lesson.subject,
    sections: lesson.sections.map((section) => ({
      id: section.id,
      heading: section.heading,
      sourceText: section.sourceText,
      simplifiedExplanation: section.simplifiedExplanation,
      equations: section.equations.map((eq) => ({
        latex: eq.latex,
        appliesWhen: eq.appliesWhen,
      })),
    })),
  };
}
