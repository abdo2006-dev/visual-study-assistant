import { describe, expect, it } from "vitest";

import { condenseLessonForChat } from "@/lib/lessonPatch/condenseLesson";
import { createChargedSphereMockLesson } from "@/lib/mock/chargedSphereLesson";

describe("condenseLessonForChat", () => {
  it("keeps section/visual ids and drops equation/annotation detail", () => {
    const lesson = createChargedSphereMockLesson();
    const condensed = condenseLessonForChat(lesson);

    expect(condensed.title).toBe(lesson.title);
    expect(condensed.sections).toHaveLength(lesson.sections.length);

    const inside = condensed.sections.find((s) => s.id === "region-inside");
    expect(inside).toBeDefined();
    expect(inside).not.toHaveProperty("equations");

    const interactive = condensed.sections.find((s) => s.id === "interactive-exploration");
    expect(interactive?.visuals).toEqual([
      { id: "sphere-visual", templateId: "radial-charged-sphere", title: expect.any(String) },
    ]);
  });

  it("truncates a very long explanation", () => {
    const lesson = createChargedSphereMockLesson();
    lesson.sections[0].simplifiedExplanation = "x".repeat(5000);
    const condensed = condenseLessonForChat(lesson);
    expect(condensed.sections[0].simplifiedExplanation.length).toBeLessThan(1000);
  });
});
