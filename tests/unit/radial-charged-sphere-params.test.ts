import { describe, expect, it } from "vitest";

import { radialChargedSphereParamsSchema } from "@/lib/schema/templates/radialChargedSphere";

describe("radialChargedSphereParamsSchema", () => {
  it("fills in defaults for an empty object", () => {
    const parsed = radialChargedSphereParamsSchema.parse({});
    expect(parsed).toEqual({
      sphereType: "solid-insulator",
      chargeSign: "positive",
      showGaussianSurface: true,
      showFieldVectors: true,
      showIntegralPath: false,
      showPotentialPlot: true,
      initialObservationRadiusRatio: 0.6,
    });
  });

  it("accepts a fully specified shell configuration", () => {
    const parsed = radialChargedSphereParamsSchema.parse({
      sphereType: "shell",
      chargeSign: "negative",
      showGaussianSurface: false,
      showFieldVectors: false,
      showIntegralPath: true,
      showPotentialPlot: false,
      initialObservationRadiusRatio: 1.2,
    });
    expect(parsed.sphereType).toBe("shell");
    expect(parsed.chargeSign).toBe("negative");
  });

  it("rejects an unknown sphereType", () => {
    expect(() =>
      radialChargedSphereParamsSchema.parse({ sphereType: "toroid" })
    ).toThrow();
  });

  it("rejects an out-of-range initialObservationRadiusRatio", () => {
    expect(() =>
      radialChargedSphereParamsSchema.parse({ initialObservationRadiusRatio: 5 })
    ).toThrow();
  });
});
