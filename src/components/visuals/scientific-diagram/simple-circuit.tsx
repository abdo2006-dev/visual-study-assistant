"use client";

import { useId } from "react";

import type { SimpleCircuitParams } from "@/lib/schema/templates/simpleCircuit";

import { calculateCircuit } from "./simple-circuit-math";

const WIDTH = 400;
const HEIGHT = 220;

function zigzagPath(x1: number, y1: number, x2: number, y2: number, segments = 6, amplitude = 8) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const zStart = 0.25;
  const zEnd = 0.75;

  const points: Array<{ x: number; y: number }> = [{ x: x1, y: y1 }];
  points.push({ x: x1 + ux * len * zStart, y: y1 + uy * len * zStart });
  for (let i = 1; i < segments; i++) {
    const t = zStart + (i / segments) * (zEnd - zStart);
    const baseX = x1 + ux * len * t;
    const baseY = y1 + uy * len * t;
    const sign = i % 2 === 0 ? 1 : -1;
    points.push({ x: baseX + px * amplitude * sign, y: baseY + py * amplitude * sign });
  }
  points.push({ x: x1 + ux * len * zEnd, y: y1 + uy * len * zEnd });
  points.push({ x: x2, y: y2 });

  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export function SimpleCircuit({ parameters }: { parameters: SimpleCircuitParams }) {
  const { configuration, voltageSource, resistors, showCurrentDirection, showValues } = parameters;
  const result = calculateCircuit(configuration, voltageSource, resistors);
  const markerId = useId();

  const isSeries = configuration === "series";
  const topY = 40;
  const bottomY = 160;
  const leftX = 40;
  const rightX = 360;

  const branchXs = isSeries
    ? []
    : resistors.map((_, i) => leftX + ((i + 1) * (rightX - leftX)) / (resistors.length + 1));

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <p className="text-sm font-medium">
        {isSeries ? "Series" : "Parallel"} circuit — {voltageSource}V source
      </p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${isSeries ? "Series" : "Parallel"} circuit with ${resistors.length} resistors and a ${voltageSource} volt source`}
        className="w-full max-w-lg self-center"
      >
        <defs>
          <marker id={`${markerId}-arrow`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-primary)" />
          </marker>
        </defs>

        {/* battery: two parallel plates on the left wire */}
        <line x1={leftX} y1={topY} x2={leftX} y2={bottomY} stroke="var(--color-foreground)" strokeWidth={1.5} />
        <line x1={leftX - 10} y1={95} x2={leftX + 10} y2={95} stroke="var(--color-foreground)" strokeWidth={3} />
        <line x1={leftX - 6} y1={105} x2={leftX + 6} y2={105} stroke="var(--color-foreground)" strokeWidth={1.5} />
        <text x={leftX - 22} y={90} fontSize={12} fill="var(--color-muted-foreground)">+</text>
        <text x={leftX - 22} y={118} fontSize={12} fill="var(--color-muted-foreground)">-</text>

        {isSeries ? (
          <g stroke="var(--color-foreground)" strokeWidth={1.5} fill="none">
            <line x1={rightX} y1={topY} x2={rightX} y2={bottomY} />
            <line x1={leftX} y1={bottomY} x2={rightX} y2={bottomY} />
            {resistors.map((r, i) => {
              const segStart = leftX + (i * (rightX - leftX)) / resistors.length;
              const segEnd = leftX + ((i + 1) * (rightX - leftX)) / resistors.length;
              return (
                <g key={r.id}>
                  <path d={zigzagPath(segStart, topY, segEnd, topY)} />
                  <text
                    x={(segStart + segEnd) / 2}
                    y={topY - 12}
                    fontSize={11}
                    fill="var(--color-foreground)"
                    textAnchor="middle"
                  >
                    {r.label} ({r.resistanceOhms}Ω)
                  </text>
                </g>
              );
            })}
            {showCurrentDirection && (
              <line
                x1={rightX}
                y1={bottomY - 20}
                x2={rightX}
                y2={bottomY - 5}
                markerEnd={`url(#${markerId}-arrow)`}
                stroke="var(--color-primary)"
              />
            )}
          </g>
        ) : (
          <g stroke="var(--color-foreground)" strokeWidth={1.5} fill="none">
            <line x1={leftX} y1={topY} x2={rightX} y2={topY} />
            <line x1={leftX} y1={bottomY} x2={rightX} y2={bottomY} />
            {resistors.map((r, i) => {
              const x = branchXs[i];
              return (
                <g key={r.id}>
                  <path d={zigzagPath(x, topY, x, bottomY)} />
                  <text x={x + 10} y={(topY + bottomY) / 2} fontSize={11} fill="var(--color-foreground)">
                    {r.label} ({r.resistanceOhms}Ω)
                  </text>
                  {showCurrentDirection && (
                    <line
                      x1={x}
                      y1={topY + 5}
                      x2={x}
                      y2={topY + 18}
                      markerEnd={`url(#${markerId}-arrow)`}
                      stroke="var(--color-primary)"
                    />
                  )}
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {showValues && (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <p>
            Total resistance: {result.totalResistanceOhms.toFixed(1)}Ω · Total current:{" "}
            {result.totalCurrentAmps.toFixed(3)}A
          </p>
          {result.resistorResults.map((r) => (
            <p key={r.id}>
              {r.label}: {r.currentAmps.toFixed(3)}A, {r.voltageDropVolts.toFixed(2)}V drop
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
