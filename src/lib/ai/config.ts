import "server-only";

/**
 * Central place for AI model configuration. Route handlers and provider
 * implementations should import from here rather than referencing model
 * names or reading process.env directly, so the model can be swapped in
 * one place (see IMPLEMENTATION_PLAN.md, Risks section).
 */

export type EconomyMode = "economical" | "balanced" | "highest-quality";

export const geminiModels: Record<EconomyMode, string> = {
  economical: "gemini-2.5-flash-lite",
  balanced: "gemini-2.5-flash",
  "highest-quality": "gemini-2.5-pro",
};

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      "GEMINI_API_KEY is not set. Add it to .env.local (see .env.example) and restart the dev server."
    );
    this.name = "MissingApiKeyError";
  }
}

/**
 * Reads the API key at call time (request time), not at module load or
 * build time, so a missing key fails a specific AI request with a clear
 * error instead of breaking the build or every unrelated route.
 */
export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new MissingApiKeyError();
  }
  return key;
}

export function getModelFor(mode: EconomyMode): string {
  return geminiModels[mode];
}
