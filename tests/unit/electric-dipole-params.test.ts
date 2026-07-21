import { describe, expect, it } from "vitest";

import { electricDipoleParamsSchema } from "@/lib/schema/templates/electricDipole";

describe("electricDipoleParamsSchema", () => {
  it("fills in defaults for an empty object", () => {
    const parsed = electricDipoleParamsSchema.parse({});
    expect(parsed).toEqual({
      mode: "torque-in-field",
      showFieldLines: true,
      showExternalField: true,
      showTorqueVector: true,
      showPotentialEnergyPlot: true,
      initialAngleDegrees: 45,
      initialDistanceRatio: 2.5,
    });
  });

  it("accepts the far-field-comparison mode", () => {
    const parsed = electricDipoleParamsSchema.parse({
      mode: "far-field-comparison",
      initialDistanceRatio: 3,
    });
    expect(parsed.mode).toBe("far-field-comparison");
    expect(parsed.initialDistanceRatio).toBe(3);
  });

  it("rejects an out-of-range initialDistanceRatio", () => {
    expect(() =>
      electricDipoleParamsSchema.parse({ initialDistanceRatio: 1 })
    ).toThrow();
    expect(() =>
      electricDipoleParamsSchema.parse({ initialDistanceRatio: 6 })
    ).toThrow();
  });

  it("rejects an unrecognized mode", () => {
    expect(() => electricDipoleParamsSchema.parse({ mode: "something-else" })).toThrow();
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
