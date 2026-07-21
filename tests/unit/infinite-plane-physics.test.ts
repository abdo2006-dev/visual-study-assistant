import { describe, expect, it } from "vitest";

import {
  fieldArrowRows,
  fieldDirection,
  fieldEquationLatex,
  fieldMagnitude,
  generateChargeMarkerPositions,
  getRegion,
  potentialAtX,
  potentialEquationLatex,
  regionCaption,
} from "@/components/visuals/scientific-diagram/infinite-plane-physics";

describe("getRegion", () => {
  it("classifies single-plane positions", () => {
    expect(getRegion(0, "single-plane")).toBe("surface");
    expect(getRegion(0.6, "single-plane")).toBe("field");
    expect(getRegion(-1.9, "single-plane")).toBe("field");
  });

  it("classifies parallel-plates positions", () => {
    expect(getRegion(0, "parallel-plates")).toBe("between");
    expect(getRegion(0.5, "parallel-plates")).toBe("surface");
    expect(getRegion(-0.5, "parallel-plates")).toBe("surface");
    expect(getRegion(1.9, "parallel-plates")).toBe("outside");
    expect(getRegion(-1.9, "parallel-plates")).toBe("outside");
  });
});

describe("fieldMagnitude", () => {
  it("never falls off for a single plane: same magnitude near and far", () => {
    expect(fieldMagnitude(0.6, "single-plane")).toBe(1);
    expect(fieldMagnitude(1.9, "single-plane")).toBe(1);
    expect(fieldMagnitude(0.6, "single-plane")).toBe(fieldMagnitude(1.9, "single-plane"));
    expect(fieldMagnitude(-1.9, "single-plane")).toBe(1);
  });

  it("is 1 between the plates and 0 outside them for parallel-plates", () => {
    expect(fieldMagnitude(0, "parallel-plates")).toBe(1);
    expect(fieldMagnitude(0.5, "parallel-plates")).toBe(1);
    expect(fieldMagnitude(0.51, "parallel-plates")).toBe(0);
    expect(fieldMagnitude(-1.9, "parallel-plates")).toBe(0);
    expect(fieldMagnitude(1.9, "parallel-plates")).toBe(0);
  });
});

describe("fieldDirection", () => {
  it("points away from a positive single plane on both sides", () => {
    expect(fieldDirection(1, "single-plane", "positive")).toBe(1);
    expect(fieldDirection(-1, "single-plane", "positive")).toBe(-1);
  });

  it("points toward a negative single plane on both sides", () => {
    expect(fieldDirection(1, "single-plane", "negative")).toBe(-1);
    expect(fieldDirection(-1, "single-plane", "negative")).toBe(1);
  });

  it("points from the + plate toward the - plate between parallel plates", () => {
    expect(fieldDirection(0, "parallel-plates", "positive")).toBe(1);
  });
});

describe("potentialAtX", () => {
  it("decreases moving away from a positive single plane in either direction", () => {
    expect(potentialAtX(0, "single-plane", "positive")).toBeCloseTo(0);
    expect(potentialAtX(1, "single-plane", "positive")).toBe(-1);
    expect(potentialAtX(-1, "single-plane", "positive")).toBe(-1);
  });

  it("increases moving away from a negative single plane", () => {
    expect(potentialAtX(1, "single-plane", "negative")).toBe(1);
    expect(potentialAtX(-1, "single-plane", "negative")).toBe(1);
  });

  it("is linear between parallel plates and constant outside", () => {
    expect(potentialAtX(-0.5, "parallel-plates", "positive")).toBeCloseTo(1);
    expect(potentialAtX(0.5, "parallel-plates", "positive")).toBeCloseTo(0);
    expect(potentialAtX(0, "parallel-plates", "positive")).toBeCloseTo(0.5);
    expect(potentialAtX(-1.5, "parallel-plates", "positive")).toBe(1);
    expect(potentialAtX(1.5, "parallel-plates", "positive")).toBe(0);
  });
});

describe("equation selection", () => {
  it("gives the single-sheet field formula for a single plane", () => {
    expect(fieldEquationLatex("single-plane", "field")).toContain("2\\epsilon_0");
  });

  it("gives the full-sigma field formula between plates and zero outside", () => {
    expect(fieldEquationLatex("parallel-plates", "between")).toBe(
      "E = \\dfrac{\\sigma}{\\epsilon_0}"
    );
    expect(fieldEquationLatex("parallel-plates", "outside")).toBe("E = 0");
  });

  it("gives the linear-potential formula", () => {
    expect(potentialEquationLatex()).toBe("V(x) = V(0) - Ex");
  });
});

describe("regionCaption", () => {
  it("explicitly calls out the no-falloff behavior for a single plane", () => {
    expect(regionCaption("field", "single-plane")).toMatch(/fall off|falloff/i);
  });

  it("explains cancellation outside parallel plates", () => {
    expect(regionCaption("outside", "parallel-plates")).toMatch(/cancel/i);
  });

  it("returns distinct, non-empty captions for every applicable region/configuration pair", () => {
    const combos = [
      ["surface", "single-plane"],
      ["field", "single-plane"],
      ["between", "parallel-plates"],
      ["surface", "parallel-plates"],
      ["outside", "parallel-plates"],
    ] as const;
    const captions = combos.map(([region, config]) => regionCaption(region, config));
    expect(new Set(captions).size).toBe(captions.length);
    for (const caption of captions) {
      expect(caption.length).toBeGreaterThan(0);
    }
  });
});

describe("generateChargeMarkerPositions", () => {
  it("is deterministic for the same seed", () => {
    const a = generateChargeMarkerPositions(10);
    const b = generateChargeMarkerPositions(10);
    expect(a).toEqual(b);
  });

  it("stays within [-1, 1]", () => {
    const points = generateChargeMarkerPositions(30);
    for (const p of points) {
      expect(p).toBeGreaterThanOrEqual(-1);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

describe("fieldArrowRows", () => {
  it("returns evenly spaced rows spanning -1 to 1", () => {
    const rows = fieldArrowRows(5);
    expect(rows[0]).toBeCloseTo(-1);
    expect(rows[rows.length - 1]).toBeCloseTo(1);
    expect(rows).toHaveLength(5);
  });
});
