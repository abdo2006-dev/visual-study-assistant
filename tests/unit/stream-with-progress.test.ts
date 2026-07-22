import { describe, expect, it } from "vitest";

import { streamWithProgress } from "@/lib/ai/streamWithProgress";
import { recordGeminiUsage } from "@/lib/ai/usageContext";

async function readLines(response: Response): Promise<Record<string, unknown>[]> {
  const text = await response.text();
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

describe("streamWithProgress", () => {
  it("streams progress lines followed by a result line, and always returns HTTP 200", async () => {
    const response = streamWithProgress(
      async (onProgress) => {
        onProgress("Step one...");
        onProgress("Step two...");
        return { markdown: "done" };
      },
      { timedOut: () => false, logPrefix: "[test]" }
    );

    expect(response.status).toBe(200);
    const lines = await readLines(response);
    expect(lines).toEqual([
      { type: "progress", message: "Step one..." },
      { type: "progress", message: "Step two..." },
      { type: "result", markdown: "done", apiUsage: [] },
    ]);
  });

  it("attaches apiUsage recorded during fn to the result line", async () => {
    const response = streamWithProgress(
      async () => {
        recordGeminiUsage({
          model: "gemini-flash-lite-latest",
          promptTokens: 1,
          candidatesTokens: 2,
          thoughtsTokens: 0,
          totalTokens: 3,
        });
        return { markdown: "done" };
      },
      { timedOut: () => false, logPrefix: "[test]" }
    );

    const lines = await readLines(response);
    const result = lines.at(-1) as { apiUsage: unknown[] };
    expect(result.apiUsage).toHaveLength(1);
  });

  it("streams an error line (not an HTTP error status) when fn throws", async () => {
    const response = streamWithProgress(
      async () => {
        throw new Error("boom");
      },
      { timedOut: () => false, logPrefix: "[test]" }
    );

    expect(response.status).toBe(200);
    const lines = await readLines(response);
    const result = lines.at(-1) as { type: string; status: number };
    expect(result.type).toBe("error");
    expect(result.status).toBe(500);
  });

  it("calls onSettled exactly once after the stream finishes", async () => {
    let settledCount = 0;
    const response = streamWithProgress(async () => ({ markdown: "done" }), {
      timedOut: () => false,
      logPrefix: "[test]",
      onSettled: () => {
        settledCount += 1;
      },
    });

    await readLines(response);
    expect(settledCount).toBe(1);
  });
});
