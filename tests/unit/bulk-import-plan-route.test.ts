import { beforeEach, describe, expect, it, vi } from "vitest";

const planBulkImport = vi.fn();

vi.mock("@/lib/ai/gemini/geminiProvider", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/ai/gemini/geminiProvider")>();
  return {
    ...actual,
    GeminiProvider: vi.fn().mockImplementation(function GeminiProvider() {
      return { planBulkImport };
    }),
  };
});

function postRequest(body: unknown) {
  return new Request("http://localhost/api/bulk-import-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/bulk-import-plan", () => {
  beforeEach(() => {
    vi.resetModules();
    planBulkImport.mockReset();
  });

  it("returns 400 for a body missing sourceText", async () => {
    const { POST } = await import("@/app/api/bulk-import-plan/route");
    const response = await POST(postRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 200 with the proposed lessons and apiUsage on success", async () => {
    planBulkImport.mockResolvedValueOnce({
      lessons: [{ title: "Gauss's law", sourceText: "Gauss's law relates flux to charge." }],
    });

    const { POST } = await import("@/app/api/bulk-import-plan/route");
    const response = await POST(
      postRequest({ sourceText: "Gauss's law relates flux to charge." })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.lessons).toHaveLength(1);
    expect(body.apiUsage).toEqual([]);
  });

  it("returns 400 when the provider rejects the request as invalid", async () => {
    const { InvalidBulkImportRequestError } = await import(
      "@/lib/ai/bulkImportPlanService"
    );
    planBulkImport.mockImplementation(() => {
      throw new InvalidBulkImportRequestError("bad text");
    });

    const { POST } = await import("@/app/api/bulk-import-plan/route");
    const response = await POST(postRequest({ sourceText: "some text" }));
    expect(response.status).toBe(400);
  });

  it("returns 502 when the provider fails to produce valid output", async () => {
    const { AiGenerationError } = await import("@/lib/ai/gemini/geminiProvider");
    planBulkImport.mockRejectedValueOnce(new AiGenerationError("bad output"));

    const { POST } = await import("@/app/api/bulk-import-plan/route");
    const response = await POST(postRequest({ sourceText: "some text" }));
    expect(response.status).toBe(502);
  });

  it("returns 504 when generation exceeds the timeout", async () => {
    process.env.BULK_IMPORT_PLAN_TIMEOUT_MS = "20";
    planBulkImport.mockImplementation(
      (input: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          input.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError"))
          );
        })
    );

    const { POST } = await import("@/app/api/bulk-import-plan/route");
    const response = await POST(postRequest({ sourceText: "some text" }));

    expect(response.status).toBe(504);
    delete process.env.BULK_IMPORT_PLAN_TIMEOUT_MS;
  });
});
