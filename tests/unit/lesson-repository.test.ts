import { afterEach, describe, expect, it } from "vitest";

import { createChargedSphereMockLesson } from "@/lib/mock/chargedSphereLesson";
import { getDb } from "@/lib/storage/db";
import {
  deleteLesson,
  getLesson,
  listLessons,
  saveLesson,
} from "@/lib/storage/lessonRepository";

afterEach(async () => {
  const lessons = await listLessons();
  await Promise.all(lessons.map((lesson) => deleteLesson(lesson.id)));
});

describe("lessonRepository", () => {
  it("saves and retrieves a lesson", async () => {
    const lesson = createChargedSphereMockLesson();
    await saveLesson(lesson);

    const fetched = await getLesson(lesson.id);
    expect(fetched?.title).toBe(lesson.title);
    expect(fetched?.sections).toHaveLength(4);
  });

  it("lists lessons newest-updated first", async () => {
    const older = createChargedSphereMockLesson();
    older.id = "older";
    older.updatedAt = new Date("2025-01-01").toISOString();

    const newer = createChargedSphereMockLesson();
    newer.id = "newer";
    newer.updatedAt = new Date("2025-06-01").toISOString();

    await saveLesson(older);
    await saveLesson(newer);

    const lessons = await listLessons();
    expect(lessons.map((l) => l.id)).toEqual(["newer", "older"]);
  });

  it("deletes a lesson", async () => {
    const lesson = createChargedSphereMockLesson();
    await saveLesson(lesson);
    await deleteLesson(lesson.id);

    expect(await getLesson(lesson.id)).toBeUndefined();
  });

  it("rejects a lesson that fails schema validation", async () => {
    const invalid = { ...createChargedSphereMockLesson(), title: "" };
    await expect(saveLesson(invalid)).rejects.toThrow();
  });

  it("backfills curiosityQuestions on a lesson saved before that field existed", async () => {
    // Simulates a real record already sitting in a user's IndexedDB from
    // before curiosityQuestions was added to the schema — written directly,
    // bypassing saveLesson's own validation, the same way old data already
    // on disk bypasses it. getLesson/listLessons must backfill the missing
    // field rather than handing back `undefined` for it (which crashed
    // CuriosityQuestions' `.length` check — see normalizeLesson).
    const legacy = createChargedSphereMockLesson();
    legacy.id = "legacy-lesson";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (legacy.sections[0] as any).curiosityQuestions = undefined;

    const db = await getDb();
    await db.put("lessons", legacy);

    const fetched = await getLesson("legacy-lesson");
    expect(fetched?.sections[0].curiosityQuestions).toEqual([]);

    const listed = await listLessons();
    const found = listed.find((l) => l.id === "legacy-lesson");
    expect(found?.sections[0].curiosityQuestions).toEqual([]);
  });
});
