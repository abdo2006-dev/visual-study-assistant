"use client";

import { useId, useMemo, useState } from "react";

import { Equation } from "@/components/equations/equation";
import type { LongChargedWireParams } from "@/lib/schema/templates/longChargedWire";

import {
  fieldArrowAngles,
  fieldEquationLatex,
  generateChargeMarkerPositions,
  getRegion,
  normalizedFieldMagnitude,
  normalizedPotential,
  potentialEquationLatex,
  regionCaption,
} from "./long-charged-wire-physics";

const SIZE = 440;
const CENTER = SIZE / 2;
const R_PX = 100;
const MAX_RATIO = 2;
const MAX_ARROW_LENGTH = 32;
const CHARGE_MARKER_COUNT = 36;
const OBSERVATION_ANGLE = -Math.PI / 2; // straight up
const POTENTIAL_MIN = -1;
const POTENTIAL_MAX = 1.5;

function polar(ratio: number, angle = OBSERVATION_ANGLE) {
  return {
    x: CENTER + Math.cos(angle) * ratio * R_PX,
    y: CENTER + Math.sin(angle) * ratio * R_PX,
  };
}

export function LongChargedWire({
  parameters,
}: {
  parameters: LongChargedWireParams;
}) {
  const {
    wireType,
    chargeSign,
    showGaussianSurface,
    showFieldVectors,
    showPotentialPlot,
    initialObservationRadiusRatio,
  } = parameters;

  const [ratio, setRatio] = useState(initialObservationRadiusRatio);
  const sliderId = useId();
  const region = getRegion(ratio);
  const isPositive = chargeSign === "positive";

  const chargeMarkers = useMemo(
    () => generateChargeMarkerPositions(CHARGE_MARKER_COUNT, wireType),
    [wireType]
  );
  const arrowAngles = useMemo(() => fieldArrowAngles(8), []);

  const observationPoint = polar(ratio);
  const rPx = ratio * R_PX;
  const fieldMagnitude = normalizedFieldMagnitude(ratio, wireType);

  const chargeColor = isPositive ? "#ef4444" : "#3b82f6";

  const potentialCurve = useMemo(() => {
    const points: string[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const r = (i / steps) * MAX_RATIO;
      const v = normalizedPotential(r, wireType);
      const clamped = Math.min(POTENTIAL_MAX, Math.max(POTENTIAL_MIN, v));
      const y = 40 - ((clamped - POTENTIAL_MIN) / (POTENTIAL_MAX - POTENTIAL_MIN)) * 36;
      points.push(`${(r / MAX_RATIO) * 100},${y}`);
    }
    return points.join(" ");
  }, [wireType]);

  const currentPotentialY = useMemo(() => {
    const v = normalizedPotential(ratio, wireType);
    const clamped = Math.min(POTENTIAL_MAX, Math.max(POTENTIAL_MIN, v));
    return 40 - ((clamped - POTENTIAL_MIN) / (POTENTIAL_MAX - POTENTIAL_MIN)) * 36;
  }, [ratio, wireType]);

  const zeroPotentialY =
    40 - ((0 - POTENTIAL_MIN) / (POTENTIAL_MAX - POTENTIAL_MIN)) * 36;

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-4">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Cross-section of an infinitely long ${wireType === "conducting-shell" ? "charged conducting cylindrical shell" : "uniformly charged solid cylindrical wire"}, observation point currently ${region} the wire at r = ${ratio.toFixed(2)}R`}
        className="w-full max-w-md self-center"
      >
        <defs>
          <marker
            id="wire-field-arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-primary)" />
          </marker>
        </defs>

        {/* Dashed lines past the top/bottom frame edge signal the wire's infinite length. */}
        <line
          x1={CENTER}
          y1={CENTER - R_PX}
          x2={CENTER}
          y2={-20}
          stroke="var(--color-muted-foreground)"
          strokeWidth={2}
          strokeDasharray="6 5"
        />
        <line
          x1={CENTER}
          y1={CENTER + R_PX}
          x2={CENTER}
          y2={SIZE + 20}
          stroke="var(--color-muted-foreground)"
          strokeWidth={2}
          strokeDasharray="6 5"
        />
        <text
          x={CENTER + 8}
          y={16}
          fontSize={11}
          fill="var(--color-muted-foreground)"
        >
          extends infinitely
        </text>

        {wireType === "solid-insulator" ? (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={R_PX}
            fill="var(--color-primary)"
            fillOpacity={0.06}
            stroke="var(--color-foreground)"
            strokeWidth={2}
          />
        ) : (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={R_PX}
            fill="none"
            stroke="var(--color-foreground)"
            strokeWidth={2}
          />
        )}

        {chargeMarkers.map((point, i) => {
          const x = CENTER + point.x * R_PX;
          const y = CENTER + point.y * R_PX;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={4} fill={chargeColor} />
              <text
                x={x}
                y={y}
                fontSize={7}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {isPositive ? "+" : "−"}
              </text>
            </g>
          );
        })}

        <line
          x1={CENTER}
          y1={CENTER}
          x2={CENTER}
          y2={CENTER - R_PX}
          stroke="var(--color-muted-foreground)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <text
          x={CENTER + 6}
          y={CENTER - R_PX / 2}
          fontSize={12}
          fill="var(--color-muted-foreground)"
        >
          R
        </text>
        <circle cx={CENTER} cy={CENTER} r={3} fill="var(--color-foreground)" />

        {showGaussianSurface && ratio > 0.05 && (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={rPx}
            fill="none"
            stroke="var(--color-muted-foreground)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {showFieldVectors && ratio > 0.03 && fieldMagnitude > 0.01 && (
          <g>
            {arrowAngles.map((angle) => {
              const arrowLength = fieldMagnitude * MAX_ARROW_LENGTH;
              const baseR = rPx;
              const tipR = isPositive ? rPx + arrowLength : rPx - arrowLength;
              const base = polar(baseR / R_PX, angle);
              const tip = polar(tipR / R_PX, angle);
              return (
                <line
                  key={angle}
                  x1={base.x}
                  y1={base.y}
                  x2={tip.x}
                  y2={tip.y}
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  markerEnd="url(#wire-field-arrowhead)"
                />
              );
            })}
          </g>
        )}

        <circle
          cx={observationPoint.x}
          cy={observationPoint.y}
          r={6}
          fill="var(--color-background)"
          stroke="var(--color-foreground)"
          strokeWidth={2}
        />
      </svg>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          {region === "inside" && "Inside the wire"}
          {region === "surface" && "At the surface"}
          {region === "outside" && "Outside the wire"}
          {" "}
          <span className="font-normal text-muted-foreground">
            (r = {ratio.toFixed(2)}R)
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {regionCaption(region, wireType)}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={sliderId} className="text-xs font-medium">
          Observation radius r
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={MAX_RATIO}
          step={0.01}
          value={ratio}
          onChange={(event) => setRatio(Number(event.target.value))}
          aria-valuetext={`r = ${ratio.toFixed(2)} R, ${region} the wire`}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-md bg-muted px-3 py-2">
          <Equation latex={fieldEquationLatex(region, wireType)} display />
        </div>
        <div className="rounded-md bg-muted px-3 py-2">
          <Equation latex={potentialEquationLatex(region, wireType)} display />
        </div>
      </div>

      {showPotentialPlot && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium">Potential V(r)</p>
          <svg
            viewBox="0 0 100 44"
            role="img"
            aria-label="Plot of potential versus radius, normalized so the surface potential equals 1; note the potential goes negative at large r since it diverges logarithmically for an infinite wire"
            className="h-20 w-full max-w-xs"
          >
            <line x1={0} y1={40} x2={100} y2={40} stroke="var(--color-border)" strokeWidth={0.5} />
            <line
              x1={0}
              y1={zeroPotentialY}
              x2={100}
              y2={zeroPotentialY}
              stroke="var(--color-border)"
              strokeDasharray="2 2"
              strokeWidth={0.5}
            />
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
              cx={(ratio / MAX_RATIO) * 100}
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
