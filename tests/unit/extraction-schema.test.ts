import { describe, expect, it } from "vitest";

import { extractedSourceSchema } from "@/lib/schema/extraction";

describe("extractedSourceSchema", () => {
  it("accepts a non-empty markdown string", () => {
    expect(extractedSourceSchema.parse({ markdown: "# Heading\n\nSome text." })).toEqual({
      markdown: "# Heading\n\nSome text.",
    });
  });

  it("rejects an empty markdown string", () => {
    expect(() => extractedSourceSchema.parse({ markdown: "" })).toThrow();
  });

  it("rejects a missing markdown field", () => {
    expect(() => extractedSourceSchema.parse({})).toThrow();
  });
});
