export type PlaneConfiguration = "single-plane" | "parallel-plates";
export type PlaneRegion = "surface" | "field" | "between" | "outside";
export type ChargeSign = "positive" | "negative";

const SURFACE_EPSILON = 0.02;
const PLATE_HALF_SEPARATION = 0.5;

/**
 * Classifies a position x along the axis perpendicular to the plane(s).
 * For a single plane the only distinction is "on the sheet" vs "in the
 * (uniform) field region" on either side. For parallel plates there is
 * also a field-free "outside" region beyond either plate.
 */
export function getRegion(x: number, configuration: PlaneConfiguration): PlaneRegion {
  if (configuration === "single-plane") {
    return Math.abs(x) < SURFACE_EPSILON ? "surface" : "field";
  }
  if (Math.abs(Math.abs(x) - PLATE_HALF_SEPARATION) < SURFACE_EPSILON) {
    return "surface";
  }
  return Math.abs(x) < PLATE_HALF_SEPARATION ? "between" : "outside";
}

/**
 * Field magnitude normalized so the active-region field is 1. The
 * defining physical feature of an infinite plane: for a single sheet the
 * magnitude is exactly 1 for every x != 0 — no falloff at all, unlike a
 * point, wire, or sphere charge. For parallel plates the two sheets'
 * fields add to 1 between them and exactly cancel (0) outside.
 */
export function fieldMagnitude(x: number, configuration: PlaneConfiguration): number {
  if (configuration === "single-plane") {
    return x === 0 ? 0 : 1;
  }
  return Math.abs(x) <= PLATE_HALF_SEPARATION ? 1 : 0;
}

/**
 * Direction of the field at x, as +1/-1 along the axis, or 0 where the
 * field vanishes. For a single plane, a positive sheet pushes field lines
 * away from itself on both sides; a negative sheet pulls them in. For
 * parallel plates the field always points from the + plate (x = -0.5)
 * toward the - plate (x = +0.5) in the region between them.
 */
export function fieldDirection(
  x: number,
  configuration: PlaneConfiguration,
  chargeSign: ChargeSign
): number {
  if (configuration === "single-plane") {
    if (x === 0) return 0;
    const awayFromPlane = x > 0 ? 1 : -1;
    return chargeSign === "positive" ? awayFromPlane : -awayFromPlane;
  }
  return Math.abs(x) <= PLATE_HALF_SEPARATION ? 1 : 0;
}

/**
 * Potential normalized with V(0) = 0 for a single plane (reference at the
 * sheet itself), or V(-0.5) = 1 / V(0.5) = 0 for parallel plates (the
 * uniform field between the plates integrates to a linear potential;
 * outside, zero field means the potential stays constant at whichever
 * boundary value it exits with).
 */
export function potentialAtX(
  x: number,
  configuration: PlaneConfiguration,
  chargeSign: ChargeSign
): number {
  if (configuration === "single-plane") {
    return chargeSign === "positive" ? -Math.abs(x) : Math.abs(x);
  }
  if (x < -PLATE_HALF_SEPARATION) return 1;
  if (x > PLATE_HALF_SEPARATION) return 0;
  return 0.5 - x;
}

export function fieldEquationLatex(configuration: PlaneConfiguration, region: PlaneRegion): string {
  if (configuration === "single-plane") {
    return "E = \\dfrac{\\sigma}{2\\epsilon_0}";
  }
  return region === "outside" ? "E = 0" : "E = \\dfrac{\\sigma}{\\epsilon_0}";
}

export function potentialEquationLatex(): string {
  return "V(x) = V(0) - Ex";
}

export function regionCaption(region: PlaneRegion, configuration: PlaneConfiguration): string {
  if (configuration === "single-plane") {
    if (region === "surface") {
      return "Right at the plane's surface: the field direction flips sign as you cross from one side to the other, even though its magnitude stays exactly the same on both sides.";
    }
    return "Notice the field magnitude doesn't fall off with distance at all here — for an infinite charged plane, moving farther away doesn't reduce how much charge \"looks close,\" unlike the point, wire, or sphere cases where the field weakens with distance.";
  }
  if (region === "between") {
    return "Between the plates: the field is uniform in both magnitude and direction, confined entirely to this region — moving closer to either plate doesn't change its strength.";
  }
  if (region === "surface") {
    return "Right at a plate's surface: this is the boundary between the uniform interior field and the field-free region outside.";
  }
  return "Outside the plates: the fields from the two oppositely charged plates exactly cancel, leaving zero field out here — this confinement is exactly what makes a parallel-plate capacitor useful.";
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

/**
 * Deterministic, evenly-spread positions (in [-1, 1]) along a charged
 * sheet, with a small seeded jitter so the markers don't look mechanically
 * regular — same spirit as the sphere/wire templates' charge markers,
 * just distributed along a line instead of a disk.
 */
export function generateChargeMarkerPositions(count: number, seed = 42): number[] {
  const random = seededRandom(seed);
  const positions: number[] = [];
  for (let i = 0; i < count; i++) {
    const base = count === 1 ? 0 : -1 + (2 / (count - 1)) * i;
    const jitter = (random() - 0.5) * (count === 1 ? 0 : 2 / (count - 1)) * 0.4;
    positions.push(Math.max(-1, Math.min(1, base + jitter)));
  }
  return positions;
}

/** Evenly spaced y-offsets (in [-1, 1]) for rows of field arrows. */
export function fieldArrowRows(count: number): number[] {
  return Array.from({ length: count }, (_, i) => -1 + (2 / (count - 1)) * i);
}
