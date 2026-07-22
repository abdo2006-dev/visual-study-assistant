import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createChargedSphereMockLesson } from "@/lib/mock/chargedSphereLesson";

const createLessonPlan = vi.fn();

vi.mock("@/lib/ai/gemini/geminiProvider", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/ai/gemini/geminiProvider")>();
  return {
    ...actual,
    GeminiProvider: vi.fn().mockImplementation(function GeminiProvider() {
      return { createLessonPlan };
    }),
  };
});

function postRequest(body: unknown, signal?: AbortSignal) {
  return new Request("http://localhost/api/lesson-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
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

describe("POST /api/lesson-plan", () => {
  beforeEach(() => {
    vi.resetModules();
    createLessonPlan.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 400 for a body missing sourceText", async () => {
    const { POST } = await import("@/app/api/lesson-plan/route");
    const response = await POST(postRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 400 for a non-JSON body", async () => {
    const { POST } = await import("@/app/api/lesson-plan/route");
    const request = new Request("http://localhost/api/lesson-plan", {
      method: "POST",
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("streams the generated lesson as the final result event", async () => {
    const lesson = createChargedSphereMockLesson();
    createLessonPlan.mockResolvedValueOnce(lesson);

    const { POST } = await import("@/app/api/lesson-plan/route");
    const response = await POST(postRequest({ sourceText: "explain gravity" }));

    expect(response.status).toBe(200);
    const lines = await readLines(response);
    const result = lines.at(-1);
    expect(result?.type).toBe("result");
    expect(result?.title).toBe(lesson.title);
  });

  it("streams a final error event (not an HTTP error status) when the provider fails", async () => {
    const { AiGenerationError } = await import("@/lib/ai/gemini/geminiProvider");
    createLessonPlan.mockRejectedValueOnce(
      new AiGenerationError("model returned garbage")
    );

    const { POST } = await import("@/app/api/lesson-plan/route");
    const response = await POST(postRequest({ sourceText: "explain gravity" }));

    expect(response.status).toBe(200);
    const lines = await readLines(response);
    const result = lines.at(-1);
    expect(result?.type).toBe("error");
    expect(result?.status).toBe(502);
  });

  it("streams a 500 error without leaking details when the API key is missing", async () => {
    const { MissingApiKeyError } = await import("@/lib/ai/config");
    createLessonPlan.mockRejectedValueOnce(new MissingApiKeyError());

    const { POST } = await import("@/app/api/lesson-plan/route");
    const response = await POST(postRequest({ sourceText: "explain gravity" }));

    const lines = await readLines(response);
    const result = lines.at(-1) as { type: string; status: number; error: string };
    expect(result.type).toBe("error");
    expect(result.status).toBe(500);
    expect(result.error).not.toMatch(/gho_|AIza|sk-/);
  });

  it("streams a 429 error event after exceeding the rate limit", async () => {
    createLessonPlan.mockImplementation(async () =>
      createChargedSphereMockLesson()
    );
    const { POST } = await import("@/app/api/lesson-plan/route");

    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const response = await POST(postRequest({ sourceText: `explain topic ${i}` }));
      const lines = await readLines(response);
      const result = lines.at(-1) as { type: string; status?: number };
      lastStatus = result.type === "error" ? (result.status ?? 0) : 200;
    }
    expect(lastStatus).toBe(429);
  });

  it("streams a 504 error event when generation exceeds the timeout", async () => {
    process.env.LESSON_PLAN_TIMEOUT_MS = "20";
    createLessonPlan.mockImplementation(
      (input: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          input.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError"))
          );
        })
    );

    const { POST } = await import("@/app/api/lesson-plan/route");
    const response = await POST(postRequest({ sourceText: "explain gravity" }));

    const lines = await readLines(response);
    const result = lines.at(-1) as { type: string; status?: number };
    expect(result.type).toBe("error");
    expect(result.status).toBe(504);
    delete process.env.LESSON_PLAN_TIMEOUT_MS;
  });

  it("emits progress events before the final result", async () => {
    const lesson = createChargedSphereMockLesson();
    createLessonPlan.mockResolvedValueOnce(lesson);

    const { POST } = await import("@/app/api/lesson-plan/route");
    const response = await POST(postRequest({ sourceText: "explain gravity" }));
    const lines = await readLines(response);

    const progressMessages = lines.filter((line) => line.type === "progress");
    expect(progressMessages.length).toBeGreaterThan(0);
    expect(lines.at(-1)?.type).toBe("result");
  });
});
