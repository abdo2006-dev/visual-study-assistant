import { beforeEach, describe, expect, it, vi } from "vitest";

const extractSource = vi.fn();

vi.mock("@/lib/ai/gemini/geminiProvider", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/ai/gemini/geminiProvider")>();
  return {
    ...actual,
    GeminiProvider: vi.fn().mockImplementation(function GeminiProvider() {
      return { extractSource };
    }),
  };
});

function postRequest(body: unknown) {
  return new Request("http://localhost/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/extract", () => {
  beforeEach(() => {
    vi.resetModules();
    extractSource.mockReset();
  });

  it("returns 400 for a body missing required fields", async () => {
    const { POST } = await import("@/app/api/extract/route");
    const response = await POST(postRequest({ imageBase64: "abc" }));
    expect(response.status).toBe(400);
  });

  it("returns 200 with the extracted markdown on success", async () => {
    extractSource.mockResolvedValueOnce({ markdown: "# Extracted" });

    const { POST } = await import("@/app/api/extract/route");
    const response = await POST(
      postRequest({ images: [{ imageBase64: "aW1hZ2U=", mimeType: "image/png" }] })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.markdown).toBe("# Extracted");
  });

  it("returns 400 when the provider rejects the request as invalid", async () => {
    const { InvalidExtractionRequestError } = await import(
      "@/lib/ai/extractionService"
    );
    extractSource.mockImplementation(() => {
      throw new InvalidExtractionRequestError("bad image");
    });

    const { POST } = await import("@/app/api/extract/route");
    const response = await POST(
      postRequest({ images: [{ imageBase64: "aW1hZ2U=", mimeType: "image/png" }] })
    );
    expect(response.status).toBe(400);
  });

  it("returns 502 when the provider fails to produce valid output", async () => {
    const { AiGenerationError } = await import("@/lib/ai/gemini/geminiProvider");
    extractSource.mockRejectedValueOnce(new AiGenerationError("bad output"));

    const { POST } = await import("@/app/api/extract/route");
    const response = await POST(
      postRequest({ images: [{ imageBase64: "aW1hZ2U=", mimeType: "image/png" }] })
    );
    expect(response.status).toBe(502);
  });

  it("returns 504 when generation exceeds the timeout", async () => {
    process.env.EXTRACT_TIMEOUT_MS = "20";
    extractSource.mockImplementation(
      (input: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          input.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError"))
          );
        })
    );

    const { POST } = await import("@/app/api/extract/route");
    const response = await POST(
      postRequest({ images: [{ imageBase64: "aW1hZ2U=", mimeType: "image/png" }] })
    );

    expect(response.status).toBe(504);
    delete process.env.EXTRACT_TIMEOUT_MS;
  });
});
