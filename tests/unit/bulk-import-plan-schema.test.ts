import { describe, expect, it } from "vitest";

import { bulkImportPlanSchema } from "@/lib/schema/bulkImportPlan";

describe("bulkImportPlanSchema", () => {
  it("accepts a plan with one or more lessons", () => {
    const result = bulkImportPlanSchema.parse({
      lessons: [{ title: "Electric Flux", sourceText: "Flux is defined as..." }],
    });
    expect(result.lessons).toHaveLength(1);
  });

  it("accepts an optional topic field", () => {
    const result = bulkImportPlanSchema.parse({
      lessons: [{ title: "T", topic: "Electromagnetism", sourceText: "x" }],
    });
    expect(result.lessons[0].topic).toBe("Electromagnetism");
  });

  it("rejects an empty lessons array", () => {
    expect(() => bulkImportPlanSchema.parse({ lessons: [] })).toThrow();
  });

  it("rejects a lesson missing sourceText", () => {
    expect(() =>
      bulkImportPlanSchema.parse({ lessons: [{ title: "T" }] })
    ).toThrow();
  });

  it("rejects a lesson with an empty title", () => {
    expect(() =>
      bulkImportPlanSchema.parse({ lessons: [{ title: "", sourceText: "x" }] })
    ).toThrow();
  });
});
