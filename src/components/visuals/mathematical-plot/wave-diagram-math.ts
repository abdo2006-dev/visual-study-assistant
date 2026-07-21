export function sampleWave(
  amplitude: number,
  wavelength: number,
  phase: number,
  xMin = 0,
  xMax = 4,
  steps = 200
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const k = (2 * Math.PI) / wavelength;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (i / steps) * (xMax - xMin);
    points.push({ x, y: amplitude * Math.sin(k * x + phase) });
  }
  return points;
}

/**
 * For y(x,t) = A sin(kx - ωt), y stays constant as t and x both increase —
 * i.e. the pattern moves in +x ("right"). So phase (the "- ωt" term) must
 * decrease over time for rightward propagation, and increase for leftward.
 */
export function nextPhase(
  phase: number,
  direction: "left" | "right",
  speed: number,
  dtSeconds: number
): number {
  const delta = 2 * Math.PI * speed * dtSeconds;
  return direction === "right" ? phase - delta : phase + delta;
}
