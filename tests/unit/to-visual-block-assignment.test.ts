import { describe, expect, it } from "vitest";

import { toVisualBlockAssignment } from "@/lib/ai/gemini/toVisualBlockAssignment";

const baseRaw = {
  sectionId: "s1",
  type: "scientific-diagram",
  templateId: "radial-charged-sphere",
  title: "Field inside the sphere",
  educationalPurpose: "Shows how the field grows linearly inside.",
  accessibilityDescription: "A charged sphere cross-section with a slider.",
  parametersJson: '{"sphereType":"shell"}',
};

describe("toVisualBlockAssignment", () => {
  it("expands a valid assignment into a ready VisualBlock", () => {
    const result = toVisualBlockAssignment(baseRaw);

    expect(result?.sectionId).toBe("s1");
    expect(result?.visual.templateId).toBe("radial-charged-sphere");
    expect(result?.visual.parameters).toMatchObject({ sphereType: "shell" });
    expect(result?.visual.generationStatus).toBe("ready");
    expect(result?.visual.id).toBeTruthy();
  });

  it("fills in defaults for parameters not specified", () => {
    const result = toVisualBlockAssignment({ ...baseRaw, parametersJson: "{}" });
    expect(result?.visual.parameters).toMatchObject({ sphereType: "solid-insulator" });
  });

  it("marks generated illustrations as pending until image data is materialized", () => {
    const result = toVisualBlockAssignment({
      ...baseRaw,
      type: "generated-illustration",
      templateId: "generated-illustration",
      parametersJson:
        '{"imagePrompt":"Show a dielectric capacitor comparison with clear labels."}',
    });

    expect(result?.visual.generationStatus).toBe("pending");
  });

  it("returns null for an unrecognized templateId", () => {
    expect(toVisualBlockAssignment({ ...baseRaw, templateId: "not-a-real-template" })).toBeNull();
  });

  it("returns null for an unrecognized visual block type", () => {
    expect(toVisualBlockAssignment({ ...baseRaw, type: "not-a-real-type" })).toBeNull();
  });

  it("returns null when parametersJson is malformed", () => {
    expect(toVisualBlockAssignment({ ...baseRaw, parametersJson: "{not valid" })).toBeNull();
  });

  it("returns null when parameters fail the template's own schema", () => {
    expect(
      toVisualBlockAssignment({ ...baseRaw, parametersJson: '{"sphereType":"not-a-variant"}' })
    ).toBeNull();
  });
});
