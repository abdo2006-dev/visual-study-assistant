import { afterEach, describe, expect, it } from "vitest";

import { createChargedSphereMockLesson } from "@/lib/mock/chargedSphereLesson";
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
    expect(fetched?.sections).toHaveLength(3);
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
});
