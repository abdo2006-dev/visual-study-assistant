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

  it("returns 200 with the generated lesson on success", async () => {
    const lesson = createChargedSphereMockLesson();
    createLessonPlan.mockResolvedValueOnce(lesson);

    const { POST } = await import("@/app/api/lesson-plan/route");
    const response = await POST(postRequest({ sourceText: "explain gravity" }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.title).toBe(lesson.title);
  });

  it("returns 502 when the provider fails to produce a valid lesson", async () => {
    const { LessonPlanGenerationError } = await import(
      "@/lib/ai/gemini/geminiProvider"
    );
    createLessonPlan.mockRejectedValueOnce(
      new LessonPlanGenerationError("model returned garbage")
    );

    const { POST } = await import("@/app/api/lesson-plan/route");
    const response = await POST(postRequest({ sourceText: "explain gravity" }));
    expect(response.status).toBe(502);
  });

  it("returns 500 without leaking details when the API key is missing", async () => {
    const { MissingApiKeyError } = await import("@/lib/ai/config");
    createLessonPlan.mockRejectedValueOnce(new MissingApiKeyError());

    const { POST } = await import("@/app/api/lesson-plan/route");
    const response = await POST(postRequest({ sourceText: "explain gravity" }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).not.toMatch(/gho_|AIza|sk-/);
  });

  it("returns 429 after exceeding the rate limit", async () => {
    createLessonPlan.mockImplementation(async () =>
      createChargedSphereMockLesson()
    );
    const { POST } = await import("@/app/api/lesson-plan/route");

    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const response = await POST(postRequest({ sourceText: `explain topic ${i}` }));
      lastStatus = response.status;
    }
    expect(lastStatus).toBe(429);
  });

  it("returns 504 when generation exceeds the timeout", async () => {
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

    expect(response.status).toBe(504);
    delete process.env.LESSON_PLAN_TIMEOUT_MS;
  });
});
