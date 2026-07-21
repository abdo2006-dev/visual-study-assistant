import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function GoogleGenAI() {
    return { models: { generateContent } };
  }),
  Type: { OBJECT: "OBJECT", STRING: "STRING", ARRAY: "ARRAY", NUMBER: "NUMBER" },
}));

describe("GeminiProvider.extractSource", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    generateContent.mockReset();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    vi.resetModules();
  });

  it("returns the extracted markdown from a valid response", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({ markdown: "# Title\n\nSome extracted text." }),
    });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().extractSource({
      imageBase64: "ZmFrZS1pbWFnZS1ieXRlcw==",
      mimeType: "image/jpeg",
    });

    expect(result.markdown).toBe("# Title\n\nSome extracted text.");
    expect(generateContent).toHaveBeenCalledTimes(1);

    const call = generateContent.mock.calls[0][0];
    const parts = call.contents[0].parts;
    expect(parts[0].inlineData).toEqual({
      mimeType: "image/jpeg",
      data: "ZmFrZS1pbWFnZS1ieXRlcw==",
    });
  });

  it("repairs an invalid first response by retrying once", async () => {
    generateContent
      .mockResolvedValueOnce({ text: "not valid json" })
      .mockResolvedValueOnce({ text: JSON.stringify({ markdown: "recovered text" }) });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().extractSource({
      imageBase64: "aW1hZ2U=",
      mimeType: "image/png",
    });

    expect(result.markdown).toBe("recovered text");
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("throws AiGenerationError when both attempts are invalid", async () => {
    generateContent
      .mockResolvedValueOnce({ text: "nope" })
      .mockResolvedValueOnce({ text: "still nope" });

    const { GeminiProvider, AiGenerationError } = await import(
      "@/lib/ai/gemini/geminiProvider"
    );
    await expect(
      new GeminiProvider().extractSource({ imageBase64: "aW1hZ2U=", mimeType: "image/png" })
    ).rejects.toThrow(AiGenerationError);
  });
});
