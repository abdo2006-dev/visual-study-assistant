export type WireRegion = "inside" | "surface" | "outside";
export type WireType = "solid-insulator" | "conducting-shell";

const SURFACE_EPSILON = 0.02;

export function getRegion(ratio: number): WireRegion {
  if (Math.abs(ratio - 1) < SURFACE_EPSILON) return "surface";
  return ratio < 1 ? "inside" : "outside";
}

/**
 * Field magnitude normalized to [0, 1] (1 == the field strength at the
 * surface). The defining physical difference from the sphere template:
 * outside the wire the field falls off as 1/r, not 1/r² — Gauss's law on
 * a cylinder has enclosed-charge proportional to length (constant along
 * the cylinder), while the Gaussian surface area is proportional to r
 * (a cylindrical shell), not r² (a spherical shell).
 */
export function normalizedFieldMagnitude(ratio: number, wireType: WireType): number {
  if (ratio <= 0) return 0;
  if (ratio < 1) {
    return wireType === "conducting-shell" ? 0 : ratio;
  }
  return 1 / ratio;
}

/**
 * Potential normalized so that V(R) = 1. Unlike the sphere, this
 * diverges (logarithmically) as r -> infinity, so there is no sane
 * "zero at infinity" reference — V(R) = 1 is the only sane normalization
 * here, and V legitimately goes negative for large ratio; that is
 * physically correct for an infinite line/cylinder of charge, not a bug.
 */
export function normalizedPotential(ratio: number, wireType: WireType): number {
  if (ratio >= 1) return 1 - 2 * Math.log(ratio);
  if (wireType === "conducting-shell") return 1;
  return (3 - ratio * ratio) / 2;
}

export function fieldEquationLatex(region: WireRegion, wireType: WireType): string {
  if (region !== "outside" && wireType === "conducting-shell") {
    return "E(r) = 0";
  }
  if (region === "inside") {
    return "E(r) = \\dfrac{\\lambda r}{2\\pi\\epsilon_0 R^2}";
  }
  return "E(r) = \\dfrac{\\lambda}{2\\pi\\epsilon_0 r}";
}

export function potentialEquationLatex(region: WireRegion, wireType: WireType): string {
  if (region !== "outside" && wireType === "conducting-shell") {
    return "V(r) = V(R)";
  }
  if (region === "inside") {
    return "V(r) - V(R) = \\dfrac{\\lambda}{4\\pi\\epsilon_0 R^2}(R^2 - r^2)";
  }
  return "V(r) - V(R) = -\\dfrac{\\lambda}{2\\pi\\epsilon_0}\\ln\\!\\left(\\dfrac{r}{R}\\right)";
}

export function regionCaption(region: WireRegion, wireType: WireType): string {
  if (region === "surface") {
    return "At the surface (r = R): the inside and outside formulas agree, marking the transition from the interior behavior to the 1/r falloff outside.";
  }
  if (region === "inside") {
    return wireType === "conducting-shell"
      ? "Inside the conducting shell (r < R): a Gaussian cylinder at this radius encloses no charge, so the field is zero here — same reasoning as the shell sphere, just with a cylindrical Gaussian surface instead of a spherical one."
      : "Inside the solid wire (r < R): the field grows linearly with r, reaching its maximum at the surface — the same shape as inside a uniformly charged solid sphere, since both enclose a charge that grows with the volume swept out.";
  }
  return "Outside the wire (r > R): the field falls off as 1/r here — slower than the 1/r² falloff around a point or sphere charge, because the Gaussian surface is a cylinder whose area grows with r, not r² — the enclosed charge per unit length never changes.";
}

/** Small, fast, deterministic PRNG so charge markers stay stable across renders. */
function seededRandom(seed: number): () => number {
  let t = seed;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export interface UnitPoint {
  x: number;
  y: number;
}

/** Positions in a unit circle (radius 1): area-uniform inside the disk for a solid wire, on the boundary for a conducting shell. */
export function generateChargeMarkerPositions(
  count: number,
  wireType: WireType,
  seed = 42
): UnitPoint[] {
  const random = seededRandom(seed);
  const points: UnitPoint[] = [];
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2;
    const radius = wireType === "conducting-shell" ? 1 : Math.sqrt(random());
    points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return points;
}

export function fieldArrowAngles(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i / count) * Math.PI * 2);
}
