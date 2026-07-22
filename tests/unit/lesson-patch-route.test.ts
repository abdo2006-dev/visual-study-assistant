import { beforeEach, describe, expect, it, vi } from "vitest";

const modifyLesson = vi.fn();

vi.mock("@/lib/ai/gemini/geminiProvider", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/ai/gemini/geminiProvider")>();
  return {
    ...actual,
    GeminiProvider: vi.fn().mockImplementation(function GeminiProvider() {
      return { modifyLesson };
    }),
  };
});

const validLesson = {
  title: "Test lesson",
  summary: "A test lesson.",
  prerequisites: [],
  sections: [
    {
      id: "s1",
      heading: "Section 1",
      simplifiedExplanation: "Some text.",
      visuals: [],
      existingCuriosityQuestions: [],
    },
  ],
};

function postRequest(body: unknown) {
  return new Request("http://localhost/api/lesson-patch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** The route always streams NDJSON now — reads every line and returns them all. */
async function readLines(response: Response): Promise<Record<string, unknown>[]> {
  const text = await response.text();
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

describe("POST /api/lesson-patch", () => {
  beforeEach(() => {
    vi.resetModules();
    modifyLesson.mockReset();
  });

  it("returns 400 for a body missing required fields", async () => {
    const { POST } = await import("@/app/api/lesson-patch/route");
    const response = await POST(postRequest({ message: "hi" }));
    expect(response.status).toBe(400);
  });

  it("streams the reply and patches as the final result event on success", async () => {
    modifyLesson.mockResolvedValueOnce({
      reply: "Done.",
      patches: [{ op: "add-prerequisite", prerequisite: "Vectors" }],
    });

    const { POST } = await import("@/app/api/lesson-patch/route");
    const response = await POST(
      postRequest({ lesson: validLesson, message: "add a prerequisite" })
    );

    expect(response.status).toBe(200);
    const lines = await readLines(response);
    const result = lines.at(-1);
    expect(result?.type).toBe("result");
    expect(result?.reply).toBe("Done.");
    expect(result?.patches).toHaveLength(1);
  });

  it("streams a 400 error event when the service rejects the request as invalid", async () => {
    const { InvalidLessonPatchRequestError } = await import("@/lib/ai/lessonPatchService");
    modifyLesson.mockImplementation(() => {
      throw new InvalidLessonPatchRequestError("bad request");
    });

    const { POST } = await import("@/app/api/lesson-patch/route");
    const response = await POST(postRequest({ lesson: validLesson, message: "" }));
    const lines = await readLines(response);
    const result = lines.at(-1) as { type: string; status?: number };
    expect(result.type).toBe("error");
    expect(result.status).toBe(400);
  });

  it("streams a 502 error event when the provider fails to produce valid output", async () => {
    const { AiGenerationError } = await import("@/lib/ai/gemini/geminiProvider");
    modifyLesson.mockRejectedValueOnce(new AiGenerationError("bad output"));

    const { POST } = await import("@/app/api/lesson-patch/route");
    const response = await POST(postRequest({ lesson: validLesson, message: "hello" }));
    const lines = await readLines(response);
    const result = lines.at(-1) as { type: string; status?: number };
    expect(result.type).toBe("error");
    expect(result.status).toBe(502);
  });

  it("streams a 504 error event when generation exceeds the timeout", async () => {
    process.env.LESSON_PATCH_TIMEOUT_MS = "20";
    modifyLesson.mockImplementation(
      (input: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          input.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError"))
          );
        })
    );

    const { POST } = await import("@/app/api/lesson-patch/route");
    const response = await POST(postRequest({ lesson: validLesson, message: "hello" }));
    const lines = await readLines(response);
    const result = lines.at(-1) as { type: string; status?: number };

    expect(result.type).toBe("error");
    expect(result.status).toBe(504);
    delete process.env.LESSON_PATCH_TIMEOUT_MS;
  });

  it("emits a progress event before the final result", async () => {
    modifyLesson.mockResolvedValueOnce({ reply: "Done.", patches: [] });

    const { POST } = await import("@/app/api/lesson-patch/route");
    const response = await POST(postRequest({ lesson: validLesson, message: "hello" }));
    const lines = await readLines(response);

    const progressMessages = lines.filter((line) => line.type === "progress");
    expect(progressMessages.length).toBeGreaterThan(0);
    expect(lines.at(-1)?.type).toBe("result");
  });
});
