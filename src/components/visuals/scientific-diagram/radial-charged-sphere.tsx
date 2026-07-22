"use client";

import { useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Equation } from "@/components/equations/equation";
import { useAnimationFrame } from "@/hooks/useAnimationFrame";
import type { RadialChargedSphereParams } from "@/lib/schema/templates/radialChargedSphere";

import {
  fieldArrowAngles,
  fieldEquationLatex,
  generateChargeMarkerPositions,
  getRegion,
  normalizedFieldMagnitude,
  normalizedPotential,
  potentialEquationLatex,
  regionCaption,
} from "./radial-charged-sphere-physics";

const SIZE = 440;
const CENTER = SIZE / 2;
const R_PX = 100;
const MAX_RATIO = 2;
const MAX_ARROW_LENGTH = 32;
const CHARGE_MARKER_COUNT = 36;
const OBSERVATION_ANGLE = -Math.PI / 2; // straight up
const SWEEP_RATIO_PER_SEC = 0.4; // full 0→MAX_RATIO sweep takes ~5s

function polar(ratio: number, angle = OBSERVATION_ANGLE) {
  return {
    x: CENTER + Math.cos(angle) * ratio * R_PX,
    y: CENTER + Math.sin(angle) * ratio * R_PX,
  };
}

export function RadialChargedSphere({
  parameters,
}: {
  parameters: RadialChargedSphereParams;
}) {
  const {
    sphereType,
    chargeSign,
    showGaussianSurface,
    showFieldVectors,
    showIntegralPath,
    showPotentialPlot,
    initialObservationRadiusRatio,
  } = parameters;

  const [ratio, setRatio] = useState(initialObservationRadiusRatio);
  const [simulating, setSimulating] = useState(false);
  const sweepDirectionRef = useRef(1);
  const sliderId = useId();
  const region = getRegion(ratio);
  const isPositive = chargeSign === "positive";

  useAnimationFrame(simulating, (dt) => {
    setRatio((current) => {
      const next = current + sweepDirectionRef.current * SWEEP_RATIO_PER_SEC * dt;
      if (next >= MAX_RATIO) {
        sweepDirectionRef.current = -1;
        return MAX_RATIO;
      }
      if (next <= 0) {
        sweepDirectionRef.current = 1;
        return 0;
      }
      return next;
    });
  });

  function handleSliderChange(value: number) {
    setSimulating(false);
    setRatio(value);
  }

  const chargeMarkers = useMemo(
    () => generateChargeMarkerPositions(CHARGE_MARKER_COUNT, sphereType),
    [sphereType]
  );
  const arrowAngles = useMemo(() => fieldArrowAngles(8), []);

  const observationPoint = polar(ratio);
  const rPx = ratio * R_PX;
  const fieldMagnitude = normalizedFieldMagnitude(ratio, sphereType);

  const chargeColor = isPositive ? "#ef4444" : "#3b82f6";

  const potentialCurve = useMemo(() => {
    const points: string[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const r = (i / steps) * MAX_RATIO;
      const v = normalizedPotential(r, sphereType);
      points.push(`${(r / MAX_RATIO) * 100},${40 - (v / 1.5) * 36}`);
    }
    return points.join(" ");
  }, [sphereType]);

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-4">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Cross-section of a ${sphereType === "shell" ? "charged spherical shell" : "uniformly charged solid sphere"}, observation point currently ${region} the sphere at r = ${ratio.toFixed(2)}R`}
        className="w-full max-w-md self-center"
      >
        <defs>
          <marker
            id="field-arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-primary)" />
          </marker>
        </defs>

        {showIntegralPath && (
          <>
            <line
              x1={CENTER}
              y1={8}
              x2={CENTER}
              y2={CENTER - R_PX}
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 4"
              markerEnd="url(#field-arrowhead)"
            />
            <text x={CENTER + 8} y={20} fontSize={11} fill="#3b82f6">
              from infinity
            </text>
            {region === "inside" && (
              <line
                x1={CENTER}
                y1={CENTER - R_PX}
                x2={CENTER}
                y2={observationPoint.y}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 4"
                markerEnd="url(#field-arrowhead)"
              />
            )}
          </>
        )}

        {sphereType === "solid-insulator" ? (
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
                  markerEnd="url(#field-arrowhead)"
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
          {region === "inside" && "Inside the sphere"}
          {region === "surface" && "At the surface"}
          {region === "outside" && "Outside the sphere"}
          {" "}
          <span className="font-normal text-muted-foreground">
            (r = {ratio.toFixed(2)}R)
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {regionCaption(region, sphereType)}
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
          onChange={(event) => handleSliderChange(Number(event.target.value))}
          disabled={simulating}
          aria-valuetext={`r = ${ratio.toFixed(2)} R, ${region} the sphere`}
          className="w-full disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setSimulating((s) => !s)}
        >
          {simulating ? "Pause" : "Simulate"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-md bg-muted px-3 py-2">
          <Equation latex={fieldEquationLatex(region, sphereType)} display />
        </div>
        <div className="rounded-md bg-muted px-3 py-2">
          <Equation latex={potentialEquationLatex(region, sphereType)} display />
        </div>
      </div>

      {showPotentialPlot && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium">Potential V(r)</p>
          <svg
            viewBox="0 0 100 44"
            role="img"
            aria-label="Plot of potential versus radius, normalized so the surface potential equals 1"
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
              cx={(ratio / MAX_RATIO) * 100}
              cy={40 - (normalizedPotential(ratio, sphereType) / 1.5) * 36}
              r={2.5}
              fill="var(--color-primary)"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
