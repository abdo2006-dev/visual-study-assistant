import { describe, expect, it } from "vitest";

import {
  angleDegreesOf,
  magnitudeOf,
  resultantComponents,
  vectorComponents,
} from "@/components/visuals/scientific-diagram/force-vector-diagram-math";

describe("vectorComponents", () => {
  it("decomposes a vector along the +x axis", () => {
    const { x, y } = vectorComponents({ magnitude: 1, angleDegrees: 0 });
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
  });

  it("decomposes a vector along the +y axis (90 degrees, counterclockwise)", () => {
    const { x, y } = vectorComponents({ magnitude: 1, angleDegrees: 90 });
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(-1); // SVG y is flipped
  });
});

describe("resultantComponents", () => {
  it("sums two opposing equal vectors to zero", () => {
    const result = resultantComponents([
      { magnitude: 1, angleDegrees: 0 },
      { magnitude: 1, angleDegrees: 180 },
    ]);
    expect(magnitudeOf(result)).toBeCloseTo(0);
  });

  it("sums two perpendicular unit vectors to magnitude sqrt(2)", () => {
    const result = resultantComponents([
      { magnitude: 1, angleDegrees: 0 },
      { magnitude: 1, angleDegrees: 90 },
    ]);
    expect(magnitudeOf(result)).toBeCloseTo(Math.SQRT2);
    expect(angleDegreesOf(result)).toBeCloseTo(45);
  });
});
