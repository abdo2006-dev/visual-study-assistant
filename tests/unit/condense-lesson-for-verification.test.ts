import { describe, expect, it } from "vitest";

import { condenseLessonForVerification } from "@/lib/lessonPatch/condenseLessonForVerification";
import { createChargedSphereMockLesson } from "@/lib/mock/chargedSphereLesson";

describe("condenseLessonForVerification", () => {
  it("keeps sourceText, equations, and visual descriptions but not raw parameters", () => {
    const lesson = createChargedSphereMockLesson();
    const condensed = condenseLessonForVerification(lesson);

    const inside = condensed.sections.find((s) => s.id === "region-inside");
    expect(inside?.sourceText).toBe(lesson.sections[0].sourceText);
    expect(inside?.equations[0].latex).toBe(lesson.sections[0].equations[0].latex);

    const interactive = condensed.sections.find((s) => s.id === "interactive-exploration");
    expect(interactive?.visuals[0]).toEqual({
      id: "sphere-visual",
      templateId: "radial-charged-sphere",
      title: expect.any(String),
      educationalPurpose: expect.any(String),
    });
    expect(interactive?.visuals[0]).not.toHaveProperty("parameters");
  });
});
