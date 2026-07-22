import type { BulkImportBatch, BulkImportBatchLesson } from "@/lib/storage/db";

import { getDb } from "./db";

export async function createBatch(lessons: BulkImportBatchLesson[]): Promise<BulkImportBatch> {
  const db = await getDb();
  const now = new Date().toISOString();
  const batch: BulkImportBatch = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    lessons,
  };
  await db.put("bulkImportBatches", batch);
  return batch;
}

export async function updateBatchLessons(
  id: string,
  lessons: BulkImportBatchLesson[]
): Promise<void> {
  const db = await getDb();
  const existing = await db.get("bulkImportBatches", id);
  if (!existing) return;
  await db.put("bulkImportBatches", {
    ...existing,
    lessons,
    updatedAt: new Date().toISOString(),
  });
}

export async function getRecentBatches(limit = 5): Promise<BulkImportBatch[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("bulkImportBatches", "by-updatedAt");
  return all.reverse().slice(0, limit);
}

/**
 * A lesson left "pending" or "generating" means the tab closed or reloaded
 * mid-batch (in-flight requests get cancelled by the navigation, and
 * there's no server-side job queue to resume from) — called once on
 * mount so the history view is honest about what actually finished rather
 * than showing a batch stuck at "Generating..." forever.
 */
export async function markStaleBatchesInterrupted(): Promise<void> {
  const db = await getDb();
  const all = await db.getAll("bulkImportBatches");
  for (const batch of all) {
    const hasStale = batch.lessons.some(
      (lesson) => lesson.status === "pending" || lesson.status === "generating"
    );
    if (!hasStale) continue;
    const lessons = batch.lessons.map((lesson) =>
      lesson.status === "pending" || lesson.status === "generating"
        ? { ...lesson, status: "interrupted" as const }
        : lesson
    );
    await db.put("bulkImportBatches", { ...batch, lessons, updatedAt: new Date().toISOString() });
  }
}
