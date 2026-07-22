import { z } from "zod";

import { LESSON_SCHEMA_VERSION, type VisualLesson, visualLessonSchema } from "@/lib/schema/lesson";

const lessonPackageSchema = z.object({
  packageType: z.literal("lesson"),
  schemaVersion: z.literal(LESSON_SCHEMA_VERSION),
  exportedAt: z.iso.datetime(),
  lesson: visualLessonSchema,
});

const libraryPackageSchema = z.object({
  packageType: z.literal("library"),
  schemaVersion: z.literal(LESSON_SCHEMA_VERSION),
  exportedAt: z.iso.datetime(),
  lessons: z.array(visualLessonSchema),
});

export class ImportValidationError extends Error {
  constructor(cause: unknown) {
    super("The imported file is not a valid EduViz export.");
    this.name = "ImportValidationError";
    this.cause = cause;
  }
}

export function exportLesson(lesson: VisualLesson): string {
  return JSON.stringify(
    {
      packageType: "lesson",
      schemaVersion: LESSON_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      lesson,
    },
    null,
    2
  );
}

export function exportLibrary(lessons: VisualLesson[]): string {
  return JSON.stringify(
    {
      packageType: "library",
      schemaVersion: LESSON_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      lessons,
    },
    null,
    2
  );
}

export function importLesson(json: string): VisualLesson {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (cause) {
    throw new ImportValidationError(cause);
  }
  const result = lessonPackageSchema.safeParse(parsed);
  if (!result.success) {
    throw new ImportValidationError(result.error);
  }
  return result.data.lesson;
}

export function importLibrary(json: string): VisualLesson[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (cause) {
    throw new ImportValidationError(cause);
  }
  const result = libraryPackageSchema.safeParse(parsed);
  if (!result.success) {
    throw new ImportValidationError(result.error);
  }
  return result.data.lessons;
}

/** Accepts either a single-lesson or a whole-library export file. */
export function importPackage(json: string): VisualLesson[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (cause) {
    throw new ImportValidationError(cause);
  }

  const asLesson = lessonPackageSchema.safeParse(parsed);
  if (asLesson.success) {
    return [asLesson.data.lesson];
  }

  const asLibrary = libraryPackageSchema.safeParse(parsed);
  if (asLibrary.success) {
    return asLibrary.data.lessons;
  }

  throw new ImportValidationError(asLibrary.error);
}
