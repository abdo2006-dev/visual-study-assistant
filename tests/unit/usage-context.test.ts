import { describe, expect, it } from "vitest";

import { recordGeminiUsage, withUsageTracking } from "@/lib/ai/usageContext";

describe("usageContext", () => {
  it("collects every call recorded during fn's async call tree", async () => {
    const { result, usage } = await withUsageTracking(async () => {
      recordGeminiUsage({
        model: "gemini-flash-lite-latest",
        promptTokens: 10,
        candidatesTokens: 5,
        thoughtsTokens: 0,
        totalTokens: 15,
      });
      await Promise.resolve();
      recordGeminiUsage({
        model: "gemini-flash-lite-latest",
        promptTokens: 20,
        candidatesTokens: 8,
        thoughtsTokens: 2,
        totalTokens: 30,
      });
      return "done";
    });

    expect(result).toBe("done");
    expect(usage).toHaveLength(2);
    expect(usage[1].totalTokens).toBe(30);
  });

  it("returns no usage when nothing was recorded", async () => {
    const { usage } = await withUsageTracking(async () => "x");
    expect(usage).toEqual([]);
  });

  it("recording outside of withUsageTracking is a silent no-op", () => {
    expect(() =>
      recordGeminiUsage({
        model: "m",
        promptTokens: 1,
        candidatesTokens: 1,
        thoughtsTokens: 0,
        totalTokens: 2,
      })
    ).not.toThrow();
  });

  it("keeps two concurrent trackers' usage separate", async () => {
    const [a, b] = await Promise.all([
      withUsageTracking(async () => {
        recordGeminiUsage({
          model: "a",
          promptTokens: 1,
          candidatesTokens: 0,
          thoughtsTokens: 0,
          totalTokens: 1,
        });
      }),
      withUsageTracking(async () => {
        recordGeminiUsage({
          model: "b",
          promptTokens: 2,
          candidatesTokens: 0,
          thoughtsTokens: 0,
          totalTokens: 2,
        });
        recordGeminiUsage({
          model: "b",
          promptTokens: 3,
          candidatesTokens: 0,
          thoughtsTokens: 0,
          totalTokens: 3,
        });
      }),
    ]);

    expect(a.usage).toHaveLength(1);
    expect(b.usage).toHaveLength(2);
  });
});
