import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LessonAIProvider, VisualPlan } from "@/lib/ai/provider";
import { createChargedSphereMockLesson } from "@/lib/mock/chargedSphereLesson";
import type { VisualBlock } from "@/lib/schema/visualBlocks";

function makeVisual(
  id: string,
  parameters: Record<string, unknown> = {}
): VisualBlock {
  return {
    id,
    type: "scientific-diagram",
    templateId: "radial-charged-sphere",
    title: "Field inside the sphere",
    educationalPurpose: "Shows how the field grows linearly inside.",
    accessibilityDescription: "A charged sphere cross-section.",
    parameters,
    controls: [],
    annotations: [],
    factualChecks: [],
    generationStatus: "ready",
  };
}

function makeGeneratedVisual(
  id: string,
  parameters: Record<string, unknown>
): VisualBlock {
  return {
    ...makeVisual(id, parameters),
    type: "generated-illustration",
    templateId: "generated-illustration",
    title: "Generated illustration",
  };
}

function makeFakeProvider(planVisualsResult: VisualPlan = { assignments: [] }) {
  const lesson = createChargedSphereMockLesson();
  const createLessonPlan = vi.fn(async () => lesson);
  const planVisuals = vi.fn(async () => planVisualsResult);
  const provider = { createLessonPlan, planVisuals } as unknown as LessonAIProvider;
  return { provider, createLessonPlan, planVisuals, lesson };
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

  it("passes optional instructions through to the provider", async () => {
    const { generateLessonPlan } = await import("@/lib/ai/lessonPlanService");
    const { provider, createLessonPlan } = makeFakeProvider();

    await generateLessonPlan(provider, {
      sourceText: "some text",
      instructions: "focus on how to graph this",
    });

    expect(createLessonPlan).toHaveBeenCalledWith(
      expect.objectContaining({ instructions: "focus on how to graph this" })
    );
  });

  it("does not cache across different instructions for the same source text", async () => {
    const { generateLessonPlan } = await import("@/lib/ai/lessonPlanService");
    const { provider, createLessonPlan } = makeFakeProvider();

    await generateLessonPlan(provider, { sourceText: "same text", instructions: "focus on X" });
    await generateLessonPlan(provider, { sourceText: "same text", instructions: "focus on Y" });
    await generateLessonPlan(provider, { sourceText: "same text" });

    expect(createLessonPlan).toHaveBeenCalledTimes(3);
  });

  it("rejects instructions over the length limit without calling the provider", async () => {
    const { generateLessonPlan, InvalidLessonPlanRequestError } = await import(
      "@/lib/ai/lessonPlanService"
    );
    const { provider, createLessonPlan } = makeFakeProvider();

    await expect(
      generateLessonPlan(provider, {
        sourceText: "some text",
        instructions: "a".repeat(501),
      })
    ).rejects.toThrow(InvalidLessonPlanRequestError);
    expect(createLessonPlan).not.toHaveBeenCalled();
  });

  it("attaches a visual the provider's planVisuals assigns to a real section", async () => {
    const { generateLessonPlan } = await import("@/lib/ai/lessonPlanService");
    const visual = {
      id: "visual-1",
      type: "scientific-diagram",
      templateId: "radial-charged-sphere",
      title: "Field inside the sphere",
      educationalPurpose: "Shows how the field grows linearly inside.",
      accessibilityDescription: "A charged sphere cross-section.",
      parameters: {},
      controls: [],
      annotations: [],
      factualChecks: [],
      generationStatus: "ready",
    };
    const { provider } = makeFakeProvider({
      assignments: [{ sectionId: "region-inside", visual }],
    });

    const result = await generateLessonPlan(provider, { sourceText: "hello world" });
    const section = result.sections.find((s) => s.id === "region-inside");

    expect(section?.visuals).toEqual([{ ...visual, sourceSectionId: "region-inside" }]);
  });

  it("still returns the lesson if planVisuals fails", async () => {
    const { generateLessonPlan } = await import("@/lib/ai/lessonPlanService");
    const { provider, lesson } = makeFakeProvider();
    provider.planVisuals = vi.fn(async () => {
      throw new Error("boom");
    });

    const result = await generateLessonPlan(provider, { sourceText: "hello world" });
    expect(result).toEqual(lesson);
  });

  it("calls onProgress at each phase boundary, in order", async () => {
    const { generateLessonPlan } = await import("@/lib/ai/lessonPlanService");
    const { provider } = makeFakeProvider();
    const messages: string[] = [];

    await generateLessonPlan(
      provider,
      { sourceText: "onprogress test text" },
      { onProgress: (message) => messages.push(message) }
    );

    expect(messages).toEqual([
      "Reading your text and drafting sections...",
      "Choosing visuals for each section...",
    ]);
  });

  it("does not call onProgress again for a cached (repeat) request", async () => {
    const { generateLessonPlan } = await import("@/lib/ai/lessonPlanService");
    const { provider } = makeFakeProvider();
    const messages: string[] = [];
    const onProgress = (message: string) => messages.push(message);

    await generateLessonPlan(provider, { sourceText: "cached progress text" }, { onProgress });
    await generateLessonPlan(provider, { sourceText: "cached progress text" }, { onProgress });

    expect(messages).toEqual([
      "Reading your text and drafting sections...",
      "Choosing visuals for each section...",
    ]);
  });
});

