import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ExtractSourceInput, LessonAIProvider } from "@/lib/ai/provider";

function makeFakeProvider() {
  const extractSource = vi.fn(async () => ({ markdown: "extracted text" }));
  const provider = {
    createLessonPlan: vi.fn(),
    extractSource,
  } as unknown as LessonAIProvider;
  return { provider, extractSource };
}

const validInput: ExtractSourceInput = {
  images: [{ imageBase64: "aW1hZ2UtZGF0YQ==", mimeType: "image/jpeg" }],
};

describe("extractLessonSource", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("delegates to the provider and returns its result", async () => {
    const { extractLessonSource } = await import("@/lib/ai/extractionService");
    const { provider } = makeFakeProvider();

    const result = await extractLessonSource(provider, validInput);
    expect(result).toEqual({ markdown: "extracted text" });
  });

  it("rejects a missing image without calling the provider", async () => {
    const { extractLessonSource, InvalidExtractionRequestError } = await import(
      "@/lib/ai/extractionService"
    );
    const { provider, extractSource } = makeFakeProvider();

    await expect(
      extractLessonSource(provider, { images: [] })
    ).rejects.toThrow(InvalidExtractionRequestError);
    expect(extractSource).not.toHaveBeenCalled();
  });

  it("rejects an unsupported mime type without calling the provider", async () => {
    const { extractLessonSource, InvalidExtractionRequestError } = await import(
      "@/lib/ai/extractionService"
    );
    const { provider, extractSource } = makeFakeProvider();

    await expect(
      extractLessonSource(provider, {
        images: [{ imageBase64: "aW1hZ2U=", mimeType: "application/pdf" }],
      })
    ).rejects.toThrow(InvalidExtractionRequestError);
    expect(extractSource).not.toHaveBeenCalled();
  });

  it("rejects an oversized image without calling the provider", async () => {
    const { extractLessonSource, InvalidExtractionRequestError } = await import(
      "@/lib/ai/extractionService"
    );
    const { provider, extractSource } = makeFakeProvider();

    await expect(
      extractLessonSource(provider, {
        images: [{ imageBase64: "A".repeat(12_000_000), mimeType: "image/jpeg" }],
      })
    ).rejects.toThrow(InvalidExtractionRequestError);
    expect(extractSource).not.toHaveBeenCalled();
  });

  it("rejects more than the max number of screenshots without calling the provider", async () => {
    const { extractLessonSource, InvalidExtractionRequestError } = await import(
      "@/lib/ai/extractionService"
    );
    const { provider, extractSource } = makeFakeProvider();

    await expect(
      extractLessonSource(provider, {
        images: Array.from({ length: 7 }, () => ({
          imageBase64: "aW1hZ2U=",
          mimeType: "image/jpeg",
        })),
      })
    ).rejects.toThrow(InvalidExtractionRequestError);
    expect(extractSource).not.toHaveBeenCalled();
  });

  it("accepts several screenshots in one request", async () => {
    const { extractLessonSource } = await import("@/lib/ai/extractionService");
    const { provider, extractSource } = makeFakeProvider();

    await extractLessonSource(provider, {
      images: [
        { imageBase64: "aW1hZ2Ux", mimeType: "image/png" },
        { imageBase64: "aW1hZ2Uy", mimeType: "image/png" },
      ],
    });
    expect(extractSource).toHaveBeenCalledTimes(1);
  });

  it("caches identical requests instead of calling the provider twice", async () => {
    const { extractLessonSource } = await import("@/lib/ai/extractionService");
    const { provider, extractSource } = makeFakeProvider();

    await extractLessonSource(provider, validInput);
    await extractLessonSource(provider, validInput);

    expect(extractSource).toHaveBeenCalledTimes(1);
  });
});
