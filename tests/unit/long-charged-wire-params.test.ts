import { describe, expect, it } from "vitest";

import { longChargedWireParamsSchema } from "@/lib/schema/templates/longChargedWire";

describe("longChargedWireParamsSchema", () => {
  it("fills in defaults for an empty object", () => {
    const parsed = longChargedWireParamsSchema.parse({});
    expect(parsed).toEqual({
      wireType: "solid-insulator",
      chargeSign: "positive",
      showGaussianSurface: true,
      showFieldVectors: true,
      showPotentialPlot: true,
      initialObservationRadiusRatio: 0.6,
    });
  });

  it("accepts a fully specified conducting-shell configuration", () => {
    const parsed = longChargedWireParamsSchema.parse({
      wireType: "conducting-shell",
      chargeSign: "negative",
      showGaussianSurface: false,
      showFieldVectors: false,
      showPotentialPlot: false,
      initialObservationRadiusRatio: 1.2,
    });
    expect(parsed.wireType).toBe("conducting-shell");
    expect(parsed.chargeSign).toBe("negative");
  });

  it("rejects an unknown wireType", () => {
    expect(() =>
      longChargedWireParamsSchema.parse({ wireType: "toroid" })
    ).toThrow();
  });

  it("rejects an out-of-range initialObservationRadiusRatio", () => {
    expect(() =>
      longChargedWireParamsSchema.parse({ initialObservationRadiusRatio: 5 })
    ).toThrow();
  });
});
