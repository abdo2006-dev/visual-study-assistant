import { type VisualLesson, visualLessonSchema } from "@/lib/schema/lesson";

import { getDb } from "./db";

export async function listLessons(): Promise<VisualLesson[]> {
  const db = await getDb();
  const lessons = await db.getAllFromIndex("lessons", "by-updatedAt");
  return lessons.reverse();
}

export async function getLesson(id: string): Promise<VisualLesson | undefined> {
  const db = await getDb();
  return db.get("lessons", id);
}

export async function saveLesson(lesson: VisualLesson): Promise<VisualLesson> {
  const validated = visualLessonSchema.parse(lesson);
  const db = await getDb();
  await db.put("lessons", validated);
  return validated;
}

export async function deleteLesson(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("lessons", id);
}
