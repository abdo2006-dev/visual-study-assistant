import { describe, expect, it } from "vitest";

import { calculateCircuit } from "@/components/visuals/scientific-diagram/simple-circuit-math";

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
