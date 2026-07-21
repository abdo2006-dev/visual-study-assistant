import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LessonAIProvider } from "@/lib/ai/provider";
import { createChargedSphereMockLesson } from "@/lib/mock/chargedSphereLesson";

function makeFakeProvider() {
  const lesson = createChargedSphereMockLesson();
  const createLessonPlan = vi.fn(async () => lesson);
  const provider: LessonAIProvider = { createLessonPlan };
  return { provider, createLessonPlan, lesson };
}

describe("generateLessonPlan", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("delegates to the provider and returns its lesson", async () => {
    const { generateLessonPlan } = await import("@/lib/ai/lessonPlanService");
    const { provider, lesson } = makeFakeProvider();

    const result = await generateLessonPlan(provider, { sourceText: "hello world" });
    expect(result).toEqual(lesson);
  });

  it("rejects empty source text without calling the provider", async () => {
    const { generateLessonPlan, InvalidLessonPlanRequestError } = await import(
      "@/lib/ai/lessonPlanService"
    );
    const { provider, createLessonPlan } = makeFakeProvider();

    await expect(
      generateLessonPlan(provider, { sourceText: "   " })
    ).rejects.toThrow(InvalidLessonPlanRequestError);
    expect(createLessonPlan).not.toHaveBeenCalled();
  });

  it("rejects source text over the length limit without calling the provider", async () => {
    const { generateLessonPlan, InvalidLessonPlanRequestError } = await import(
      "@/lib/ai/lessonPlanService"
    );
    const { provider, createLessonPlan } = makeFakeProvider();

    await expect(
      generateLessonPlan(provider, { sourceText: "a".repeat(20_001) })
    ).rejects.toThrow(InvalidLessonPlanRequestError);
    expect(createLessonPlan).not.toHaveBeenCalled();
  });

  it("caches identical requests instead of calling the provider twice", async () => {
    const { generateLessonPlan } = await import("@/lib/ai/lessonPlanService");
    const { provider, createLessonPlan } = makeFakeProvider();

    await generateLessonPlan(provider, { sourceText: "the same text" });
    await generateLessonPlan(provider, { sourceText: "the same text" });

    expect(createLessonPlan).toHaveBeenCalledTimes(1);
  });

  it("does not cache across different source text", async () => {
    const { generateLessonPlan } = await import("@/lib/ai/lessonPlanService");
    const { provider, createLessonPlan } = makeFakeProvider();

    await generateLessonPlan(provider, { sourceText: "first text" });
    await generateLessonPlan(provider, { sourceText: "second text" });

    expect(createLessonPlan).toHaveBeenCalledTimes(2);
  });
});
