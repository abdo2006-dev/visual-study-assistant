import { describe, expect, it } from "vitest";

import {
  axialFieldEquationLatex,
  axialFieldMagnitudeNormalized,
  dipoleMomentEquationLatex,
  equatorialFieldEquationLatex,
  equatorialFieldMagnitudeNormalized,
  generateDipoleFieldLines,
  potentialEnergyEquationLatex,
  potentialEnergyNormalized,
  torqueEquationLatex,
  torqueMagnitudeNormalized,
} from "@/components/visuals/scientific-diagram/electric-dipole-physics";

describe("far-field axial vs equatorial magnitude", () => {
  it("axial is always exactly twice the equatorial magnitude at the same distance", () => {
    for (const ratio of [1.5, 2, 3, 4, 5]) {
      expect(axialFieldMagnitudeNormalized(ratio)).toBeCloseTo(
        2 * equatorialFieldMagnitudeNormalized(ratio)
      );
    }
  });

  it("both fall off as 1/r^3, so their ratio stays 2:1 as distance changes", () => {
    const axialAt2 = axialFieldMagnitudeNormalized(2);
    const axialAt4 = axialFieldMagnitudeNormalized(4);
    // Doubling the distance should drop the field to 1/8 (2^3).
    expect(axialAt4).toBeCloseTo(axialAt2 / 8);
  });

  it("exposes the expected LaTeX", () => {
    expect(axialFieldEquationLatex).toBe("E_{axial} = \\dfrac{2kp}{r^3}");
    expect(equatorialFieldEquationLatex).toBe("E_{equatorial} = \\dfrac{kp}{r^3}");
  });
});

describe("torqueMagnitudeNormalized", () => {
  it("is zero at the two equilibria and maximal at 90 degrees", () => {
    expect(torqueMagnitudeNormalized(0)).toBeCloseTo(0);
    expect(torqueMagnitudeNormalized(180)).toBeCloseTo(0);
    expect(torqueMagnitudeNormalized(90)).toBeCloseTo(1);
  });
});

describe("potentialEnergyNormalized", () => {
  it("is -1 at theta=0 (stable) and +1 at theta=180 (unstable)", () => {
    expect(potentialEnergyNormalized(0)).toBeCloseTo(-1);
    expect(potentialEnergyNormalized(180)).toBeCloseTo(1);
  });

  it("is 0 at theta=90", () => {
    expect(potentialEnergyNormalized(90)).toBeCloseTo(0);
  });
});

describe("equation constants", () => {
  it("expose the expected LaTeX", () => {
    expect(torqueEquationLatex).toBe("\\tau = pE\\sin\\theta");
    expect(potentialEnergyEquationLatex).toBe(
      "U = -pE\\cos\\theta = -\\vec{p}\\cdot\\vec{E}"
    );
    expect(dipoleMomentEquationLatex).toBe("p = qd");
  });
});

describe("generateDipoleFieldLines", () => {
  it("is symmetric: the line at +a degrees mirrors the line at -a degrees", () => {
    const lines = generateDipoleFieldLines(7);
    const byAngle = new Map(lines.map((l) => [l.startAngleDeg, l.controlOffset]));
    for (const [angle, offset] of byAngle) {
      const mirrored = byAngle.get(-angle);
      expect(mirrored).toBeCloseTo(-offset);
    }
  });

  it("returns the requested count of lines", () => {
    expect(generateDipoleFieldLines(9)).toHaveLength(9);
  });

  it("gives steeper launch angles a larger-magnitude control offset", () => {
    const lines = generateDipoleFieldLines(5);
    const steepest = lines.reduce((a, b) =>
      Math.abs(b.startAngleDeg) > Math.abs(a.startAngleDeg) ? b : a
    );
    const shallowest = lines.reduce((a, b) =>
      Math.abs(b.startAngleDeg) < Math.abs(a.startAngleDeg) ? b : a
    );
    expect(Math.abs(steepest.controlOffset)).toBeGreaterThan(
      Math.abs(shallowest.controlOffset)
    );
  });
});
