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
