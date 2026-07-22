/**
 * Far-field axial magnitude, normalized so kp = 1: E_axial(r) = 2/r^3,
 * pointing in the same direction as the dipole moment p. r is the
 * distance ratio (observation distance / charge separation) — this
 * approximation only holds when r is large relative to the separation,
 * which is why the UI restricts it to a "far" range.
 */
export function axialFieldMagnitudeNormalized(distanceRatio: number): number {
  return 2 / distanceRatio ** 3;
}

/**
 * Far-field equatorial (perpendicular-bisector) magnitude, normalized so
 * kp = 1: E_equatorial(r) = 1/r^3 — half the axial magnitude at the same
 * distance, and pointing opposite to p rather than along it.
 */
export function equatorialFieldMagnitudeNormalized(distanceRatio: number): number {
  return 1 / distanceRatio ** 3;
}

export const axialFieldEquationLatex = "E_{axial} = \\dfrac{2kp}{r^3}";
export const equatorialFieldEquationLatex = "E_{equatorial} = \\dfrac{kp}{r^3}";

/** Torque magnitude normalized so pE = 1: tau/pE = sin(theta). */
export function torqueMagnitudeNormalized(angleDegrees: number): number {
  return Math.sin((angleDegrees * Math.PI) / 180);
}

/** Potential energy normalized so pE = 1: U/pE = -cos(theta). Range [-1, 1]. */
export function potentialEnergyNormalized(angleDegrees: number): number {
  return -Math.cos((angleDegrees * Math.PI) / 180);
}

export const torqueEquationLatex = "\\tau = pE\\sin\\theta";
export const potentialEnergyEquationLatex = "U = -pE\\cos\\theta = -\\vec{p}\\cdot\\vec{E}";
export const dipoleMomentEquationLatex = "p = qd";

// Illustrative animation constants, not derived from a real moment of
// inertia or SI units — chosen only so a released dipole's swing plays out
// over a few legible seconds rather than instantly or imperceptibly slowly.
export const DIPOLE_TORQUE_CONSTANT = 220; // deg/s^2 per unit sin(theta)
export const DIPOLE_DAMPING = 0.8; // 1/s, a light "friction" so the swing settles instead of oscillating forever

/**
 * Angular acceleration (deg/s^2) for a damped dipole released in a uniform
 * field: the same tau = -pE sin(theta) restoring torque as the equation
 * above (negative because it always drives theta toward 0, the stable
 * equilibrium), plus linear damping. `angleDegrees` is the raw, continuously
 * accumulated rotation (not wrapped to 0-180) so the direction of swing
 * through a full alignment crossing stays physically consistent.
 */
export function dipoleAngularAcceleration(
  angleDegrees: number,
  angularVelocityDegPerSec: number
): number {
  const angleRad = (angleDegrees * Math.PI) / 180;
  return -DIPOLE_TORQUE_CONSTANT * Math.sin(angleRad) - DIPOLE_DAMPING * angularVelocityDegPerSec;
}

/**
 * Wraps any real angle (e.g. the raw accumulated rotation while animating,
 * which can go negative or past 360) down to the conventional 0-180 "angle
 * between two vectors" range used everywhere else in this template for
 * display, equations, and the slider.
 */
export function wrapToAngleBetweenRange(angleDegrees: number): number {
  const wrapped = ((angleDegrees % 360) + 360) % 360;
  return wrapped > 180 ? 360 - wrapped : wrapped;
}

export interface DipoleFieldLineDescriptor {
  /** Launch angle, in degrees, relative to the dipole axis (- to + direction). */
  startAngleDeg: number;
  /**
   * Normalized perpendicular offset (in [-1, 1]) for the field line's
   * quadratic-bezier control point, proportional to |startAngleDeg| and
   * signed to match it, so the set of lines is symmetric top/bottom
   * across the dipole axis.
   */
  controlOffset: number;
}

const MAX_LAUNCH_ANGLE_DEG = 60;

/**
 * Deterministic, illustrative (not a numeric field simulation) set of
 * dipole field lines: evenly-spaced launch angles from -60 to +60 degrees
 * relative to the dipole axis, each paired with a control-point offset
 * whose magnitude grows with the launch angle so steeper lines bow out
 * further before curving back from the + charge to the - charge.
 */
export function generateDipoleFieldLines(count: number): DipoleFieldLineDescriptor[] {
  if (count <= 1) {
    return [{ startAngleDeg: 0, controlOffset: 0 }];
  }
  return Array.from({ length: count }, (_, i) => {
    const startAngleDeg =
      -MAX_LAUNCH_ANGLE_DEG + ((2 * MAX_LAUNCH_ANGLE_DEG) / (count - 1)) * i;
    const controlOffset = startAngleDeg / MAX_LAUNCH_ANGLE_DEG;
    return { startAngleDeg, controlOffset };
  });
}
