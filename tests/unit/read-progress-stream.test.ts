import { describe, expect, it } from "vitest";

import { readProgressStream } from "@/lib/ai/readProgressStream";

describe("readProgressStream", () => {
  it("calls onProgress for progress lines and returns the result line", async () => {
    const body = [
      JSON.stringify({ type: "progress", message: "Step one..." }),
      JSON.stringify({ type: "progress", message: "Step two..." }),
      JSON.stringify({ type: "result", markdown: "done" }),
    ].join("\n");
    const response = new Response(body);

    const messages: string[] = [];
    const result = await readProgressStream<{ markdown: string }>(response, (m) =>
      messages.push(m)
    );

    expect(messages).toEqual(["Step one...", "Step two..."]);
    expect(result).toEqual({ markdown: "done" });
  });

  it("throws using the error line's message when type is 'error'", async () => {
    const body = JSON.stringify({ type: "error", status: 502, error: "Bad output." });
    const response = new Response(body);

    await expect(readProgressStream(response, () => {})).rejects.toThrow("Bad output.");
  });

  it("treats a plain object with no 'type' field as the final result directly", async () => {
    // Matches how existing tests/e2e specs mock these routes with a single
    // flat JSON body via route.fulfill({ json: {...} }) — must keep working
    // without every existing mock needing an NDJSON rewrite.
    const response = new Response(JSON.stringify({ title: "A lesson", sections: [] }));

    const result = await readProgressStream<{ title: string }>(response, () => {});
    expect(result).toEqual({ title: "A lesson", sections: [] });
  });

  it("throws when the stream ends with no result", async () => {
    const response = new Response("");
    await expect(readProgressStream(response, () => {})).rejects.toThrow(
      "The server closed the connection before sending a result."
    );
  });
});
