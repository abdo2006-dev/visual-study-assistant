import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LessonAIProvider } from "@/lib/ai/provider";

const validLesson = {
  title: "Test lesson",
  summary: "A test lesson.",
  prerequisites: [],
  sections: [
    {
      id: "s1",
      heading: "Section 1",
      simplifiedExplanation: "Some text.",
      visuals: [],
    },
  ],
};

function makeFakeProvider() {
  const modifyLesson = vi.fn(async () => ({
    reply: "ok",
    patches: [],
  }));
  const provider = {
    createLessonPlan: vi.fn(),
    extractSource: vi.fn(),
    modifyLesson,
  } as unknown as LessonAIProvider;
  return { provider, modifyLesson };
}

describe("generateLessonPatch", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("delegates to the provider for a valid request", async () => {
    const { generateLessonPatch } = await import("@/lib/ai/lessonPatchService");
    const { provider, modifyLesson } = makeFakeProvider();

    await generateLessonPatch(provider, { lesson: validLesson, message: "hello" });
    expect(modifyLesson).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty message without calling the provider", async () => {
    const { generateLessonPatch, InvalidLessonPatchRequestError } = await import(
      "@/lib/ai/lessonPatchService"
    );
    const { provider, modifyLesson } = makeFakeProvider();

    await expect(
      generateLessonPatch(provider, { lesson: validLesson, message: "   " })
    ).rejects.toThrow(InvalidLessonPatchRequestError);
    expect(modifyLesson).not.toHaveBeenCalled();
  });

  it("rejects a lesson with no sections without calling the provider", async () => {
    const { generateLessonPatch, InvalidLessonPatchRequestError } = await import(
      "@/lib/ai/lessonPatchService"
    );
    const { provider, modifyLesson } = makeFakeProvider();

    await expect(
      generateLessonPatch(provider, {
        lesson: { ...validLesson, sections: [] },
        message: "hello",
      })
    ).rejects.toThrow(InvalidLessonPatchRequestError);
    expect(modifyLesson).not.toHaveBeenCalled();
  });

  it("rejects an over-long message without calling the provider", async () => {
    const { generateLessonPatch, InvalidLessonPatchRequestError } = await import(
      "@/lib/ai/lessonPatchService"
    );
    const { provider, modifyLesson } = makeFakeProvider();

    await expect(
      generateLessonPatch(provider, { lesson: validLesson, message: "a".repeat(2001) })
    ).rejects.toThrow(InvalidLessonPatchRequestError);
    expect(modifyLesson).not.toHaveBeenCalled();
  });
});
