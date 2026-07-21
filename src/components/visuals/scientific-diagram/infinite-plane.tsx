"use client";

import { useId, useMemo, useState } from "react";

import { Equation } from "@/components/equations/equation";
import type { InfinitePlaneParams } from "@/lib/schema/templates/infinitePlane";

import {
  fieldArrowRows,
  fieldDirection,
  fieldEquationLatex,
  fieldMagnitude,
  generateChargeMarkerPositions,
  getRegion,
  potentialAtX,
  potentialEquationLatex,
  regionCaption,
} from "./infinite-plane-physics";

const SIZE_W = 440;
const SIZE_H = 300;
const CENTER_X = SIZE_W / 2;
const CENTER_Y = SIZE_H / 2;
const X_SCALE = 90; // px per unit ratio
const HALF_HEIGHT = 110; // px, plate active extent above/below center
const MAX_RATIO = 2;
const ARROW_LEN = 26;
const CHARGE_MARKER_COUNT = 14;
const POTENTIAL_MIN = -2;
const POTENTIAL_MAX = 2;

function toScreenX(ratio: number) {
  return CENTER_X + ratio * X_SCALE;
}

function toScreenY(offset: number) {
  return CENTER_Y - offset * HALF_HEIGHT;
}

export function InfinitePlane({ parameters }: { parameters: InfinitePlaneParams }) {
  const {
    configuration,
    chargeSign,
    showFieldVectors,
    showPotentialPlot,
    initialObservationPositionRatio,
  } = parameters;

  const [x, setX] = useState(initialObservationPositionRatio);
  const sliderId = useId();
  const region = getRegion(x, configuration);
  const isPositive = chargeSign === "positive";

  const markerOffsets = useMemo(
    () => generateChargeMarkerPositions(CHARGE_MARKER_COUNT),
    []
  );
  const arrowRows = useMemo(() => fieldArrowRows(5), []);

  const isParallel = configuration === "parallel-plates";
  const plateXs = isParallel ? [-0.5, 0.5] : [0];

  const observerScreenX = toScreenX(x);
  const magnitudeHere = fieldMagnitude(x, configuration);

  const potentialCurve = useMemo(() => {
    const points: string[] = [];
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const ratio = -MAX_RATIO + (2 * MAX_RATIO * i) / steps;
      const v = potentialAtX(ratio, configuration, chargeSign);
      const py = ((ratio + MAX_RATIO) / (2 * MAX_RATIO)) * 100;
      const y = 40 - ((v - POTENTIAL_MIN) / (POTENTIAL_MAX - POTENTIAL_MIN)) * 36;
      points.push(`${py},${y}`);
    }
    return points.join(" ");
  }, [configuration, chargeSign]);

  const currentPotential = potentialAtX(x, configuration, chargeSign);
  const currentPotentialY =
    40 - ((currentPotential - POTENTIAL_MIN) / (POTENTIAL_MAX - POTENTIAL_MIN)) * 36;

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-4">
      <svg
        viewBox={`0 0 ${SIZE_W} ${SIZE_H}`}
        role="img"
        aria-label={`${isParallel ? "Two parallel charged plates" : "An infinite charged plane"}, observation point currently ${region === "between" ? "between the plates" : region === "outside" ? "outside the plates" : region} at x = ${x.toFixed(2)}`}
        className="w-full max-w-md self-center"
      >
        <defs>
          <marker
            id="plane-field-arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-primary)" />
          </marker>
        </defs>

        {plateXs.map((plateRatio) => {
          const sx = toScreenX(plateRatio);
          const plateIsPositive = isParallel ? plateRatio < 0 : isPositive;
          const plateColor = plateIsPositive ? "#ef4444" : "#3b82f6";
          return (
            <g key={plateRatio}>
              {/* Dashed extension past the top/bottom frame edge signals infinite extent. */}
              <line
                x1={sx}
                y1={toScreenY(1)}
                x2={sx}
                y2={-20}
                stroke="var(--color-muted-foreground)"
                strokeWidth={2}
                strokeDasharray="6 5"
              />
              <line
                x1={sx}
                y1={toScreenY(-1)}
                x2={sx}
                y2={SIZE_H + 20}
                stroke="var(--color-muted-foreground)"
                strokeWidth={2}
                strokeDasharray="6 5"
              />
              <line
                x1={sx}
                y1={toScreenY(1)}
                x2={sx}
                y2={toScreenY(-1)}
                stroke="var(--color-foreground)"
                strokeWidth={2.5}
              />
              {/* Hatch marks along the charged surface. */}
              {markerOffsets.map((offset, i) => {
                const sy = toScreenY(offset);
                return (
                  <line
                    key={`hatch-${plateRatio}-${i}`}
                    x1={sx - 6}
                    y1={sy + 6}
                    x2={sx}
                    y2={sy}
                    stroke="var(--color-muted-foreground)"
                    strokeWidth={1}
                  />
                );
              })}
              {markerOffsets.map((offset, i) => {
                const sy = toScreenY(offset);
                return (
                  <g key={`marker-${plateRatio}-${i}`}>
                    <circle cx={sx} cy={sy} r={4} fill={plateColor} />
                    <text
                      x={sx}
                      y={sy}
                      fontSize={7}
                      fill="white"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {plateIsPositive ? "+" : "−"}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {!isParallel && (
          <text x={CENTER_X + 10} y={16} fontSize={11} fill="var(--color-muted-foreground)">
            extends infinitely
          </text>
        )}

        {showFieldVectors &&
          arrowRows.map((rowOffset) => {
            const sy = toScreenY(rowOffset);
            const sampleXs = isParallel ? [0] : [-1, 1];
            return sampleXs.map((sampleRatio) => {
              const mag = fieldMagnitude(sampleRatio, configuration);
              if (mag <= 0) return null;
              const dir = fieldDirection(sampleRatio, configuration, chargeSign);
              const sx = toScreenX(sampleRatio);
              const len = mag * ARROW_LEN;
              const tipX = sx + dir * len;
              return (
                <line
                  key={`${rowOffset}-${sampleRatio}`}
                  x1={sx}
                  y1={sy}
                  x2={tipX}
                  y2={sy}
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  markerEnd="url(#plane-field-arrowhead)"
                />
              );
            });
          })}

        {isParallel && showFieldVectors && (
          <text x={toScreenX(1.1)} y={CENTER_Y} fontSize={10} fill="var(--color-muted-foreground)">
            E = 0
          </text>
        )}

        {/* Observation point marker + guide line. */}
        <line
          x1={observerScreenX}
          y1={toScreenY(1.05)}
          x2={observerScreenX}
          y2={toScreenY(-1.05)}
          stroke="var(--color-muted-foreground)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <circle
          cx={observerScreenX}
          cy={CENTER_Y}
          r={6}
          fill="var(--color-background)"
          stroke="var(--color-foreground)"
          strokeWidth={2}
        />
      </svg>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          {region === "surface" && "At the surface"}
          {region === "field" && "In the field region"}
          {region === "between" && "Between the plates"}
          {region === "outside" && "Outside the plates"}
          {" "}
          <span className="font-normal text-muted-foreground">
            (x = {x.toFixed(2)}, |E| = {magnitudeHere.toFixed(2)})
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {regionCaption(region, configuration)}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={sliderId} className="text-xs font-medium">
          Observation position x
        </label>
        <input
          id={sliderId}
          type="range"
          min={-MAX_RATIO}
          max={MAX_RATIO}
          step={0.01}
          value={x}
          onChange={(event) => setX(Number(event.target.value))}
          aria-valuetext={`x = ${x.toFixed(2)}, ${region === "between" ? "between the plates" : region === "outside" ? "outside the plates" : region}`}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-md bg-muted px-3 py-2">
          <Equation latex={fieldEquationLatex(configuration, region)} display />
        </div>
        <div className="rounded-md bg-muted px-3 py-2">
          <Equation latex={potentialEquationLatex()} display />
        </div>
      </div>

      {showPotentialPlot && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium">Potential V(x)</p>
          <svg
            viewBox="0 0 100 44"
            role="img"
            aria-label="Plot of potential versus position along the axis perpendicular to the plane"
            className="h-20 w-full max-w-xs"
          >
            <line x1={0} y1={40} x2={100} y2={40} stroke="var(--color-border)" strokeWidth={0.5} />
            <line
              x1={50}
              y1={4}
              x2={50}
              y2={40}
              stroke="var(--color-muted-foreground)"
              strokeDasharray="2 2"
              strokeWidth={0.5}
            />
            <polyline
              points={potentialCurve}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={1.5}
            />
            <circle
              cx={((x + MAX_RATIO) / (2 * MAX_RATIO)) * 100}
              cy={currentPotentialY}
              r={2.5}
              fill="var(--color-primary)"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
