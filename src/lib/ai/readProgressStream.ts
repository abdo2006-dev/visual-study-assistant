/**
 * Client-side reader for the newline-delimited JSON a streaming AI route
 * (see streamWithProgress.ts) sends: any number of
 * `{ type: "progress", message }` lines followed by exactly one
 * `{ type: "result", ...data }` or `{ type: "error", error }` line.
 *
 * Also tolerates a response with no "type" wrapper at all — a single flat
 * JSON object — treating it as the final result outright. This is what
 * lets existing tests keep mocking these routes with a plain
 * `route.fulfill({ json: {...} })` instead of a hand-built NDJSON body.
 */
export async function readProgressStream<T extends object>(
  response: Response,
  onProgress: (message: string) => void
): Promise<T> {
  let result: T | undefined;

  function handleLine(parsed: unknown): void {
    if (!parsed || typeof parsed !== "object") {
      result = parsed as T;
      return;
    }
    const record = parsed as { type?: string; message?: string; error?: string };
    if (record.type === "progress") {
      if (record.message) onProgress(record.message);
      return;
    }
    if (record.type === "error") {
      throw new Error(record.error ?? "Something went wrong. Please try again.");
    }
    if (record.type === "result") {
      const rest = { ...(record as Record<string, unknown>) };
      delete rest.type;
      result = rest as T;
      return;
    }
    // No recognized "type" — a plain single-object response (legacy/mocked).
    result = parsed as T;
  }

  if (!response.body) {
    handleLine(await response.json());
  } else {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line) handleLine(JSON.parse(line));
      }
    }

    const trailing = buffer.trim();
    if (trailing) handleLine(JSON.parse(trailing));
  }

  if (result === undefined) {
    throw new Error("The server closed the connection before sending a result.");
  }
  return result;
}
