import { describe, expect, it } from "vitest";

import {
  fieldArrowAngles,
  fieldEquationLatex,
  generateChargeMarkerPositions,
  getRegion,
  normalizedFieldMagnitude,
  normalizedPotential,
  potentialEquationLatex,
  regionCaption,
} from "@/components/visuals/scientific-diagram/radial-charged-sphere-physics";

describe("getRegion", () => {
  it("classifies inside, surface, and outside", () => {
    expect(getRegion(0)).toBe("inside");
    expect(getRegion(0.5)).toBe("inside");
    expect(getRegion(1)).toBe("surface");
    expect(getRegion(0.99)).toBe("surface");
    expect(getRegion(1.01)).toBe("surface");
    expect(getRegion(1.5)).toBe("outside");
    expect(getRegion(2)).toBe("outside");
  });
});

describe("normalizedFieldMagnitude", () => {
  it("grows linearly inside a solid sphere, peaking at 1 at the surface", () => {
    expect(normalizedFieldMagnitude(0, "solid-insulator")).toBe(0);
    expect(normalizedFieldMagnitude(0.5, "solid-insulator")).toBeCloseTo(0.5);
    expect(normalizedFieldMagnitude(1, "solid-insulator")).toBeCloseTo(1);
  });

  it("is zero inside a shell", () => {
    expect(normalizedFieldMagnitude(0, "shell")).toBe(0);
    expect(normalizedFieldMagnitude(0.99, "shell")).toBe(0);
  });

  it("falls off as 1/r^2 outside, for both sphere types", () => {
    expect(normalizedFieldMagnitude(1, "solid-insulator")).toBeCloseTo(1);
    expect(normalizedFieldMagnitude(1, "shell")).toBeCloseTo(1);
    expect(normalizedFieldMagnitude(2, "solid-insulator")).toBeCloseTo(0.25);
  });
});

describe("normalizedPotential", () => {
  it("is 1.5x the surface value at the center of a solid sphere", () => {
    expect(normalizedPotential(0, "solid-insulator")).toBeCloseTo(1.5);
    expect(normalizedPotential(1, "solid-insulator")).toBeCloseTo(1);
  });

  it("is constant and equal to the surface value inside a shell", () => {
    expect(normalizedPotential(0, "shell")).toBeCloseTo(1);
    expect(normalizedPotential(0.5, "shell")).toBeCloseTo(1);
  });

  it("falls off as 1/r outside", () => {
    expect(normalizedPotential(2, "solid-insulator")).toBeCloseTo(0.5);
    expect(normalizedPotential(1, "solid-insulator")).toBeCloseTo(
      normalizedPotential(1, "shell")
    );
  });
});

describe("equation selection", () => {
  it("picks the inside field/potential formulas for a solid sphere", () => {
    expect(fieldEquationLatex("inside", "solid-insulator")).toContain("kQr");
    expect(potentialEquationLatex("inside", "solid-insulator")).toContain("3 -");
  });

  it("picks the outside formulas outside", () => {
    expect(fieldEquationLatex("outside", "solid-insulator")).toContain("r^2");
    expect(potentialEquationLatex("outside", "solid-insulator")).toBe(
      "V(r) = \\dfrac{kQ}{r}"
    );
  });

  it("shows a zero field inside a shell", () => {
    expect(fieldEquationLatex("inside", "shell")).toBe("E(r) = 0");
  });
});

describe("regionCaption", () => {
  it("returns a distinct, non-empty caption for every region and sphere type", () => {
    const combos = [
      ["inside", "solid-insulator"],
      ["inside", "shell"],
      ["surface", "solid-insulator"],
      ["outside", "solid-insulator"],
    ] as const;
    const captions = combos.map(([region, type]) => regionCaption(region, type));
    expect(new Set(captions).size).toBe(captions.length);
    for (const caption of captions) {
      expect(caption.length).toBeGreaterThan(0);
    }
  });
});

describe("generateChargeMarkerPositions", () => {
  it("is deterministic for the same seed", () => {
    const a = generateChargeMarkerPositions(20, "solid-insulator");
    const b = generateChargeMarkerPositions(20, "solid-insulator");
    expect(a).toEqual(b);
  });

  it("places solid-sphere markers within the unit disk", () => {
    const points = generateChargeMarkerPositions(50, "solid-insulator");
    for (const { x, y } of points) {
      expect(Math.sqrt(x * x + y * y)).toBeLessThanOrEqual(1);
    }
  });

  it("places shell markers on the unit circle boundary", () => {
    const points = generateChargeMarkerPositions(50, "shell");
    for (const { x, y } of points) {
      expect(Math.sqrt(x * x + y * y)).toBeCloseTo(1, 5);
    }
  });
});

describe("fieldArrowAngles", () => {
  it("returns evenly spaced angles covering a full circle", () => {
    const angles = fieldArrowAngles(4);
    expect(angles).toEqual([0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]);
  });
});
