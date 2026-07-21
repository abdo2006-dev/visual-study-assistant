import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function GoogleGenAI() {
    return { models: { generateContent } };
  }),
  Type: { OBJECT: "OBJECT", STRING: "STRING", ARRAY: "ARRAY" },
}));

describe("GeminiProvider.planBulkImport", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    generateContent.mockReset();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    vi.resetModules();
  });

  it("returns the proposed lessons from a valid response", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        lessons: [
          { title: "Gauss's Law", sourceText: "Gauss's law states..." },
          { title: "Electric Dipoles", topic: "Electrostatics", sourceText: "A dipole consists..." },
        ],
      }),
    });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().planBulkImport({
      sourceText: "Gauss's law states... A dipole consists...",
    });

    expect(result.lessons).toHaveLength(2);
    expect(result.lessons[1].topic).toBe("Electrostatics");
  });

  it("repairs an invalid first response by retrying once", async () => {
    generateContent
      .mockResolvedValueOnce({ text: "not valid json" })
      .mockResolvedValueOnce({
        text: JSON.stringify({ lessons: [{ title: "Recovered", sourceText: "x" }] }),
      });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().planBulkImport({ sourceText: "x" });

    expect(result.lessons[0].title).toBe("Recovered");
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});
