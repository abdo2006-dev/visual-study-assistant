import { beforeEach, describe, expect, it } from "vitest";

import {
  createBatch,
  getRecentBatches,
  markStaleBatchesInterrupted,
  updateBatchLessons,
} from "@/lib/storage/bulkImportBatchRepository";
import { getDb } from "@/lib/storage/db";

async function clearBatches() {
  const db = await getDb();
  await db.clear("bulkImportBatches");
}

describe("bulkImportBatchRepository", () => {
  beforeEach(async () => {
    await clearBatches();
  });

  it("creates a batch and reads it back via getRecentBatches", async () => {
    const batch = await createBatch([{ title: "Lesson A", status: "pending" }]);
    const recent = await getRecentBatches();
    expect(recent).toHaveLength(1);
    expect(recent[0].id).toBe(batch.id);
    expect(recent[0].lessons).toEqual([{ title: "Lesson A", status: "pending" }]);
  });

  it("updateBatchLessons replaces the lessons and bumps updatedAt", async () => {
    const batch = await createBatch([{ title: "Lesson A", status: "pending" }]);
    await new Promise((resolve) => setTimeout(resolve, 2));
    await updateBatchLessons(batch.id, [
      { title: "Lesson A", status: "success", lessonId: "lesson-1" },
    ]);

    const [updated] = await getRecentBatches();
    expect(updated.lessons[0].status).toBe("success");
    expect(updated.lessons[0].lessonId).toBe("lesson-1");
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(batch.updatedAt).getTime()
    );
  });

  it("updateBatchLessons on a nonexistent id is a no-op", async () => {
    await expect(
      updateBatchLessons("does-not-exist", [{ title: "x", status: "pending" }])
    ).resolves.toBeUndefined();
  });

  it("getRecentBatches returns most-recently-updated first, capped at the limit", async () => {
    const first = await createBatch([{ title: "First", status: "success" }]);
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = await createBatch([{ title: "Second", status: "success" }]);

    const recent = await getRecentBatches(1);
    expect(recent).toHaveLength(1);
    expect(recent[0].id).toBe(second.id);
    expect(recent[0].id).not.toBe(first.id);
  });

  it("markStaleBatchesInterrupted marks pending/generating lessons as interrupted", async () => {
    const batch = await createBatch([
      { title: "Finished", status: "success", lessonId: "lesson-1" },
      { title: "Was generating", status: "generating" },
      { title: "Never started", status: "pending" },
    ]);

    await markStaleBatchesInterrupted();

    const [updated] = await getRecentBatches();
    expect(updated.id).toBe(batch.id);
    expect(updated.lessons.map((l) => l.status)).toEqual([
      "success",
      "interrupted",
      "interrupted",
    ]);
  });

  it("markStaleBatchesInterrupted leaves fully-settled batches untouched", async () => {
    await createBatch([
      { title: "Done", status: "success", lessonId: "lesson-1" },
      { title: "Failed", status: "error", error: "oops" },
    ]);

    await markStaleBatchesInterrupted();

    const [batch] = await getRecentBatches();
    expect(batch.lessons.map((l) => l.status)).toEqual(["success", "error"]);
  });
});
