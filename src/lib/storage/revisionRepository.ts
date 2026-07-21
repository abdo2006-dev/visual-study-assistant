import type { VisualLesson } from "@/lib/schema/lesson";

import { getDb } from "./db";

const MAX_HISTORY_LENGTH = 20;

/** Call once when a lesson is first opened, so undo can get back to the pre-edit state even if no revision was ever recorded. A no-op if history already exists. */
export async function initializeRevisionsIfMissing(lesson: VisualLesson): Promise<void> {
  const db = await getDb();
  const existing = await db.get("revisions", lesson.id);
  if (!existing) {
    await db.put("revisions", { lessonId: lesson.id, history: [lesson], pointer: 0 });
  }
}

/** Appends a new state after the current pointer, discarding any redo-able future states, and caps history length. */
export async function recordRevision(lesson: VisualLesson): Promise<void> {
  const db = await getDb();
  const existing = await db.get("revisions", lesson.id);

  let history: VisualLesson[];
  if (!existing) {
    history = [lesson];
  } else {
    history = [...existing.history.slice(0, existing.pointer + 1), lesson];
    if (history.length > MAX_HISTORY_LENGTH) {
      history = history.slice(history.length - MAX_HISTORY_LENGTH);
    }
  }

  await db.put("revisions", { lessonId: lesson.id, history, pointer: history.length - 1 });
}

export async function canUndo(lessonId: string): Promise<boolean> {
  const db = await getDb();
  const existing = await db.get("revisions", lessonId);
  return !!existing && existing.pointer > 0;
}

export async function canRedo(lessonId: string): Promise<boolean> {
  const db = await getDb();
  const existing = await db.get("revisions", lessonId);
  return !!existing && existing.pointer < existing.history.length - 1;
}

export async function undo(lessonId: string): Promise<VisualLesson | undefined> {
  const db = await getDb();
  const existing = await db.get("revisions", lessonId);
  if (!existing || existing.pointer <= 0) return undefined;
  const pointer = existing.pointer - 1;
  await db.put("revisions", { ...existing, pointer });
  return existing.history[pointer];
}

export async function redo(lessonId: string): Promise<VisualLesson | undefined> {
  const db = await getDb();
  const existing = await db.get("revisions", lessonId);
  if (!existing || existing.pointer >= existing.history.length - 1) return undefined;
  const pointer = existing.pointer + 1;
  await db.put("revisions", { ...existing, pointer });
  return existing.history[pointer];
}
