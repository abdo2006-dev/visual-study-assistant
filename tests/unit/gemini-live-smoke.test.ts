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
});
