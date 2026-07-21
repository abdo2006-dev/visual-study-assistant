import { describe, expect, it } from "vitest";

import { createChargedSphereMockLesson } from "@/lib/mock/chargedSphereLesson";
import { visualLessonSchema } from "@/lib/schema/lesson";

describe("visualLessonSchema", () => {
  it("accepts a well-formed lesson", () => {
    expect(() =>
      visualLessonSchema.parse(createChargedSphereMockLesson())
    ).not.toThrow();
  });

  it("rejects a lesson with an invalid subject", () => {
    const lesson = { ...createChargedSphereMockLesson(), subject: "sorcery" };
    expect(() => visualLessonSchema.parse(lesson)).toThrow();
  });

  it("rejects a lesson missing a required field", () => {
    const withoutTitle: Record<string, unknown> = createChargedSphereMockLesson();
    delete withoutTitle.title;
    expect(() => visualLessonSchema.parse(withoutTitle)).toThrow();
  });

  it("defaults optional array fields when omitted", () => {
    const withoutPrerequisites: Record<string, unknown> =
      createChargedSphereMockLesson();
    delete withoutPrerequisites.prerequisites;
    const parsed = visualLessonSchema.parse(withoutPrerequisites);
    expect(parsed.prerequisites).toEqual([]);
  });
});
