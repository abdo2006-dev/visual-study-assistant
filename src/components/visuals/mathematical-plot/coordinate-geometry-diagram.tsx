"use client";

import { useId } from "react";

import type { CoordinateGeometryParams } from "@/lib/schema/templates/coordinateGeometry";

import { sampleCurve } from "./coordinate-geometry-math";

const SIZE = 400;
const PADDING = 32;
const PLOT = SIZE - 2 * PADDING;
const GRID_DIVISIONS = 10;

export function CoordinateGeometryDiagram({
  parameters,
}: {
  parameters: CoordinateGeometryParams;
}) {
  const {
    xRange,
    yRange,
    points,
    vectors,
    curves,
    shadedRegions,
    showGrid,
    xAxisLabel,
    yAxisLabel,
  } = parameters;
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const markerId = useId();

  function toPx(x: number, y: number) {
    return {
      x: PADDING + ((x - xMin) / (xMax - xMin)) * PLOT,
      y: PADDING + (1 - (y - yMin) / (yMax - yMin)) * PLOT,
    };
  }

  const xAxisY = toPx(0, Math.min(Math.max(0, yMin), yMax)).y;
  const yAxisX = toPx(Math.min(Math.max(0, xMin), xMax), 0).x;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Coordinate geometry diagram"
        className="w-full max-w-md self-center"
      >
        <defs>
          <marker
            id={`${markerId}-arrow`}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-foreground)" />
          </marker>
        </defs>

        {showGrid &&
          Array.from({ length: GRID_DIVISIONS + 1 }, (_, i) => i).map((i) => {
            const t = i / GRID_DIVISIONS;
            const x = xMin + t * (xMax - xMin);
            const y = yMin + t * (yMax - yMin);
            const px = toPx(x, yMin).x;
            const py = toPx(xMin, y).y;
            return (
              <g key={i} stroke="var(--color-border)" strokeWidth={0.5}>
                <line x1={px} y1={PADDING} x2={px} y2={SIZE - PADDING} />
                <line x1={PADDING} y1={py} x2={SIZE - PADDING} y2={py} />
              </g>
            );
          })}

        {shadedRegions.map((region, i) => {
          const curve = curves[region.curveIndex];
          if (!curve) return null;
          const samples = sampleCurve(curve, region.fromX, region.toX);
          const baselineY = toPx(0, 0).y;
          const path =
            `M ${toPx(region.fromX, 0).x},${baselineY} ` +
            samples.map((p) => `L ${toPx(p.x, p.y).x},${toPx(p.x, p.y).y}`).join(" ") +
            ` L ${toPx(region.toX, 0).x},${baselineY} Z`;
          return <path key={i} d={path} fill="var(--color-primary)" fillOpacity={0.15} />;
        })}

        <g stroke="var(--color-foreground)" strokeWidth={1.5}>
          <line x1={PADDING} y1={xAxisY} x2={SIZE - PADDING} y2={xAxisY} />
          <line x1={yAxisX} y1={PADDING} x2={yAxisX} y2={SIZE - PADDING} />
        </g>
        {xAxisLabel && (
          <text x={SIZE - PADDING} y={xAxisY - 6} fontSize={12} textAnchor="end" fill="var(--color-muted-foreground)">
            {xAxisLabel}
          </text>
        )}
        {yAxisLabel && (
          <text x={yAxisX + 6} y={PADDING + 4} fontSize={12} fill="var(--color-muted-foreground)">
            {yAxisLabel}
          </text>
        )}

        {curves.map((curve, i) => {
          const samples = sampleCurve(curve, xMin, xMax);
          const path = samples
            .map((p, idx) => `${idx === 0 ? "M" : "L"} ${toPx(p.x, p.y).x},${toPx(p.x, p.y).y}`)
            .join(" ");
          return (
            <path
              key={i}
              d={path}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={2}
            />
          );
        })}

        {vectors.map((v, i) => {
          const from = toPx(v.fromX, v.fromY);
          const to = toPx(v.toX, v.toY);
          return (
            <g key={i}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="var(--color-foreground)"
                strokeWidth={2}
                markerEnd={`url(#${markerId}-arrow)`}
              />
              {v.label && (
                <text x={to.x + 6} y={to.y} fontSize={12} fill="var(--color-foreground)">
                  {v.label}
                </text>
              )}
            </g>
          );
        })}

        {points.map((p, i) => {
          const px = toPx(p.x, p.y);
          return (
            <g key={i}>
              <circle cx={px.x} cy={px.y} r={4} fill="var(--color-primary)" />
              {p.label && (
                <text x={px.x + 7} y={px.y - 7} fontSize={12} fill="var(--color-foreground)">
                  {p.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
