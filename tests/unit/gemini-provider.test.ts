import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validAiLessonPlan } from "../mocks/lessonPlanFixtures";

const generateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function GoogleGenAI() {
    return { models: { generateContent } };
  }),
  Type: {
    OBJECT: "OBJECT",
    STRING: "STRING",
    ARRAY: "ARRAY",
    NUMBER: "NUMBER",
  },
}));

describe("GeminiProvider.createLessonPlan", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    generateContent.mockReset();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    vi.resetModules();
  });

  it("assembles a valid VisualLesson from a valid first response", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify(validAiLessonPlan),
    });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const lesson = await new GeminiProvider().createLessonPlan({
      sourceText: "An object in motion stays in motion.",
    });

    expect(lesson.title).toBe(validAiLessonPlan.title);
    expect(lesson.sections).toHaveLength(1);
    expect(lesson.sections[0].id).toBeTruthy();
    expect(lesson.sections[0].equations[0].id).toBeTruthy();
    expect(lesson.source).toEqual({
      kind: "pasted-text",
      originalText: "An object in motion stays in motion.",
    });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("repairs an invalid first response by retrying once", async () => {
    generateContent
      .mockResolvedValueOnce({ text: "not valid json" })
      .mockResolvedValueOnce({ text: JSON.stringify(validAiLessonPlan) });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const lesson = await new GeminiProvider().createLessonPlan({
      sourceText: "An object in motion stays in motion.",
    });

    expect(lesson.title).toBe(validAiLessonPlan.title);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("throws LessonPlanGenerationError when both attempts are invalid", async () => {
    generateContent
      .mockResolvedValueOnce({ text: "not valid json" })
      .mockResolvedValueOnce({ text: "still not valid" });

    const { GeminiProvider, LessonPlanGenerationError } = await import(
      "@/lib/ai/gemini/geminiProvider"
    );
    await expect(
      new GeminiProvider().createLessonPlan({ sourceText: "some text" })
    ).rejects.toThrow(LessonPlanGenerationError);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("throws when the API key is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    await expect(
      new GeminiProvider().createLessonPlan({ sourceText: "some text" })
    ).rejects.toThrow(/GEMINI_API_KEY/);
    expect(generateContent).not.toHaveBeenCalled();
  });
});
