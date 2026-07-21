import { describe, expect, it } from "vitest";

import { condenseLessonForVisualPlanning } from "@/lib/lessonPatch/condenseLessonForVisualPlanning";
import { createChargedSphereMockLesson } from "@/lib/mock/chargedSphereLesson";

describe("condenseLessonForVisualPlanning", () => {
  it("keeps section text and equations but drops importantTerms and visuals", () => {
    const lesson = createChargedSphereMockLesson();
    const condensed = condenseLessonForVisualPlanning(lesson);

    expect(condensed.title).toBe(lesson.title);
    expect(condensed.subject).toBe(lesson.subject);
    expect(condensed.sections).toHaveLength(lesson.sections.length);

    const first = condensed.sections[0];
    const firstSource = lesson.sections[0];
    expect(first.id).toBe(firstSource.id);
    expect(first.sourceText).toBe(firstSource.sourceText);
    expect(first.simplifiedExplanation).toBe(firstSource.simplifiedExplanation);
    expect(first.equations).toEqual(
      firstSource.equations.map((eq) => ({ latex: eq.latex, appliesWhen: eq.appliesWhen }))
    );
    expect((first as Record<string, unknown>).importantTerms).toBeUndefined();
    expect((first as Record<string, unknown>).visuals).toBeUndefined();
  });
});
