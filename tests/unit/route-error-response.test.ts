import { describe, expect, it } from "vitest";

describe("mapAiErrorToResponse", () => {
  it("maps Gemini quota errors to a helpful 429 response", async () => {
    const { mapAiErrorToResponse } = await import("@/lib/ai/routeErrorResponse");
    const error = new Error(
      JSON.stringify({
        error: {
          code: 429,
          status: "RESOURCE_EXHAUSTED",
          message:
            "Quota exceeded for metric: generate_content_free_tier_requests, model: gemini-3.1-flash-image",
          details: [
            {
              violations: [
                {
                  quotaDimensions: {
                    model: "gemini-3.1-flash-image",
                  },
                },
              ],
            },
            {
              retryDelay: "37s",
            },
          ],
        },
      })
    );

    const response = mapAiErrorToResponse(error, {
      timedOut: false,
      logPrefix: "[test]",
    });
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toContain("Gemini is rate limited or out of quota");
    expect(body.error).toContain("gemini-3.1-flash-image");
    expect(body.error).toContain("37 seconds");
  });
});
