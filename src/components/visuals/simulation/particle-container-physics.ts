export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const MAX_SPEED = 0.02;
const VELOCITY_JITTER = 0.02;

function seededRandom(seed: number): () => number {
  let t = seed;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Positions are normalized to [0,1] x [0,1] within the container. */
export function initializeParticles(
  count: number,
  concentrationLeft: number,
  concentrationRight: number,
  hasMembrane: boolean,
  seed = 7
): Particle[] {
  const random = seededRandom(seed);
  const total = concentrationLeft + concentrationRight;
  const leftFraction = hasMembrane && total > 0 ? concentrationLeft / total : 0.5;
  const leftCount = hasMembrane ? Math.round(count * leftFraction) : count;

  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const inLeftHalf = i < leftCount;
    const x = hasMembrane
      ? inLeftHalf
        ? random() * 0.48
        : 0.52 + random() * 0.48
      : random();
    const y = random();
    const angle = random() * Math.PI * 2;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * MAX_SPEED * 0.5,
      vy: Math.sin(angle) * MAX_SPEED * 0.5,
    });
  }
  return particles;
}

/** One deterministic simulation step (random walk with wall/membrane collisions). `randomFn` is injectable for tests. */
export function stepParticles(
  particles: Particle[],
  hasMembrane: boolean,
  membranePermeable: boolean,
  randomFn: () => number = Math.random
): Particle[] {
  return particles.map((particle) => {
    let vx = particle.vx + (randomFn() - 0.5) * VELOCITY_JITTER;
    let vy = particle.vy + (randomFn() - 0.5) * VELOCITY_JITTER;
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > MAX_SPEED) {
      vx = (vx / speed) * MAX_SPEED;
      vy = (vy / speed) * MAX_SPEED;
    }

    let x = particle.x + vx;
    let y = particle.y + vy;

    if (x < 0) {
      x = 0;
      vx = -vx;
    } else if (x > 1) {
      x = 1;
      vx = -vx;
    }
    if (y < 0) {
      y = 0;
      vy = -vy;
    } else if (y > 1) {
      y = 1;
      vy = -vy;
    }

    if (hasMembrane && !membranePermeable) {
      const wasLeft = particle.x < 0.5;
      const nowLeft = x < 0.5;
      if (wasLeft !== nowLeft) {
        x = particle.x;
        vx = -vx;
      }
    }

    return { x, y, vx, vy };
  });
}

export function countBySide(particles: Particle[]): { left: number; right: number } {
  let left = 0;
  for (const p of particles) if (p.x < 0.5) left++;
  return { left, right: particles.length - left };
}
