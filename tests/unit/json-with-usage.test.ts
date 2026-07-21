import { describe, expect, it } from "vitest";

import { jsonWithUsage } from "@/lib/ai/jsonWithUsage";
import { recordGeminiUsage } from "@/lib/ai/usageContext";

describe("jsonWithUsage", () => {
  it("attaches an empty apiUsage array when nothing was recorded", async () => {
    const response = await jsonWithUsage(async () => ({ markdown: "hi" }));
    const body = await response.json();
    expect(body).toEqual({ markdown: "hi", apiUsage: [] });
  });

  it("attaches every call recorded during fn", async () => {
    const response = await jsonWithUsage(async () => {
      recordGeminiUsage({
        model: "gemini-flash-lite-latest",
        promptTokens: 10,
        candidatesTokens: 2,
        thoughtsTokens: 0,
        totalTokens: 12,
      });
      return { markdown: "hi" };
    });
    const body = await response.json();
    expect(body.apiUsage).toHaveLength(1);
    expect(body.apiUsage[0].totalTokens).toBe(12);
    expect(body.markdown).toBe("hi");
  });

  it("propagates a thrown error instead of swallowing it", async () => {
    await expect(
      jsonWithUsage(async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
  });
});
