import { describe, expect, it } from "vitest";

import { lessonPatchSchema } from "@/lib/schema/patch";

describe("lessonPatchSchema", () => {
  it("accepts a replace-explanation patch", () => {
    const result = lessonPatchSchema.safeParse({
      op: "replace-explanation",
      sectionId: "s1",
      simplifiedExplanation: "Simpler text.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a remove-visual patch", () => {
    expect(
      lessonPatchSchema.safeParse({ op: "remove-visual", sectionId: "s1", visualId: "v1" })
        .success
    ).toBe(true);
  });

  it("accepts an add-visual patch", () => {
    const result = lessonPatchSchema.safeParse({
      op: "add-visual",
      sectionId: "s1",
      type: "scientific-diagram",
      templateId: "simple-circuit",
      title: "Circuit",
      educationalPurpose: "test",
      accessibilityDescription: "test",
      parameters: { configuration: "series" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts an add-prerequisite patch", () => {
    expect(
      lessonPatchSchema.safeParse({ op: "add-prerequisite", prerequisite: "Vectors" }).success
    ).toBe(true);
  });

  it("rejects an unknown op", () => {
    expect(lessonPatchSchema.safeParse({ op: "delete-everything" }).success).toBe(false);
  });

  it("rejects replace-explanation missing required fields", () => {
    expect(
      lessonPatchSchema.safeParse({ op: "replace-explanation", sectionId: "s1" }).success
    ).toBe(false);
  });

  it("ignores fields irrelevant to the matched op", () => {
    const result = lessonPatchSchema.safeParse({
      op: "add-prerequisite",
      prerequisite: "Vectors",
      sectionId: "should be ignored",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("sectionId");
    }
  });
});
