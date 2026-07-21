import type { ApiUsageRecord } from "@/lib/storage/db";

import { getDb } from "./db";

export type ApiUsageOperation = ApiUsageRecord["operation"];

export interface GeminiCallUsage {
  model: string;
  promptTokens: number;
  candidatesTokens: number;
  thoughtsTokens: number;
  totalTokens: number;
}

/**
 * Records one entry per Gemini call an AI route made (a route that needed
 * a repair retry contributes two). Best-effort: storage failing (e.g.
 * IndexedDB unavailable in private browsing) must never break the feature
 * that triggered it, so failures are logged, not thrown.
 */
export async function recordApiUsage(
  operation: ApiUsageOperation,
  calls: GeminiCallUsage[]
): Promise<void> {
  if (calls.length === 0) return;
  try {
    const db = await getDb();
    const tx = db.transaction("apiUsage", "readwrite");
    const timestamp = new Date().toISOString();
    await Promise.all([
      ...calls.map((call) =>
        tx.store.put({
          id: crypto.randomUUID(),
          timestamp,
          operation,
          ...call,
        })
      ),
      tx.done,
    ]);
  } catch (err) {
    console.warn("Failed to record API usage locally", err);
  }
}

/**
 * Every AI route attaches an `apiUsage` array to its JSON response (see
 * jsonWithUsage.ts) before the client validates the rest of the body
 * against its own schema, which would otherwise silently strip an unknown
 * field. Callers pull it out with this helper right after `response.json()`.
 */
export function recordApiUsageFromResponseBody(
  operation: ApiUsageOperation,
  body: unknown
): void {
  const usage = (body as { apiUsage?: unknown } | null)?.apiUsage;
  if (Array.isArray(usage)) {
    void recordApiUsage(operation, usage as GeminiCallUsage[]);
  }
}

export async function getApiUsageSince(sinceIso: string): Promise<ApiUsageRecord[]> {
  const db = await getDb();
  const range = IDBKeyRange.lowerBound(sinceIso);
  return db.getAllFromIndex("apiUsage", "by-timestamp", range);
}

export async function getAllApiUsage(): Promise<ApiUsageRecord[]> {
  const db = await getDb();
  return db.getAll("apiUsage");
}

/** Keeps the local usage log from growing unbounded; called opportunistically from the Settings page. */
export async function pruneApiUsageOlderThan(days: number): Promise<void> {
  const cutoffIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const db = await getDb();
  const tx = db.transaction("apiUsage", "readwrite");
  const range = IDBKeyRange.upperBound(cutoffIso, true);
  let cursor = await tx.store.index("by-timestamp").openCursor(range);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}
