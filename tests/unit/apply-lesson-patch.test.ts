import { describe, expect, it } from "vitest";

import {
  applyLessonPatch,
  applyLessonPatches,
  PatchApplicationError,
} from "@/lib/lessonPatch/applyLessonPatch";
import { createChargedSphereMockLesson } from "@/lib/mock/chargedSphereLesson";

function lesson() {
  return createChargedSphereMockLesson();
}

describe("applyLessonPatch", () => {
  it("replace-explanation updates the target section only", () => {
    const result = applyLessonPatch(lesson(), {
      op: "replace-explanation",
      sectionId: "region-inside",
      simplifiedExplanation: "New text.",
    });
    const section = result.sections.find((s) => s.id === "region-inside");
    expect(section?.simplifiedExplanation).toBe("New text.");
    const other = result.sections.find((s) => s.id === "region-outside");
    expect(other?.simplifiedExplanation).not.toBe("New text.");
  });

  it("throws when the section doesn't exist", () => {
    expect(() =>
      applyLessonPatch(lesson(), {
        op: "replace-explanation",
        sectionId: "nonexistent",
        simplifiedExplanation: "x",
      })
    ).toThrow(PatchApplicationError);
  });

  it("remove-visual removes only the named visual", () => {
    const result = applyLessonPatch(lesson(), {
      op: "remove-visual",
      sectionId: "interactive-exploration",
      visualId: "sphere-visual",
    });
    const section = result.sections.find((s) => s.id === "interactive-exploration");
    expect(section?.visuals).toHaveLength(0);
  });

  it("throws when the visual doesn't exist", () => {
    expect(() =>
      applyLessonPatch(lesson(), {
        op: "remove-visual",
        sectionId: "interactive-exploration",
        visualId: "nonexistent",
      })
    ).toThrow(PatchApplicationError);
  });

  it("update-visual-parameters merges into existing parameters", () => {
    const result = applyLessonPatch(lesson(), {
      op: "update-visual-parameters",
      sectionId: "interactive-exploration",
      visualId: "sphere-visual",
      parameters: { chargeSign: "negative" },
    });
    const visual = result.sections
      .find((s) => s.id === "interactive-exploration")
      ?.visuals.find((v) => v.id === "sphere-visual");
    expect(visual?.parameters.chargeSign).toBe("negative");
    expect(visual?.parameters.sphereType).toBe("solid-insulator");
  });

  it("add-visual appends a new visual with a generated id", () => {
    const result = applyLessonPatch(lesson(), {
      op: "add-visual",
      sectionId: "region-inside",
      type: "scientific-diagram",
      templateId: "simple-circuit",
      title: "Circuit",
      educationalPurpose: "test",
      accessibilityDescription: "test",
      parameters: {},
    });
    const section = result.sections.find((s) => s.id === "region-inside");
    expect(section?.visuals).toHaveLength(1);
    expect(section?.visuals[0].templateId).toBe("simple-circuit");
    expect(section?.visuals[0].id).toBeTruthy();
  });

  it("remove-section deletes the section", () => {
    const result = applyLessonPatch(lesson(), {
      op: "remove-section",
      sectionId: "continuity-at-surface",
    });
    expect(result.sections.some((s) => s.id === "continuity-at-surface")).toBe(false);
    expect(result.sections).toHaveLength(3);
  });

  it("add-prerequisite appends to the lesson's prerequisites", () => {
    const original = lesson();
    const result = applyLessonPatch(original, {
      op: "add-prerequisite",
      prerequisite: "Vectors",
    });
    expect(result.prerequisites).toEqual([...original.prerequisites, "Vectors"]);
  });
});

describe("applyLessonPatches", () => {
  it("applies multiple patches in order and returns a schema-valid lesson", () => {
    const result = applyLessonPatches(lesson(), [
      { op: "add-prerequisite", prerequisite: "Vectors" },
      {
        op: "replace-explanation",
        sectionId: "region-inside",
        simplifiedExplanation: "Updated.",
      },
    ]);
    expect(result.prerequisites).toContain("Vectors");
    expect(
      result.sections.find((s) => s.id === "region-inside")?.simplifiedExplanation
    ).toBe("Updated.");
  });
});
