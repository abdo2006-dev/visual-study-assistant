export type SphereRegion = "inside" | "surface" | "outside";
export type SphereType = "solid-insulator" | "shell";

const SURFACE_EPSILON = 0.02;

export function getRegion(ratio: number): SphereRegion {
  if (Math.abs(ratio - 1) < SURFACE_EPSILON) return "surface";
  return ratio < 1 ? "inside" : "outside";
}

/**
 * Field magnitude normalized to [0, 1] (1 == the field strength at the
 * surface). Continuous at r = R for a solid sphere; a shell's field is
 * genuinely discontinuous there (0 just inside, finite just outside) —
 * that jump is physically correct, not a rendering artifact.
 */
export function normalizedFieldMagnitude(ratio: number, sphereType: SphereType): number {
  if (ratio <= 0) return 0;
  if (ratio < 1) {
    return sphereType === "shell" ? 0 : ratio;
  }
  return 1 / (ratio * ratio);
}

/** Potential normalized so that V(R) = 1. */
export function normalizedPotential(ratio: number, sphereType: SphereType): number {
  if (ratio >= 1) return 1 / ratio;
  if (sphereType === "shell") return 1;
  return (3 - ratio * ratio) / 2;
}

export function fieldEquationLatex(region: SphereRegion, sphereType: SphereType): string {
  if (region !== "outside" && sphereType === "shell") {
    return "E(r) = 0";
  }
  if (region === "inside") {
    return "E(r) = \\dfrac{kQr}{R^3}";
  }
  return "E(r) = \\dfrac{kQ}{r^2}";
}

export function potentialEquationLatex(region: SphereRegion, sphereType: SphereType): string {
  if (region !== "outside" && sphereType === "shell") {
    return "V(r) = \\dfrac{kQ}{R}";
  }
  if (region === "inside") {
    return "V(r) = \\dfrac{kQ}{2R}\\left(3 - \\dfrac{r^2}{R^2}\\right)";
  }
  return "V(r) = \\dfrac{kQ}{r}";
}

export function regionCaption(region: SphereRegion, sphereType: SphereType): string {
  if (region === "surface") {
    return "At the surface (r = R): the inside and outside formulas agree.";
  }
  if (region === "inside") {
    return sphereType === "shell"
      ? "Inside the shell (r < R): no charge is enclosed, so the field is zero here."
      : "Inside the sphere (r < R): the field grows linearly with r, reaching its maximum at the surface.";
  }
  return "Outside the sphere (r > R): all the charge is enclosed, so it behaves like a point charge — the field falls off as 1/r².";
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

/** Positions in a unit circle (radius 1): area-uniform inside the disk for a solid sphere, on the boundary for a shell. */
export function generateChargeMarkerPositions(
  count: number,
  sphereType: SphereType,
  seed = 42
): UnitPoint[] {
  const random = seededRandom(seed);
  const points: UnitPoint[] = [];
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2;
    const radius = sphereType === "shell" ? 1 : Math.sqrt(random());
    points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return points;
}

export function fieldArrowAngles(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i / count) * Math.PI * 2);
}