describe("attachPlannedVisuals", () => {
  it("skips planVisuals entirely when the remaining budget is too small", async () => {
    const { attachPlannedVisuals } = await import("@/lib/ai/lessonPlanService");
    const { provider, lesson, planVisuals } = makeFakeProvider();

    const result = await attachPlannedVisuals(provider, lesson, undefined, undefined, 1_000);

    expect(planVisuals).not.toHaveBeenCalled();
    expect(result).toEqual(lesson);
  });

  it("calls planVisuals when the remaining budget is sufficient", async () => {
    const { attachPlannedVisuals } = await import("@/lib/ai/lessonPlanService");
    const { provider, lesson, planVisuals } = makeFakeProvider();

    await attachPlannedVisuals(provider, lesson, undefined, undefined, 30_000);

    expect(planVisuals).toHaveBeenCalledTimes(1);
  });

  it("combines the caller's own abort signal with the budget timeout", async () => {
    const { attachPlannedVisuals } = await import("@/lib/ai/lessonPlanService");
    const { provider, lesson } = makeFakeProvider();
    let seenSignal: AbortSignal | undefined;
    provider.planVisuals = vi.fn(async ({ signal }: { signal?: AbortSignal }) => {
      seenSignal = signal;
      return { assignments: [] };
    });

    const controller = new AbortController();
    controller.abort();
    await attachPlannedVisuals(provider, lesson, undefined, controller.signal, 30_000);

    expect(seenSignal?.aborted).toBe(true);
  });

  it("keeps only the first identical visual instead of repeating it across sections", async () => {
    const { attachPlannedVisuals } = await import("@/lib/ai/lessonPlanService");
    const visualA = makeVisual("visual-a", { sphereType: "solid-insulator" });
    const visualB = makeVisual("visual-b", { sphereType: "solid-insulator" });
    const { provider, lesson } = makeFakeProvider({
      assignments: [
        { sectionId: "region-inside", visual: visualA },
        { sectionId: "region-outside", visual: visualB },
      ],
    });

    const result = await attachPlannedVisuals(provider, lesson, undefined, undefined, 30_000);

    expect(result.sections.find((s) => s.id === "region-inside")?.visuals).toEqual([
      { ...visualA, sourceSectionId: "region-inside" },
    ]);
    expect(result.sections.find((s) => s.id === "region-outside")?.visuals).toEqual([]);
  });

  it("keeps visuals that use the same template for meaningfully different parameters", async () => {
    const { attachPlannedVisuals } = await import("@/lib/ai/lessonPlanService");
    const insideVisual = makeVisual("visual-a", { sphereType: "solid-insulator" });
    const outsideVisual = makeVisual("visual-b", { sphereType: "shell" });
    const { provider, lesson } = makeFakeProvider({
      assignments: [
        { sectionId: "region-inside", visual: insideVisual },
        { sectionId: "region-outside", visual: outsideVisual },
      ],
    });

    const result = await attachPlannedVisuals(provider, lesson, undefined, undefined, 30_000);

    expect(result.sections.find((s) => s.id === "region-inside")?.visuals).toHaveLength(1);
    expect(result.sections.find((s) => s.id === "region-outside")?.visuals).toHaveLength(1);
  });

  it("treats generated illustrations with the same prompt as duplicates even if image bytes differ", async () => {
    const { attachPlannedVisuals } = await import("@/lib/ai/lessonPlanService");
    const visualA = makeGeneratedVisual("visual-a", {
      imagePrompt: "Compare capacitor dielectric behavior in two battery states.",
      imageDataUrl: "data:image/png;base64,Zmlyc3Q=",
      mimeType: "image/png",
    });
    const visualB = makeGeneratedVisual("visual-b", {
      imagePrompt: "Compare capacitor dielectric behavior in two battery states.",
      imageDataUrl: "data:image/png;base64,c2Vjb25k",
      mimeType: "image/png",
    });
    const { provider, lesson } = makeFakeProvider({
      assignments: [
        { sectionId: "region-inside", visual: visualA },
        { sectionId: "region-outside", visual: visualB },
      ],
    });

    const result = await attachPlannedVisuals(provider, lesson, undefined, undefined, 30_000);

    expect(result.sections.find((s) => s.id === "region-inside")?.visuals).toHaveLength(1);
    expect(result.sections.find((s) => s.id === "region-outside")?.visuals).toEqual([]);
  });
});
