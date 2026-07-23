import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const interactionsCreate = vi.fn();
const textToImage = vi.fn();

vi.mock("@/lib/ai/gemini/client", () => ({
  getGeminiClient: () => ({
    interactions: {
      create: interactionsCreate,
    },
  }),
}));

vi.mock("@huggingface/inference", () => ({
  InferenceClient: vi.fn().mockImplementation(function InferenceClient() {
    return {
      textToImage,
    };
  }),
}));

describe("generateEducationalImage", () => {
  const originalGeminiImageModels = process.env.GEMINI_IMAGE_MODELS;
  const originalHuggingFaceToken = process.env.HF_TOKEN;

  beforeEach(() => {
    process.env.GEMINI_IMAGE_MODELS = "gemini-3.1-flash-lite-image,gemini-3.1-flash-image";
    delete process.env.HF_TOKEN;
    interactionsCreate.mockReset();
    textToImage.mockReset();
  });

  afterEach(() => {
    if (originalGeminiImageModels === undefined) {
      delete process.env.GEMINI_IMAGE_MODELS;
    } else {
      process.env.GEMINI_IMAGE_MODELS = originalGeminiImageModels;
    }

    if (originalHuggingFaceToken === undefined) {
      delete process.env.HF_TOKEN;
    } else {
      process.env.HF_TOKEN = originalHuggingFaceToken;
    }

    vi.resetModules();
  });

  it("uses Gemini interactions and falls back from lite image to flash image", async () => {
    interactionsCreate
      .mockRejectedValueOnce(new Error("lite quota exhausted"))
      .mockResolvedValueOnce({
        output_image: {
          type: "image",
          data: "aW1hZ2U=",
          mime_type: "image/jpeg",
        },
        usage: {
          total_input_tokens: 30,
          total_output_tokens: 4,
          total_tokens: 34,
        },
      });

    const { generateEducationalImage } = await import(
      "@/lib/ai/gemini/generateEducationalImage"
    );
    const { withUsageTracking } = await import("@/lib/ai/usageContext");

    const { result, usage } = await withUsageTracking(() =>
      generateEducationalImage("Show dielectric molecules aligning against an external field.")
    );

    expect(result).toEqual({
      dataUrl: "data:image/jpeg;base64,aW1hZ2U=",
      mimeType: "image/jpeg",
    });
    expect(interactionsCreate).toHaveBeenCalledTimes(2);
    expect(interactionsCreate.mock.calls[0][0]).toMatchObject({
      model: "gemini-3.1-flash-lite-image",
      response_modalities: ["image"],
      response_format: {
        type: "image",
        mime_type: "image/jpeg",
        aspect_ratio: "16:9",
      },
    });
    expect(interactionsCreate.mock.calls[1][0]).toMatchObject({
      model: "gemini-3.1-flash-image",
    });
    expect(usage).toEqual([
      {
        model: "gemini-3.1-flash-image",
        promptTokens: 30,
        candidatesTokens: 4,
        thoughtsTokens: 0,
        totalTokens: 34,
      },
    ]);
  });

  it("falls back to Hugging Face only when a token is configured", async () => {
    process.env.HF_TOKEN = "hf_test";
    interactionsCreate
      .mockRejectedValueOnce(new Error("Gemini unavailable"))
      .mockRejectedValueOnce(new Error("Gemini unavailable"));
    textToImage.mockResolvedValueOnce(
      new Blob([Uint8Array.from([1, 2, 3])], { type: "image/png" })
    );

    const { generateEducationalImage } = await import(
      "@/lib/ai/gemini/generateEducationalImage"
    );

    const result = await generateEducationalImage(
      "Show capacitors in parallel with shared voltage."
    );

    expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(textToImage).toHaveBeenCalledTimes(1);
    expect(textToImage.mock.calls[0][0]).toMatchObject({
      provider: "hf-inference",
      model: "black-forest-labs/FLUX.1-schnell",
    });
  });
});
