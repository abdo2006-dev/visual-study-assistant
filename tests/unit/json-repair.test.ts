import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseStructuredJson } from "@/lib/ai/gemini/jsonRepair";

const schema = z.object({ name: z.string() });

describe("parseStructuredJson", () => {
  it("returns success for valid, schema-matching JSON", () => {
    const result = parseStructuredJson('{"name":"Ada"}', schema);
    expect(result).toEqual({ success: true, data: { name: "Ada" } });
  });

  it("returns a failure for malformed JSON syntax", () => {
    const result = parseStructuredJson("{not json", schema);
    expect(result.success).toBe(false);
  });

  it("returns a failure for well-formed JSON that fails the schema", () => {
    const result = parseStructuredJson('{"age":30}', schema);
    expect(result.success).toBe(false);
  });
});
