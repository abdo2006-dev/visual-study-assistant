import type { Resistor } from "@/lib/schema/templates/simpleCircuit";

export interface ResistorResult extends Resistor {
  currentAmps: number;
  voltageDropVolts: number;
}

export interface CircuitResult {
  totalResistanceOhms: number;
  totalCurrentAmps: number;
  resistorResults: ResistorResult[];
}

export function calculateCircuit(
  configuration: "series" | "parallel",
  voltageSource: number,
  resistors: Resistor[]
): CircuitResult {
  if (configuration === "series") {
    const totalResistanceOhms = resistors.reduce((sum, r) => sum + r.resistanceOhms, 0);
    const totalCurrentAmps = voltageSource / totalResistanceOhms;
    return {
      totalResistanceOhms,
      totalCurrentAmps,
      resistorResults: resistors.map((r) => ({
        ...r,
        currentAmps: totalCurrentAmps,
        voltageDropVolts: totalCurrentAmps * r.resistanceOhms,
      })),
    };
  }

  const totalResistanceOhms = 1 / resistors.reduce((sum, r) => sum + 1 / r.resistanceOhms, 0);
  const totalCurrentAmps = voltageSource / totalResistanceOhms;
  return {
    totalResistanceOhms,
    totalCurrentAmps,
    resistorResults: resistors.map((r) => ({
      ...r,
      currentAmps: voltageSource / r.resistanceOhms,
      voltageDropVolts: voltageSource,
    })),
  };
}

export interface LoopPoint {
  x: number;
  y: number;
}

/**
 * A point at `fraction` (wraps to [0, 1)) around the closed loop through
 * `corners`, moving at constant visual speed — segments are weighted by
 * their actual length rather than treated as equal shares, so a dot doesn't
 * appear to speed up or slow down crossing a short side. Used to animate
 * current flow around the circuit's outer perimeter (the actual internal
 * branching for a parallel circuit isn't modeled — this traces the same
 * outer rectangle every configuration is drawn on).
 */
export function pointOnRectangularLoop(fraction: number, corners: LoopPoint[]): LoopPoint {
  const wrapped = ((fraction % 1) + 1) % 1;
  const segments = corners.map((corner, i) => {
    const next = corners[(i + 1) % corners.length];
    const length = Math.hypot(next.x - corner.x, next.y - corner.y);
    return { from: corner, to: next, length };
  });
  const totalLength = segments.reduce((sum, s) => sum + s.length, 0);
  let remaining = wrapped * totalLength;

  for (const segment of segments) {
    if (remaining <= segment.length || segment === segments[segments.length - 1]) {
      const t = segment.length === 0 ? 0 : remaining / segment.length;
      return {
        x: segment.from.x + (segment.to.x - segment.from.x) * t,
        y: segment.from.y + (segment.to.y - segment.from.y) * t,
      };
    }
    remaining -= segment.length;
  }

  return corners[0];
}
