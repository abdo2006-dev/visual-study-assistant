import { beforeEach, describe, expect, it } from "vitest";

import {
  getAllApiUsage,
  getApiUsageSince,
  pruneApiUsageOlderThan,
  recordApiUsage,
  recordApiUsageFromResponseBody,
} from "@/lib/storage/apiUsageRepository";
import { getDb } from "@/lib/storage/db";

async function clearApiUsage() {
  const db = await getDb();
  await db.clear("apiUsage");
}

describe("apiUsageRepository", () => {
  beforeEach(async () => {
    await clearApiUsage();
  });

  it("records one entry per call and reads them back", async () => {
    await recordApiUsage("lesson-plan", [
      { model: "gemini-flash-lite-latest", promptTokens: 10, candidatesTokens: 5, thoughtsTokens: 0, totalTokens: 15 },
      { model: "gemini-flash-lite-latest", promptTokens: 8, candidatesTokens: 4, thoughtsTokens: 0, totalTokens: 12 },
    ]);

    const all = await getAllApiUsage();
    expect(all).toHaveLength(2);
    expect(all.every((r) => r.operation === "lesson-plan")).toBe(true);
    expect(all.reduce((sum, r) => sum + r.totalTokens, 0)).toBe(27);
  });

  it("does nothing for an empty usage array", async () => {
    await recordApiUsage("extract", []);
    expect(await getAllApiUsage()).toEqual([]);
  });

  it("getApiUsageSince excludes records before the cutoff", async () => {
    const db = await getDb();
    await db.put("apiUsage", {
      id: "old",
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      operation: "lesson-plan",
      model: "m",
      promptTokens: 1,
      candidatesTokens: 1,
      thoughtsTokens: 0,
      totalTokens: 2,
    });
    await db.put("apiUsage", {
      id: "recent",
      timestamp: new Date().toISOString(),
      operation: "lesson-plan",
      model: "m",
      promptTokens: 1,
      candidatesTokens: 1,
      thoughtsTokens: 0,
      totalTokens: 2,
    });

    const since = await getApiUsageSince(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    expect(since.map((r) => r.id)).toEqual(["recent"]);
  });

  it("pruneApiUsageOlderThan removes only entries past the cutoff", async () => {
    const db = await getDb();
    await db.put("apiUsage", {
      id: "old",
      timestamp: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
      operation: "lesson-plan",
      model: "m",
      promptTokens: 1,
      candidatesTokens: 1,
      thoughtsTokens: 0,
      totalTokens: 2,
    });
    await db.put("apiUsage", {
      id: "recent",
      timestamp: new Date().toISOString(),
      operation: "lesson-plan",
      model: "m",
      promptTokens: 1,
      candidatesTokens: 1,
      thoughtsTokens: 0,
      totalTokens: 2,
    });

    await pruneApiUsageOlderThan(90);
    const remaining = await getAllApiUsage();
    expect(remaining.map((r) => r.id)).toEqual(["recent"]);
  });

  it("recordApiUsageFromResponseBody extracts and records the apiUsage array", async () => {
    recordApiUsageFromResponseBody("verify-lesson", {
      summary: "ok",
      apiUsage: [
        { model: "gemini-flash-lite-latest", promptTokens: 5, candidatesTokens: 2, thoughtsTokens: 0, totalTokens: 7 },
      ],
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    const all = await getAllApiUsage();
    expect(all).toHaveLength(1);
    expect(all[0].operation).toBe("verify-lesson");
  });

  it("recordApiUsageFromResponseBody is a no-op when apiUsage is missing", async () => {
    recordApiUsageFromResponseBody("verify-lesson", { summary: "ok" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await getAllApiUsage()).toEqual([]);
  });
});
