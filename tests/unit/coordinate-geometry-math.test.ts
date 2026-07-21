import { describe, expect, it } from "vitest";

import {
  evaluateCurve,
  sampleCurve,
} from "@/components/visuals/mathematical-plot/coordinate-geometry-math";

describe("evaluateCurve", () => {
  it("evaluates a linear curve", () => {
    expect(evaluateCurve({ curveType: "linear", slope: 2, intercept: 1 }, 3)).toBe(7);
  });

  it("evaluates a quadratic curve", () => {
    expect(evaluateCurve({ curveType: "quadratic", a: 1, b: 0, c: 0 }, 3)).toBe(9);
  });

  it("evaluates a sine curve", () => {
    const y = evaluateCurve(
      { curveType: "sine", amplitude: 2, frequency: 1, phase: 0 },
      Math.PI / 2
    );
    expect(y).toBeCloseTo(2);
  });
});

describe("sampleCurve", () => {
  it("returns steps + 1 points spanning the given range", () => {
    const points = sampleCurve({ curveType: "linear", slope: 1, intercept: 0 }, 0, 10, 10);
    expect(points).toHaveLength(11);
    expect(points[0].x).toBe(0);
    expect(points[points.length - 1].x).toBe(10);
  });
});
