import { describe, expect, it } from "vitest";

import { buildLessonPlanPrompt } from "@/lib/ai/gemini/prompts/lessonPlan";

describe("buildLessonPlanPrompt", () => {
  it("includes the source text", () => {
    const prompt = buildLessonPlanPrompt("An object in motion stays in motion.");
    expect(prompt).toContain("An object in motion stays in motion.");
  });

  it("omits the instructions block when none are given", () => {
    const prompt = buildLessonPlanPrompt("some text");
    expect(prompt).not.toContain("Student's optional instructions");
  });

  it("includes the student's instructions when given", () => {
    const prompt = buildLessonPlanPrompt("some text", "focus on how to graph this");
    expect(prompt).toContain("Student's optional instructions");
    expect(prompt).toContain("focus on how to graph this");
  });

  it("treats whitespace-only instructions as absent", () => {
    const prompt = buildLessonPlanPrompt("some text", "   ");
    expect(prompt).not.toContain("Student's optional instructions");
  });
});
