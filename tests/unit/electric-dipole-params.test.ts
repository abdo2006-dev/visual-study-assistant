import { describe, expect, it } from "vitest";

import { electricDipoleParamsSchema } from "@/lib/schema/templates/electricDipole";

describe("electricDipoleParamsSchema", () => {
  it("fills in defaults for an empty object", () => {
    const parsed = electricDipoleParamsSchema.parse({});
    expect(parsed).toEqual({
      showFieldLines: true,
      showExternalField: true,
      showTorqueVector: true,
      showPotentialEnergyPlot: true,
      initialAngleDegrees: 45,
    });
  });

  it("accepts a fully specified configuration", () => {
    const parsed = electricDipoleParamsSchema.parse({
      showFieldLines: false,
      showExternalField: false,
      showTorqueVector: false,
      showPotentialEnergyPlot: false,
      initialAngleDegrees: 180,
    });
    expect(parsed.initialAngleDegrees).toBe(180);
  });

  it("rejects an out-of-range initialAngleDegrees", () => {
    expect(() =>
      electricDipoleParamsSchema.parse({ initialAngleDegrees: 181 })
    ).toThrow();
    expect(() =>
      electricDipoleParamsSchema.parse({ initialAngleDegrees: -1 })
    ).toThrow();
  });

  it("rejects a non-boolean showFieldLines", () => {
    expect(() =>
      electricDipoleParamsSchema.parse({ showFieldLines: "yes" })
    ).toThrow();
  });
});
