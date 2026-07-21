import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyLesson = vi.fn();

vi.mock("@/lib/ai/gemini/geminiProvider", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/ai/gemini/geminiProvider")>();
  return {
    ...actual,
    GeminiProvider: vi.fn().mockImplementation(function GeminiProvider() {
      return { verifyLesson };
    }),
  };
});

const validLesson = {
  title: "Test lesson",
  sections: [
    {
      id: "s1",
      heading: "Section 1",
      sourceText: "Some text.",
      simplifiedExplanation: "Some text.",
      equations: [],
      visuals: [],
    },
  ],
};

function postRequest(body: unknown) {
  return new Request("http://localhost/api/verify-lesson", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/verify-lesson", () => {
  beforeEach(() => {
    vi.resetModules();
    verifyLesson.mockReset();
  });

  it("returns 400 for a body missing required fields", async () => {
    const { POST } = await import("@/app/api/verify-lesson/route");
    const response = await POST(postRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 200 with the verification result on success", async () => {
    verifyLesson.mockResolvedValueOnce({
      checkedAt: new Date().toISOString(),
      summary: "Consistent.",
      issues: [],
    });

    const { POST } = await import("@/app/api/verify-lesson/route");
    const response = await POST(postRequest({ lesson: validLesson }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.summary).toBe("Consistent.");
  });

  it("returns 502 when the provider fails to produce valid output", async () => {
    const { AiGenerationError } = await import("@/lib/ai/gemini/geminiProvider");
    verifyLesson.mockRejectedValueOnce(new AiGenerationError("bad output"));

    const { POST } = await import("@/app/api/verify-lesson/route");
    const response = await POST(postRequest({ lesson: validLesson }));
    expect(response.status).toBe(502);
  });

  it("returns 504 when generation exceeds the timeout", async () => {
    process.env.VERIFY_LESSON_TIMEOUT_MS = "20";
    verifyLesson.mockImplementation(
      (input: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          input.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError"))
          );
        })
    );

    const { POST } = await import("@/app/api/verify-lesson/route");
    const response = await POST(postRequest({ lesson: validLesson }));

    expect(response.status).toBe(504);
    delete process.env.VERIFY_LESSON_TIMEOUT_MS;
  });
});
