import { describe, expect, it } from "vitest";

/**
 * Optional, real-API smoke test. Skipped unless RUN_LIVE_GEMINI_TEST=1 is
 * set (and a real GEMINI_API_KEY is present), so ordinary `npm run test`
 * never spends Gemini quota. Run explicitly with:
 *   RUN_LIVE_GEMINI_TEST=1 npx vitest run tests/unit/gemini-live-smoke.test.ts
 */
describe.skipIf(!process.env.RUN_LIVE_GEMINI_TEST)("Gemini live smoke test", () => {
  it("generates a real lesson plan from Gemini", async () => {
    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const lesson = await new GeminiProvider().createLessonPlan({
      sourceText:
        "The mitochondria is the organelle responsible for producing most of a cell's ATP through cellular respiration.",
      mode: "economical",
    });

    expect(lesson.title).toBeTruthy();
    expect(lesson.sections.length).toBeGreaterThan(0);
  }, 30_000);

  it("doesn't assume a specific charge geometry the source text never names", async () => {
    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const provider = new GeminiProvider();
    const lesson = await provider.createLessonPlan({
      sourceText:
        "Sketching electric field graphs: E(r) generally decreases with distance from a source, while the potential V(r) also falls off. A zero potential at a point does not imply the field is zero there too — the field is related to the slope of the potential, not its value.",
      mode: "economical",
    });

    const { assignments } = await provider.planVisuals({
      lesson: {
        title: lesson.title,
        subject: lesson.subject,
        sections: lesson.sections.map((s) => ({
          id: s.id,
          heading: s.heading,
          sourceText: s.sourceText,
          simplifiedExplanation: s.simplifiedExplanation,
          equations: s.equations,
        })),
      },
    });

    for (const assignment of assignments) {
      expect(assignment.visual.templateId).not.toBe("radial-charged-sphere");
    }
  }, 60_000);
});
