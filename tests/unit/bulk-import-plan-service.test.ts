import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BulkImportPlan } from "@/lib/schema/bulkImportPlan";
import type { LessonAIProvider } from "@/lib/ai/provider";

function makeFakeProvider(plan: BulkImportPlan) {
  const planBulkImport = vi.fn(async () => plan);
  const provider = { planBulkImport } as unknown as LessonAIProvider;
  return { provider, planBulkImport };
}

const ORIGINAL_TEXT =
  "Gauss's law relates flux to enclosed charge. A dipole is two opposite charges separated by a distance.";

describe("generateBulkImportPlan", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns lessons whose sourceText verbatim-matches the original", async () => {
    const { generateBulkImportPlan } = await import("@/lib/ai/bulkImportPlanService");
    const { provider } = makeFakeProvider({
      lessons: [
        { title: "Gauss's law", sourceText: "Gauss's law relates flux to enclosed charge." },
        { title: "Dipoles", sourceText: "A dipole is two opposite charges separated by a distance." },
      ],
    });

    const result = await generateBulkImportPlan(provider, { sourceText: ORIGINAL_TEXT });
    expect(result.lessons).toHaveLength(2);
  });

  it("tolerates whitespace differences between the excerpt and the original", async () => {
    const { generateBulkImportPlan } = await import("@/lib/ai/bulkImportPlanService");
    const { provider } = makeFakeProvider({
      lessons: [
        {
          title: "Gauss's law",
          sourceText: "Gauss's law   relates flux\nto enclosed charge.",
        },
      ],
    });

    const result = await generateBulkImportPlan(provider, { sourceText: ORIGINAL_TEXT });
    expect(result.lessons).toHaveLength(1);
  });

  it("drops a lesson whose sourceText was paraphrased rather than copied verbatim", async () => {
    const { generateBulkImportPlan } = await import("@/lib/ai/bulkImportPlanService");
    const { provider } = makeFakeProvider({
      lessons: [
        { title: "Gauss's law", sourceText: "Gauss's law relates flux to enclosed charge." },
        { title: "Dipoles (paraphrased)", sourceText: "Dipoles have two charges of opposite sign." },
      ],
    });

    const result = await generateBulkImportPlan(provider, { sourceText: ORIGINAL_TEXT });
    expect(result.lessons).toHaveLength(1);
    expect(result.lessons[0].title).toBe("Gauss's law");
  });

  it("throws if every proposed lesson fails verification", async () => {
    const { generateBulkImportPlan, InvalidBulkImportRequestError } = await import(
      "@/lib/ai/bulkImportPlanService"
    );
    const { provider } = makeFakeProvider({
      lessons: [{ title: "Fabricated", sourceText: "This text does not appear anywhere." }],
    });

    await expect(
      generateBulkImportPlan(provider, { sourceText: ORIGINAL_TEXT })
    ).rejects.toThrow(InvalidBulkImportRequestError);
  });

  it("rejects empty source text without calling the provider", async () => {
    const { generateBulkImportPlan, InvalidBulkImportRequestError } = await import(
      "@/lib/ai/bulkImportPlanService"
    );
    const { provider, planBulkImport } = makeFakeProvider({ lessons: [] });

    await expect(
      generateBulkImportPlan(provider, { sourceText: "   " })
    ).rejects.toThrow(InvalidBulkImportRequestError);
    expect(planBulkImport).not.toHaveBeenCalled();
  });

  it("rejects source text over the length limit without calling the provider", async () => {
    const { generateBulkImportPlan, InvalidBulkImportRequestError } = await import(
      "@/lib/ai/bulkImportPlanService"
    );
    const { provider, planBulkImport } = makeFakeProvider({ lessons: [] });

    await expect(
      generateBulkImportPlan(provider, { sourceText: "a".repeat(60_001) })
    ).rejects.toThrow(InvalidBulkImportRequestError);
    expect(planBulkImport).not.toHaveBeenCalled();
  });

  it("caches identical requests instead of calling the provider twice", async () => {
    const { generateBulkImportPlan } = await import("@/lib/ai/bulkImportPlanService");
    const { provider, planBulkImport } = makeFakeProvider({
      lessons: [{ title: "Gauss's law", sourceText: "Gauss's law relates flux to enclosed charge." }],
    });

    await generateBulkImportPlan(provider, { sourceText: ORIGINAL_TEXT });
    await generateBulkImportPlan(provider, { sourceText: ORIGINAL_TEXT });

    expect(planBulkImport).toHaveBeenCalledTimes(1);
  });

  it("caps the number of returned lessons at the maximum", async () => {
    const { generateBulkImportPlan } = await import("@/lib/ai/bulkImportPlanService");
    const longText = Array.from({ length: 25 }, (_, i) => `Topic ${i} content here.`).join(" ");
    const { provider } = makeFakeProvider({
      lessons: Array.from({ length: 25 }, (_, i) => ({
        title: `Topic ${i}`,
        sourceText: `Topic ${i} content here.`,
      })),
    });

    const result = await generateBulkImportPlan(provider, { sourceText: longText });
    expect(result.lessons.length).toBeLessThanOrEqual(20);
  });
});
