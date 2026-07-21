import { describe, expect, it } from "vitest";

import { getVisualTemplate } from "@/components/visuals/registry";

describe("getVisualTemplate", () => {
  it("finds the radial-charged-sphere template", () => {
    const template = getVisualTemplate("radial-charged-sphere");
    expect(template).toBeDefined();
    expect(template?.Component).toBeTruthy();
    expect(template?.paramsSchema.safeParse({}).success).toBe(true);
  });

  it("returns undefined for an unknown templateId", () => {
    expect(getVisualTemplate("some-future-template")).toBeUndefined();
  });
});
