import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateEducationalImage = vi.fn();

vi.mock("@/lib/ai/gemini/client", () => ({
  getGeminiClient: () => ({ models: {} }),
}));

vi.mock("@/lib/ai/gemini/generateEducationalImage", () => ({
  generateEducationalImage,
}));

function request(body: unknown) {
  return new Request("http://localhost/api/generate-visual-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/generate-visual-image", () => {
  beforeEach(() => {
    generateEducationalImage.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("returns generated image data and api usage on success", async () => {
    generateEducationalImage.mockResolvedValueOnce({
      dataUrl: "data:image/png;base64,aW1hZ2U=",
      mimeType: "image/png",
    });

    const { POST } = await import("@/app/api/generate-visual-image/route");
    const response = await POST(
      request({
        imagePrompt: "Show a two-panel dielectric capacitor comparison diagram.",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dataUrl).toBe("data:image/png;base64,aW1hZ2U=");
    expect(body.mimeType).toBe("image/png");
    expect(body.apiUsage).toEqual([]);
  });

  it("rejects a too-short image prompt", async () => {
    const { POST } = await import("@/app/api/generate-visual-image/route");
    const response = await POST(request({ imagePrompt: "too short" }));

    expect(response.status).toBe(400);
    expect(generateEducationalImage).not.toHaveBeenCalled();
  });
});
