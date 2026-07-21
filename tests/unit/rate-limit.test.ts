import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the per-window limit, then throws", async () => {
    const { checkRateLimit, RateLimitError } = await import("@/lib/ai/rateLimit");

    for (let i = 0; i < 10; i++) {
      expect(() => checkRateLimit()).not.toThrow();
    }
    expect(() => checkRateLimit()).toThrow(RateLimitError);
  });

  it("resets once the window elapses", async () => {
    const { checkRateLimit } = await import("@/lib/ai/rateLimit");

    for (let i = 0; i < 10; i++) checkRateLimit();
    expect(() => checkRateLimit()).toThrow();

    vi.advanceTimersByTime(60_001);

    expect(() => checkRateLimit()).not.toThrow();
  });
});
