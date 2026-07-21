import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MissingApiKeyError, getGeminiApiKey } from "@/lib/ai/config";

describe("getGeminiApiKey", () => {
  const original = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = original;
    }
  });

  it("throws a clear, typed error when the key is missing", () => {
    expect(() => getGeminiApiKey()).toThrow(MissingApiKeyError);
  });

  it("returns the key when present", () => {
    process.env.GEMINI_API_KEY = "test-key";
    expect(getGeminiApiKey()).toBe("test-key");
  });
});
