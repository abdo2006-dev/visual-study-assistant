import { describe, expect, it } from "vitest";

import { infinitePlaneParamsSchema } from "@/lib/schema/templates/infinitePlane";

describe("infinitePlaneParamsSchema", () => {
  it("fills in defaults for an empty object", () => {
    const parsed = infinitePlaneParamsSchema.parse({});
    expect(parsed).toEqual({
      configuration: "single-plane",
      chargeSign: "positive",
      showFieldVectors: true,
      showPotentialPlot: true,
      initialObservationPositionRatio: 1,
    });
  });

  it("accepts a fully specified parallel-plates configuration, including negative positions", () => {
    const parsed = infinitePlaneParamsSchema.parse({
      configuration: "parallel-plates",
      chargeSign: "negative",
      showFieldVectors: false,
      showPotentialPlot: false,
      initialObservationPositionRatio: -1.5,
    });
    expect(parsed.configuration).toBe("parallel-plates");
    expect(parsed.initialObservationPositionRatio).toBe(-1.5);
  });

  it("rejects an unknown configuration", () => {
    expect(() =>
      infinitePlaneParamsSchema.parse({ configuration: "sphere" })
    ).toThrow();
  });

  it("rejects an out-of-range initialObservationPositionRatio", () => {
    expect(() =>
      infinitePlaneParamsSchema.parse({ initialObservationPositionRatio: 5 })
    ).toThrow();
    expect(() =>
      infinitePlaneParamsSchema.parse({ initialObservationPositionRatio: -5 })
    ).toThrow();
  });
});
