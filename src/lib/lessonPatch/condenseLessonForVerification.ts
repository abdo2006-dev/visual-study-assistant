import type { VisualLesson } from "@/lib/schema/lesson";

export interface VerificationEquation {
  id: string;
  latex: string;
  appliesWhen?: string;
}

export interface VerificationVisual {
  id: string;
  templateId: string;
  title: string;
  educationalPurpose: string;
}

export interface VerificationSection {
  id: string;
  heading?: string;
  sourceText: string;
  simplifiedExplanation: string;
  equations: VerificationEquation[];
  visuals: VerificationVisual[];
}

export interface VerificationLesson {
  title: string;
  sections: VerificationSection[];
}

/**
 * What the verification pass gets to compare — source text, simplified
 * explanation, equations, and each visual's descriptive fields (not its
 * numeric `parameters`, which aren't textual claims to check). See
 * IMPLEMENTATION_PLAN.md section 10.
 */
export function condenseLessonForVerification(lesson: VisualLesson): VerificationLesson {
  return {
    title: lesson.title,
    sections: lesson.sections.map((section) => ({
      id: section.id,
      heading: section.heading,
      sourceText: section.sourceText,
      simplifiedExplanation: section.simplifiedExplanation,
      equations: section.equations.map((eq) => ({
        id: eq.id,
        latex: eq.latex,
        appliesWhen: eq.appliesWhen,
      })),
      visuals: section.visuals.map((v) => ({
        id: v.id,
        templateId: v.templateId,
        title: v.title,
        educationalPurpose: v.educationalPurpose,
      })),
    })),
  };
}
