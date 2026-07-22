import { ECONOMY_MODES, type EconomyMode } from "@/lib/ai/economyMode";

const STORAGE_KEY = "eduviz:economy-mode-override";

/**
 * Undefined means "no override" — every AI route falls back to its own
 * per-operation default (see AI_PIPELINE.md, Central model configuration).
 * localStorage (not IndexedDB) is deliberate: this is a single synchronous
 * scalar preference, not data worth an object store or an async API.
 */
export function getEconomyModeOverride(): EconomyMode | undefined {
  if (typeof window === "undefined") return undefined;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return (ECONOMY_MODES as readonly string[]).includes(stored ?? "")
    ? (stored as EconomyMode)
    : undefined;
}

export function setEconomyModeOverride(mode: EconomyMode | undefined): void {
  if (typeof window === "undefined") return;
  if (mode === undefined) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }
}
