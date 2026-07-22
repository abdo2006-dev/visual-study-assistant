import { describe, expect, it } from "vitest";

import { createChargedSphereMockLesson } from "@/lib/mock/chargedSphereLesson";
import { getDb } from "@/lib/storage/db";
import {
  canRedo,
  canUndo,
  initializeRevisionsIfMissing,
  recordRevision,
  redo,
  undo,
} from "@/lib/storage/revisionRepository";

function withTitle(lesson: ReturnType<typeof createChargedSphereMockLesson>, title: string) {
  return { ...lesson, title };
}

describe("revisionRepository", () => {
  it("undo is unavailable right after initializing with the baseline state", async () => {
    const lesson = createChargedSphereMockLesson();
    await initializeRevisionsIfMissing(lesson);
    expect(await canUndo(lesson.id)).toBe(false);
    expect(await canRedo(lesson.id)).toBe(false);
  });

  it("undo restores the previous state after one recorded edit", async () => {
    const original = createChargedSphereMockLesson();
    await initializeRevisionsIfMissing(original);

    const edited = withTitle(original, "Edited title");
    await recordRevision(edited);

    expect(await canUndo(original.id)).toBe(true);
    const restored = await undo(original.id);
    expect(restored?.title).toBe(original.title);
  });

  it("redo re-applies an edit that was undone", async () => {
    const original = createChargedSphereMockLesson();
    await initializeRevisionsIfMissing(original);
    const edited = withTitle(original, "Edited title");
    await recordRevision(edited);

    await undo(original.id);
    expect(await canRedo(original.id)).toBe(true);
    const redone = await redo(original.id);
    expect(redone?.title).toBe("Edited title");
  });

  it("a new edit after an undo discards the redo-able future", async () => {
    const original = createChargedSphereMockLesson();
    await initializeRevisionsIfMissing(original);
    await recordRevision(withTitle(original, "First edit"));
    await undo(original.id);

    await recordRevision(withTitle(original, "Second edit"));
    expect(await canRedo(original.id)).toBe(false);
  });

  it("undo/redo return undefined at the ends of history", async () => {
    const lesson = createChargedSphereMockLesson();
    await initializeRevisionsIfMissing(lesson);
    expect(await undo(lesson.id)).toBeUndefined();
    expect(await redo(lesson.id)).toBeUndefined();
  });

  it("backfills curiosityQuestions on a history snapshot saved before that field existed", async () => {
    // Same back-compat scenario as lesson-repository.test.ts, but for a
    // revision snapshot written directly to bypass normalization, the way a
    // real pre-Milestone-17 snapshot already on disk would be.
    const original = createChargedSphereMockLesson();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (original.sections[0] as any).curiosityQuestions = undefined;
    const edited = withTitle(original, "Edited title");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (edited.sections[0] as any).curiosityQuestions = undefined;

    const db = await getDb();
    await db.put("revisions", { lessonId: original.id, history: [original, edited], pointer: 1 });

    const restored = await undo(original.id);
    expect(restored?.sections[0].curiosityQuestions).toEqual([]);
  });
});
