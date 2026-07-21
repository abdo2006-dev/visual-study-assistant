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
  imageBase64: "aW1hZ2UtZGF0YQ==",
  mimeType: "image/jpeg",
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
      extractLessonSource(provider, { ...validInput, imageBase64: "" })
    ).rejects.toThrow(InvalidExtractionRequestError);
    expect(extractSource).not.toHaveBeenCalled();
  });

  it("rejects an unsupported mime type without calling the provider", async () => {
    const { extractLessonSource, InvalidExtractionRequestError } = await import(
      "@/lib/ai/extractionService"
    );
    const { provider, extractSource } = makeFakeProvider();

    await expect(
      extractLessonSource(provider, { ...validInput, mimeType: "application/pdf" })
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
        ...validInput,
        imageBase64: "A".repeat(12_000_000),
      })
    ).rejects.toThrow(InvalidExtractionRequestError);
    expect(extractSource).not.toHaveBeenCalled();
  });

  it("caches identical requests instead of calling the provider twice", async () => {
    const { extractLessonSource } = await import("@/lib/ai/extractionService");
    const { provider, extractSource } = makeFakeProvider();

    await extractLessonSource(provider, validInput);
    await extractLessonSource(provider, validInput);

    expect(extractSource).toHaveBeenCalledTimes(1);
  });
});
