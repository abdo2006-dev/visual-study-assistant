"use client";

import { useId, useMemo, useState } from "react";

import { Equation } from "@/components/equations/equation";
import type { ElectricDipoleParams } from "@/lib/schema/templates/electricDipole";

import {
  dipoleMomentEquationLatex,
  generateDipoleFieldLines,
  potentialEnergyEquationLatex,
  potentialEnergyNormalized,
  torqueEquationLatex,
  torqueMagnitudeNormalized,
} from "./electric-dipole-physics";

const SIZE = 440;
const CENTER = SIZE / 2;
const D_PX = 65; // half the charge separation, in px
const FIELD_LINE_COUNT = 7;
const FIELD_LINE_BULGE_PX = 55;
const TORQUE_R = 48;
const CHARGE_RADIUS = 10;

const PLUS_COLOR = "#ef4444";
const MINUS_COLOR = "#3b82f6";

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function ElectricDipole({ parameters }: { parameters: ElectricDipoleParams }) {
  const {
    showFieldLines,
    showExternalField,
    showTorqueVector,
    showPotentialEnergyPlot,
    initialAngleDegrees,
  } = parameters;

  const [theta, setTheta] = useState(initialAngleDegrees);
  const sliderId = useId();

  const torque = torqueMagnitudeNormalized(theta);
  const potentialEnergy = potentialEnergyNormalized(theta);
  const fieldLines = useMemo(() => generateDipoleFieldLines(FIELD_LINE_COUNT), []);

  const plusPoint = { x: CENTER + D_PX, y: CENTER };
  const minusPoint = { x: CENTER - D_PX, y: CENTER };

  const energyCurve = useMemo(() => {
    const points: string[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 180;
      const u = potentialEnergyNormalized(angle);
      const x = (angle / 180) * 100;
      const y = 22 - (u / 1) * 18;
      points.push(`${x},${y}`);
    }
    return points.join(" ");
  }, []);

  const currentEnergyPoint = {
    x: (theta / 180) * 100,
    y: 22 - (potentialEnergy / 1) * 18,
  };

  const showTorqueArrow = showTorqueVector && theta > 0.5 && theta < 179.5;

  // A fixed-sense arc (sweeping from the right side of the dipole, over the
  // top, to the left) illustrating that torque always rotates p to *decrease*
  // theta toward alignment with E.
  const torqueArcStart = {
    x: CENTER + Math.cos(degToRad(-30)) * TORQUE_R,
    y: CENTER + Math.sin(degToRad(-30)) * TORQUE_R,
  };
  const torqueArcEnd = {
    x: CENTER + Math.cos(degToRad(-150)) * TORQUE_R,
    y: CENTER + Math.sin(degToRad(-150)) * TORQUE_R,
  };

  const equilibriumLabel =
    theta < 0.5 ? "stable equilibrium (aligned with E)" : theta > 179.5 ? "unstable equilibrium (anti-aligned with E)" : null;

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-4">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Electric dipole at theta = ${theta.toFixed(0)} degrees from the external field E${equilibriumLabel ? `, at its ${equilibriumLabel}` : ""}`}
        className="w-full max-w-md self-center"
      >
        <defs>
          <marker
            id="dipole-arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-primary)" />
          </marker>
          <marker
            id="dipole-moment-arrowhead"
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--color-foreground)" />
          </marker>
          <marker
            id="torque-arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b" />
          </marker>
        </defs>

        {/* Uniform external field E, fixed in the screen frame, along +x. */}
        {showExternalField && (
          <g>
            {[CENTER - 130, CENTER - 65, CENTER, CENTER + 65, CENTER + 130].map((rowY) => (
              <line
                key={rowY}
                x1={30}
                y1={rowY}
                x2={90}
                y2={rowY}
                stroke="var(--color-muted-foreground)"
                strokeWidth={1.5}
                markerEnd="url(#dipole-arrowhead)"
              />
            ))}
            <text x={30} y={CENTER - 145} fontSize={12} fill="var(--color-muted-foreground)">
              E
            </text>
          </g>
        )}

        {/* The dipole assembly (charges, moment arrow, field lines) rotates by theta relative to E's fixed direction. */}
        <g transform={`rotate(${theta} ${CENTER} ${CENTER})`}>
          {showFieldLines &&
            fieldLines.map((line, i) => {
              const controlY = CENTER + line.controlOffset * FIELD_LINE_BULGE_PX;
              return (
                <path
                  key={i}
                  d={`M ${plusPoint.x},${plusPoint.y} Q ${CENTER},${controlY} ${minusPoint.x},${minusPoint.y}`}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                />
              );
            })}

          <line
            x1={minusPoint.x}
            y1={minusPoint.y}
            x2={plusPoint.x - CHARGE_RADIUS - 2}
            y2={plusPoint.y}
            stroke="var(--color-foreground)"
            strokeWidth={2.5}
            markerEnd="url(#dipole-moment-arrowhead)"
          />
          <text x={CENTER} y={CENTER - 14} fontSize={12} fill="var(--color-foreground)" textAnchor="middle">
            p
          </text>

          <circle cx={plusPoint.x} cy={plusPoint.y} r={CHARGE_RADIUS} fill={PLUS_COLOR} />
          <text x={plusPoint.x} y={plusPoint.y} fontSize={12} fill="white" textAnchor="middle" dominantBaseline="central">
            +
          </text>
          <circle cx={minusPoint.x} cy={minusPoint.y} r={CHARGE_RADIUS} fill={MINUS_COLOR} />
          <text x={minusPoint.x} y={minusPoint.y} fontSize={12} fill="white" textAnchor="middle" dominantBaseline="central">
            −
          </text>
        </g>

        {showTorqueArrow && (
          <path
            d={`M ${torqueArcStart.x},${torqueArcStart.y} A ${TORQUE_R},${TORQUE_R} 0 0 0 ${torqueArcEnd.x},${torqueArcEnd.y}`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
            markerEnd="url(#torque-arrowhead)"
          />
        )}
      </svg>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          theta = {theta.toFixed(0)}°{" "}
          {equilibriumLabel && (
            <span className="font-normal text-muted-foreground">({equilibriumLabel})</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {theta < 0.5
            ? "p is aligned with E: torque is zero and this is the stable equilibrium — any small rotation away from here creates a restoring torque back toward alignment."
            : theta > 179.5
            ? "p is anti-aligned with E: torque is zero here too, but this is the unstable equilibrium — the slightest nudge creates a torque that swings p all the way around toward alignment."
            : "The torque tau = pE sin(theta) always acts to rotate p toward alignment with E, decreasing theta — it peaks at theta = 90 degrees and vanishes at the two equilibria (0 and 180 degrees)."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={sliderId} className="text-xs font-medium">
          Angle theta between p and E
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={180}
          step={1}
          value={theta}
          onChange={(event) => setTheta(Number(event.target.value))}
          aria-valuetext={`theta = ${theta.toFixed(0)} degrees, torque = ${torque.toFixed(2)} pE, potential energy = ${potentialEnergy.toFixed(2)} pE`}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-md bg-muted px-3 py-2">
          <Equation latex={dipoleMomentEquationLatex} display />
        </div>
        <div className="rounded-md bg-muted px-3 py-2">
          <Equation latex={torqueEquationLatex} display />
        </div>
        <div className="rounded-md bg-muted px-3 py-2">
          <Equation latex={potentialEnergyEquationLatex} display />
        </div>
      </div>

      {showPotentialEnergyPlot && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium">Potential energy U/pE vs. theta</p>
          <svg
            viewBox="0 0 100 44"
            role="img"
            aria-label="Plot of normalized potential energy versus theta from 0 to 180 degrees"
            className="h-20 w-full max-w-xs"
          >
            <line x1={0} y1={22} x2={100} y2={22} stroke="var(--color-border)" strokeWidth={0.5} />
            <line
              x1={50}
              y1={4}
              x2={50}
              y2={40}
              stroke="var(--color-muted-foreground)"
              strokeDasharray="2 2"
              strokeWidth={0.5}
            />
            <polyline points={energyCurve} fill="none" stroke="var(--color-primary)" strokeWidth={1.5} />
            <circle cx={currentEnergyPoint.x} cy={currentEnergyPoint.y} r={2.5} fill="var(--color-primary)" />
          </svg>
        </div>
      )}
    </div>
  );
}
