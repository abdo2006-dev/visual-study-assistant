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
} from "@/components/visuals/scientific-diagram/long-charged-wire-physics";

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
  it("grows linearly inside a solid wire, peaking at 1 at the surface", () => {
    expect(normalizedFieldMagnitude(0, "solid-insulator")).toBe(0);
    expect(normalizedFieldMagnitude(0.5, "solid-insulator")).toBeCloseTo(0.5);
    expect(normalizedFieldMagnitude(1, "solid-insulator")).toBeCloseTo(1);
  });

  it("is zero inside a conducting shell", () => {
    expect(normalizedFieldMagnitude(0, "conducting-shell")).toBe(0);
    expect(normalizedFieldMagnitude(0.99, "conducting-shell")).toBe(0);
  });

  it("falls off as 1/r outside, not 1/r^2 — the defining difference from the sphere", () => {
    expect(normalizedFieldMagnitude(1, "solid-insulator")).toBeCloseTo(1);
    expect(normalizedFieldMagnitude(1, "conducting-shell")).toBeCloseTo(1);
    expect(normalizedFieldMagnitude(2, "solid-insulator")).toBeCloseTo(0.5);
    expect(normalizedFieldMagnitude(0.5, "solid-insulator")).toBeCloseTo(0.5);
  });
});

describe("normalizedPotential", () => {
  it("is 1.5x the surface value at the center of a solid wire", () => {
    expect(normalizedPotential(0, "solid-insulator")).toBeCloseTo(1.5);
    expect(normalizedPotential(1, "solid-insulator")).toBeCloseTo(1);
  });

  it("is constant and equal to the surface value inside a conducting shell", () => {
    expect(normalizedPotential(0, "conducting-shell")).toBeCloseTo(1);
    expect(normalizedPotential(0.5, "conducting-shell")).toBeCloseTo(1);
  });

  it("falls off logarithmically outside and legitimately goes negative for large ratio", () => {
    expect(normalizedPotential(1, "solid-insulator")).toBeCloseTo(1);
    expect(normalizedPotential(Math.E, "solid-insulator")).toBeCloseTo(-1);
    expect(normalizedPotential(2, "solid-insulator")).toBeLessThan(1);
    expect(
      normalizedPotential(1, "solid-insulator")
    ).toBeCloseTo(normalizedPotential(1, "conducting-shell"));
  });
});

describe("equation selection", () => {
  it("picks the inside field/potential formulas for a solid wire", () => {
    expect(fieldEquationLatex("inside", "solid-insulator")).toContain("\\lambda r");
    expect(potentialEquationLatex("inside", "solid-insulator")).toContain("R^2 - r^2");
  });

  it("picks the outside (1/r) formulas outside", () => {
    expect(fieldEquationLatex("outside", "solid-insulator")).toContain("2\\pi\\epsilon_0 r");
    expect(potentialEquationLatex("outside", "solid-insulator")).toContain("\\ln");
  });

  it("shows a zero field inside a conducting shell", () => {
    expect(fieldEquationLatex("inside", "conducting-shell")).toBe("E(r) = 0");
  });
});

describe("regionCaption", () => {
  it("returns a distinct, non-empty caption for every region and wire type, and calls out the 1/r vs 1/r^2 contrast", () => {
    const combos = [
      ["inside", "solid-insulator"],
      ["inside", "conducting-shell"],
      ["surface", "solid-insulator"],
      ["outside", "solid-insulator"],
    ] as const;
    const captions = combos.map(([region, type]) => regionCaption(region, type));
    expect(new Set(captions).size).toBe(captions.length);
    for (const caption of captions) {
      expect(caption.length).toBeGreaterThan(0);
    }
    expect(regionCaption("outside", "solid-insulator")).toContain("1/r");
  });
});

describe("generateChargeMarkerPositions", () => {
  it("is deterministic for the same seed", () => {
    const a = generateChargeMarkerPositions(20, "solid-insulator");
    const b = generateChargeMarkerPositions(20, "solid-insulator");
    expect(a).toEqual(b);
  });

  it("places solid-wire markers within the unit disk", () => {
    const points = generateChargeMarkerPositions(50, "solid-insulator");
    for (const { x, y } of points) {
      expect(Math.sqrt(x * x + y * y)).toBeLessThanOrEqual(1);
    }
  });

  it("places conducting-shell markers on the unit circle boundary", () => {
    const points = generateChargeMarkerPositions(50, "conducting-shell");
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
