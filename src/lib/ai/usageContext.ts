import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

export interface GeminiCallUsage {
  model: string;
  promptTokens: number;
  candidatesTokens: number;
  thoughtsTokens: number;
  totalTokens: number;
}

const storage = new AsyncLocalStorage<GeminiCallUsage[]>();

/**
 * Called from generateWithRepair right after each real Gemini response
 * (including a repair-attempt retry) so every route that wraps its work in
 * `withUsageTracking` gets an accurate per-request usage log, without
 * threading a usage parameter through every provider method and service
 * function in between.
 */
export function recordGeminiUsage(usage: GeminiCallUsage): void {
  storage.getStore()?.push(usage);
}

/**
 * Runs `fn` with a fresh usage collector active for its whole async call
 * tree (survives awaits, matching one HTTP request to one collector — see
 * Node's AsyncLocalStorage docs). Returns both fn's result and every
 * Gemini call captured during it, in order.
 */
export async function withUsageTracking<T>(
  fn: () => Promise<T>
): Promise<{ result: T; usage: GeminiCallUsage[] }> {
  const collector: GeminiCallUsage[] = [];
  const result = await storage.run(collector, fn);
  return { result, usage: collector };
}
