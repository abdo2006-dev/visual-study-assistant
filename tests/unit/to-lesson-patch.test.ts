import { describe, expect, it } from "vitest";

import { toLessonPatch } from "@/lib/ai/gemini/toLessonPatch";

describe("toLessonPatch", () => {
  it("passes through an op that needs no parameters", () => {
    const patch = toLessonPatch({ op: "add-prerequisite", prerequisite: "Vectors" });
    expect(patch).toEqual({ op: "add-prerequisite", prerequisite: "Vectors" });
  });

  it("expands a valid parametersJson string into an object", () => {
    const patch = toLessonPatch({
      op: "update-visual-parameters",
      sectionId: "s1",
      visualId: "v1",
      parametersJson: '{"chargeSign":"negative"}',
    });
    expect(patch).toEqual({
      op: "update-visual-parameters",
      sectionId: "s1",
      visualId: "v1",
      parameters: { chargeSign: "negative" },
    });
  });

  it("returns null for an op missing its required fields", () => {
    expect(toLessonPatch({ op: "replace-explanation" })).toBeNull();
  });

  it("returns null when parametersJson is malformed JSON", () => {
    const patch = toLessonPatch({
      op: "update-visual-parameters",
      sectionId: "s1",
      visualId: "v1",
      parametersJson: "{not valid json",
    });
    expect(patch).toBeNull();
  });

  it("returns null for a completely unrecognized op", () => {
    expect(toLessonPatch({ op: "delete-everything" })).toBeNull();
  });
});
