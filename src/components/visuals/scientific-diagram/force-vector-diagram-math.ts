export interface Vector2D {
  x: number;
  y: number;
}

export interface PolarVector {
  magnitude: number;
  angleDegrees: number;
}

/** SVG y grows downward, so this flips y to keep angleDegrees in the standard counterclockwise-from-+x convention. */
export function vectorComponents({ magnitude, angleDegrees }: PolarVector): Vector2D {
  const angleRad = (angleDegrees * Math.PI) / 180;
  return { x: magnitude * Math.cos(angleRad), y: -magnitude * Math.sin(angleRad) };
}

export function resultantComponents(vectors: PolarVector[]): Vector2D {
  return vectors.reduce(
    (acc, v) => {
      const c = vectorComponents(v);
      return { x: acc.x + c.x, y: acc.y + c.y };
    },
    { x: 0, y: 0 }
  );
}

export function magnitudeOf({ x, y }: Vector2D): number {
  return Math.sqrt(x * x + y * y);
}

export function angleDegreesOf({ x, y }: Vector2D): number {
  const deg = (Math.atan2(-y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

export function componentsToPolar(v: Vector2D): PolarVector {
  return { magnitude: magnitudeOf(v), angleDegrees: angleDegreesOf(v) };
}

export interface ParticleMotionState {
  position: Vector2D;
  velocity: Vector2D;
}

/**
 * Advances a unit-mass particle's position/velocity under a constant
 * acceleration for `dt` seconds (semi-implicit Euler, matching this app's
 * other animated templates) — a simplified F=ma demo for the resultant
 * force, since the schema has no mass parameter to divide by.
 */
export function stepParticleMotion(
  state: ParticleMotionState,
  acceleration: Vector2D,
  dt: number
): ParticleMotionState {
  const velocity = {
    x: state.velocity.x + acceleration.x * dt,
    y: state.velocity.y + acceleration.y * dt,
  };
  const position = {
    x: state.position.x + velocity.x * dt,
    y: state.position.y + velocity.y * dt,
  };
  return { position, velocity };
}
