import { describe, expect, it } from "vitest";

import {
  calculateCircuit,
  pointOnRectangularLoop,
} from "@/components/visuals/scientific-diagram/simple-circuit-math";

const resistors = [
  { id: "r1", label: "R1", resistanceOhms: 100 },
  { id: "r2", label: "R2", resistanceOhms: 100 },
];

describe("calculateCircuit — series", () => {
  it("sums resistances and uses the same current through every resistor", () => {
    const result = calculateCircuit("series", 10, resistors);
    expect(result.totalResistanceOhms).toBe(200);
    expect(result.totalCurrentAmps).toBeCloseTo(0.05);
    for (const r of result.resistorResults) {
      expect(r.currentAmps).toBeCloseTo(0.05);
      expect(r.voltageDropVolts).toBeCloseTo(5);
    }
    const totalDrop = result.resistorResults.reduce((s, r) => s + r.voltageDropVolts, 0);
    expect(totalDrop).toBeCloseTo(10);
  });
});

describe("calculateCircuit — parallel", () => {
  it("halves total resistance for two equal resistors and applies full voltage to each", () => {
    const result = calculateCircuit("parallel", 10, resistors);
    expect(result.totalResistanceOhms).toBeCloseTo(50);
    expect(result.totalCurrentAmps).toBeCloseTo(0.2);
    for (const r of result.resistorResults) {
      expect(r.voltageDropVolts).toBeCloseTo(10);
      expect(r.currentAmps).toBeCloseTo(0.1);
    }
    const totalCurrent = result.resistorResults.reduce((s, r) => s + r.currentAmps, 0);
    expect(totalCurrent).toBeCloseTo(result.totalCurrentAmps);
  });
});

describe("pointOnRectangularLoop", () => {
  const corners = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 50 },
    { x: 0, y: 50 },
  ];

  it("starts exactly at the first corner at fraction 0", () => {
    expect(pointOnRectangularLoop(0, corners)).toEqual({ x: 0, y: 0 });
  });

  it("wraps back to the start at fraction 1", () => {
    const point = pointOnRectangularLoop(1, corners);
    expect(point.x).toBeCloseTo(0);
    expect(point.y).toBeCloseTo(0);
  });

  it("moves at constant speed regardless of segment length (equal fraction steps, equal arc length)", () => {
    // Perimeter is 100+50+100+50 = 300. The first segment (length 100) is
    // 1/3 of the total, so fraction 1/3 should land exactly on the second
    // corner, not partway along a different segment.
    const point = pointOnRectangularLoop(1 / 3, corners);
    expect(point.x).toBeCloseTo(100);
    expect(point.y).toBeCloseTo(0);
  });

  it("negative fractions wrap the same as their positive equivalent", () => {
    const negative = pointOnRectangularLoop(-1 / 3, corners);
    const positive = pointOnRectangularLoop(2 / 3, corners);
    expect(negative.x).toBeCloseTo(positive.x);
    expect(negative.y).toBeCloseTo(positive.y);
  });
});
