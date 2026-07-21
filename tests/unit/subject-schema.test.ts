import { describe, expect, it } from "vitest";

import { subjectSchema } from "@/lib/schema/subject";

describe("subjectSchema", () => {
  it("accepts a known subject", () => {
    expect(subjectSchema.parse("physics")).toBe("physics");
  });

  it("rejects an unknown subject", () => {
    expect(() => subjectSchema.parse("astrology")).toThrow();
  });
});
