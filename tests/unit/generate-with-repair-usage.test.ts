import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const generateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function GoogleGenAI() {
    return { models: { generateContent } };
  }),
  Type: { OBJECT: "OBJECT", STRING: "STRING" },
}));

const schema = z.object({ ok: z.boolean() });
const responseSchema = { type: "OBJECT", properties: { ok: { type: "BOOLEAN" } } };

describe("generateWithRepair usage recording", () => {
  beforeEach(() => {
    generateContent.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("records usage from a single successful call", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({ ok: true }),
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 20,
        thoughtsTokenCount: 5,
        totalTokenCount: 125,
      },
    });

    const { generateWithRepair } = await import("@/lib/ai/gemini/generateWithRepair");
    const { withUsageTracking } = await import("@/lib/ai/usageContext");
    const { GoogleGenAI } = await import("@google/genai");

    const { usage } = await withUsageTracking(() =>
      generateWithRepair({
        client: new GoogleGenAI({}),
        model: "gemini-flash-lite-latest",
        schema,
        responseSchema,
        initialParts: [{ text: "hi" }],
      })
    );

    expect(usage).toEqual([
      {
        model: "gemini-flash-lite-latest",
        promptTokens: 100,
        candidatesTokens: 20,
        thoughtsTokens: 5,
        totalTokens: 125,
      },
    ]);
  });

  it("records usage from both calls when a repair retry happens", async () => {
    generateContent
      .mockResolvedValueOnce({
        text: "not json",
        usageMetadata: {
          promptTokenCount: 50,
          candidatesTokenCount: 10,
          totalTokenCount: 60,
        },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ ok: true }),
        usageMetadata: {
          promptTokenCount: 70,
          candidatesTokenCount: 15,
          totalTokenCount: 85,
        },
      });

    const { generateWithRepair } = await import("@/lib/ai/gemini/generateWithRepair");
    const { withUsageTracking } = await import("@/lib/ai/usageContext");
    const { GoogleGenAI } = await import("@google/genai");

    const { usage } = await withUsageTracking(() =>
      generateWithRepair({
        client: new GoogleGenAI({}),
        model: "gemini-flash-lite-latest",
        schema,
        responseSchema,
        initialParts: [{ text: "hi" }],
      })
    );

    expect(usage).toHaveLength(2);
    expect(usage[0].totalTokens).toBe(60);
    expect(usage[1].totalTokens).toBe(85);
  });

  it("still records usage even when the response text is empty", async () => {
    generateContent.mockResolvedValue({
      text: "",
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 0, totalTokenCount: 10 },
    });

    const { generateWithRepair } = await import("@/lib/ai/gemini/generateWithRepair");
    const { withUsageTracking } = await import("@/lib/ai/usageContext");
    const { GoogleGenAI } = await import("@google/genai");

    const { usage } = await withUsageTracking(async () => {
      try {
        await generateWithRepair({
          client: new GoogleGenAI({}),
          model: "gemini-flash-lite-latest",
          schema,
          responseSchema,
          initialParts: [{ text: "hi" }],
        });
      } catch {
        // expected — empty text throws AiGenerationError
      }
    });

    expect(usage.length).toBeGreaterThan(0);
    expect(usage[0].totalTokens).toBe(10);
  });
});
