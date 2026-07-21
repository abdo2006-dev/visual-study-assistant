import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LessonAIProvider } from "@/lib/ai/provider";

const validLesson = {
  title: "Test lesson",
  sections: [
    {
      id: "s1",
      heading: "Section 1",
      sourceText: "Some source text.",
      simplifiedExplanation: "Some text.",
      equations: [],
      visuals: [],
    },
  ],
};

function makeFakeProvider() {
  const verifyLesson = vi.fn(async () => ({
    checkedAt: new Date().toISOString(),
    summary: "ok",
    issues: [],
  }));
  const provider = {
    createLessonPlan: vi.fn(),
    extractSource: vi.fn(),
    modifyLesson: vi.fn(),
    verifyLesson,
  } as unknown as LessonAIProvider;
  return { provider, verifyLesson };
}

describe("verifyLesson service", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("delegates to the provider for a valid lesson", async () => {
    const { verifyLesson } = await import("@/lib/ai/lessonVerificationService");
    const { provider, verifyLesson: providerVerify } = makeFakeProvider();

    await verifyLesson(provider, { lesson: validLesson });
    expect(providerVerify).toHaveBeenCalledTimes(1);
  });

  it("rejects a lesson with no sections without calling the provider", async () => {
    const { verifyLesson, InvalidVerificationRequestError } = await import(
      "@/lib/ai/lessonVerificationService"
    );
    const { provider, verifyLesson: providerVerify } = makeFakeProvider();

    await expect(
      verifyLesson(provider, { lesson: { ...validLesson, sections: [] } })
    ).rejects.toThrow(InvalidVerificationRequestError);
    expect(providerVerify).not.toHaveBeenCalled();
  });

  it("caches identical requests instead of calling the provider twice", async () => {
    const { verifyLesson } = await import("@/lib/ai/lessonVerificationService");
    const { provider, verifyLesson: providerVerify } = makeFakeProvider();

    await verifyLesson(provider, { lesson: validLesson });
    await verifyLesson(provider, { lesson: validLesson });
    expect(providerVerify).toHaveBeenCalledTimes(1);
  });
});
