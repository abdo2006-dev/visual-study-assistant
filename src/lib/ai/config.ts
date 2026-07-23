import "server-only";

import { z } from "zod";

import { ECONOMY_MODES, type EconomyMode } from "@/lib/ai/economyMode";

/**
 * Central place for AI model configuration. Route handlers and provider
 * implementations should import from here rather than referencing model
 * names or reading process.env directly, so the model can be swapped in
 * one place (see IMPLEMENTATION_PLAN.md, Risks section).
 */

export const economyModeSchema = z.enum(ECONOMY_MODES);

export type { EconomyMode };

// Google's own rolling aliases rather than a dated model name, so this
// doesn't go stale as specific model versions are sunset (see
// IMPLEMENTATION_PLAN.md, Risks section).
export const geminiModels: Record<EconomyMode, string> = {
  economical: "gemini-flash-lite-latest",
  balanced: "gemini-flash-latest",
  "highest-quality": "gemini-pro-latest",
};

export const geminiImageGenerationModel = "gemini-3.1-flash-image";

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
