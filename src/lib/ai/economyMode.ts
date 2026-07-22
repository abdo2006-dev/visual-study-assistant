/**
 * The EconomyMode type and its raw values live here, separate from
 * config.ts (which is "server-only"), so client components — like the
 * settings mode selector — can reference them without pulling in a
 * server-only module.
 */
export const ECONOMY_MODES = ["economical", "balanced", "highest-quality"] as const;

export type EconomyMode = (typeof ECONOMY_MODES)[number];
