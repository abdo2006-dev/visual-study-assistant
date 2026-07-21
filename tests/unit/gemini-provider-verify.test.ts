import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function GoogleGenAI() {
    return { models: { generateContent } };
  }),
  Type: { OBJECT: "OBJECT", STRING: "STRING", ARRAY: "ARRAY", NUMBER: "NUMBER" },
}));

const lesson = {
  title: "Test lesson",
  sections: [
    {
      id: "s1",
      heading: "Section 1",
      sourceText: "The field points outward for a positive charge.",
      simplifiedExplanation: "The field points inward.",
      equations: [{ id: "e1", latex: "E = kQ/r^2" }],
      visuals: [],
    },
  ],
};

describe("GeminiProvider.verifyLesson", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    generateContent.mockReset();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    vi.resetModules();
  });

  it("returns a summary and issues, stamping checkedAt", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        summary: "One inconsistency found.",
        issues: [
          {
            category: "conflicting-direction",
            description: "sourceText says outward, simplifiedExplanation says inward.",
            sectionId: "s1",
          },
        ],
      }),
    });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().verifyLesson({ lesson });

    expect(result.summary).toBe("One inconsistency found.");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].category).toBe("conflicting-direction");
    expect(result.checkedAt).toBeTruthy();
  });

  it("returns no issues when the response reports none", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({ summary: "Consistent.", issues: [] }),
    });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().verifyLesson({ lesson });
    expect(result.issues).toEqual([]);
  });
});
