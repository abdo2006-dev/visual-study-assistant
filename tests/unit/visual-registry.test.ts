import { describe, expect, it } from "vitest";

import { getVisualTemplate } from "@/components/visuals/registry";

const expectedTemplateIds = [
  "radial-charged-sphere",
  "force-vector-diagram",
  "particle-container",
  "process-flow-diagram",
  "coordinate-geometry",
  "wave-diagram",
  "simple-circuit",
  "long-charged-wire",
  "infinite-plane",
  "electric-dipole",
  "dielectric-polarization",
];

describe("getVisualTemplate", () => {
  it.each(expectedTemplateIds)("finds the %s template with a valid empty-object default", (templateId) => {
    const template = getVisualTemplate(templateId);
    expect(template).toBeDefined();
    expect(template?.Component).toBeTruthy();
    expect(template?.paramsSchema.safeParse({}).success).toBe(true);
  });

  it("returns undefined for an unknown templateId", () => {
    expect(getVisualTemplate("some-future-template")).toBeUndefined();
  });

  it("finds the generated-illustration template with a valid image prompt", () => {
    const template = getVisualTemplate("generated-illustration");
    expect(template).toBeDefined();
    expect(template?.Component).toBeTruthy();
    expect(
      template?.paramsSchema.safeParse({
        imagePrompt: "Show a clear before and after capacitor illustration.",
      }).success
    ).toBe(true);
  });
});
