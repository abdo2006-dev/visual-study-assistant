import { describe, expect, it } from "vitest";

import { lessonVerificationSchema } from "@/lib/schema/verification";

describe("lessonVerificationSchema", () => {
  it("accepts a result with no issues", () => {
    const result = lessonVerificationSchema.safeParse({
      checkedAt: new Date().toISOString(),
      summary: "No inconsistencies found.",
      issues: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a result with a categorized issue", () => {
    const result = lessonVerificationSchema.safeParse({
      checkedAt: new Date().toISOString(),
      summary: "One issue found.",
      issues: [
        {
          category: "incorrect-sign",
          description: "The explanation says the field is negative but the equation is positive.",
          sectionId: "s1",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown category", () => {
    const result = lessonVerificationSchema.safeParse({
      checkedAt: new Date().toISOString(),
      summary: "x",
      issues: [{ category: "not-a-real-category", description: "x" }],
    });
    expect(result.success).toBe(false);
  });
});
