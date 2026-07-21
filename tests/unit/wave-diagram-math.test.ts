import { describe, expect, it } from "vitest";

import {
  nextPhase,
  sampleWave,
} from "@/components/visuals/mathematical-plot/wave-diagram-math";

describe("sampleWave", () => {
  it("starts at 0 with zero phase", () => {
    const points = sampleWave(1, 1, 0, 0, 4, 4);
    expect(points[0].y).toBeCloseTo(0);
  });

  it("scales with amplitude", () => {
    const points = sampleWave(2, 1, Math.PI / 2, 0, 1, 1);
    expect(points[0].y).toBeCloseTo(2);
  });
});

describe("nextPhase", () => {
  it("decreases phase for rightward propagation", () => {
    const phase = nextPhase(0, "right", 1, 0.1);
    expect(phase).toBeLessThan(0);
  });

  it("increases phase for leftward propagation", () => {
    const phase = nextPhase(0, "left", 1, 0.1);
    expect(phase).toBeGreaterThan(0);
  });

  it("scales with speed", () => {
    const slow = Math.abs(nextPhase(0, "right", 1, 0.1));
    const fast = Math.abs(nextPhase(0, "right", 2, 0.1));
    expect(fast).toBeCloseTo(slow * 2);
  });
});
