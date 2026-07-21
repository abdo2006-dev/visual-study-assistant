import type { GeometryCurve } from "@/lib/schema/templates/coordinateGeometry";

export function evaluateCurve(curve: GeometryCurve, x: number): number {
  switch (curve.curveType) {
    case "linear":
      return curve.slope * x + curve.intercept;
    case "quadratic":
      return curve.a * x * x + curve.b * x + curve.c;
    case "sine":
      return curve.amplitude * Math.sin(curve.frequency * x + curve.phase);
  }
}

export function sampleCurve(
  curve: GeometryCurve,
  xMin: number,
  xMax: number,
  steps = 100
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (i / steps) * (xMax - xMin);
    points.push({ x, y: evaluateCurve(curve, x) });
  }
  return points;
}
