import { describe, expect, it } from "vitest";

import { createChargedSphereMockLesson } from "@/lib/mock/chargedSphereLesson";
import {
  ImportValidationError,
  exportLesson,
  exportLibrary,
  importLesson,
  importLibrary,
  importPackage,
} from "@/lib/storage/exportImport";

describe("export/import", () => {
  it("round-trips a single lesson byte-for-byte on schema-relevant fields", () => {
    const lesson = createChargedSphereMockLesson();
    const roundTripped = importLesson(exportLesson(lesson));
    expect(roundTripped).toEqual(lesson);
  });

  it("round-trips a whole library", () => {
    const lessons = [
      createChargedSphereMockLesson(),
      createChargedSphereMockLesson(),
    ];
    const roundTripped = importLibrary(exportLibrary(lessons));
    expect(roundTripped).toEqual(lessons);
  });

  it("importPackage accepts both single-lesson and library exports", () => {
    const lesson = createChargedSphereMockLesson();
    expect(importPackage(exportLesson(lesson))).toEqual([lesson]);

    const lessons = [lesson, createChargedSphereMockLesson()];
    expect(importPackage(exportLibrary(lessons))).toEqual(lessons);
  });

  it("rejects malformed JSON", () => {
    expect(() => importLesson("{not valid json")).toThrow(
      ImportValidationError
    );
  });

  it("rejects well-formed JSON that isn't a recognized export package", () => {
    expect(() => importPackage(JSON.stringify({ hello: "world" }))).toThrow(
      ImportValidationError
    );
  });
});
