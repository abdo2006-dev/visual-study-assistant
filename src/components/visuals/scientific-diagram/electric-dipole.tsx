"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Equation } from "@/components/equations/equation";
import type { ElectricDipoleParams } from "@/lib/schema/templates/electricDipole";

import {
  axialFieldEquationLatex,
  axialFieldMagnitudeNormalized,
  dipoleAngularAcceleration,
  dipoleMomentEquationLatex,
  equatorialFieldEquationLatex,
  equatorialFieldMagnitudeNormalized,
  generateDipoleFieldLines,
  potentialEnergyEquationLatex,
  potentialEnergyNormalized,
  torqueEquationLatex,
  torqueMagnitudeNormalized,
  wrapToAngleBetweenRange,
} from "./electric-dipole-physics";

const SIMULATION_NUDGE_DEG_PER_SEC = 8;
const MAX_FRAME_DT_SEC = 0.05;
const NEAR_EQUILIBRIUM_DEG = 8;

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
  if (parameters.mode === "far-field-comparison") {
    return <FarFieldComparisonDiagram parameters={parameters} />;
  }
  return <TorqueInFieldDiagram parameters={parameters} />;
}

function TorqueInFieldDiagram({ parameters }: { parameters: ElectricDipoleParams }) {
  const {
    showFieldLines,
    showExternalField,
    showTorqueVector,
    showPotentialEnergyPlot,
    initialAngleDegrees,
  } = parameters;

  const [theta, setTheta] = useState(initialAngleDegrees);
  const [simulating, setSimulating] = useState(false);
  const angularVelocityRef = useRef(0);
  const sliderId = useId();

  useEffect(() => {
    if (!simulating) return;
    let frameId: number;
    let lastTimestamp: number | null = null;

    function step(timestamp: number) {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const dt = Math.min((timestamp - lastTimestamp) / 1000, MAX_FRAME_DT_SEC);
      lastTimestamp = timestamp;

      setTheta((current) => {
        const acceleration = dipoleAngularAcceleration(current, angularVelocityRef.current);
        angularVelocityRef.current += acceleration * dt;
        return current + angularVelocityRef.current * dt;
      });

      frameId = requestAnimationFrame(step);
    }

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [simulating]);

  function handleToggleSimulate() {
    if (simulating) {
      setSimulating(false);
      return;
    }
    // Right at an equilibrium, sin(theta) is exactly zero — no torque, so
    // nothing would ever move on its own (that's what makes it an
    // equilibrium) — and even close to one, the restoring torque starts out
    // so small that it'd take many real seconds to become visible at all. A
    // nudge whenever we're near either equilibrium is what "the slightest
    // disturbance" actually looks like, without an unhelpfully long wait.
    const wrapped = wrapToAngleBetweenRange(theta);
    if (wrapped < NEAR_EQUILIBRIUM_DEG || wrapped > 180 - NEAR_EQUILIBRIUM_DEG) {
      // Nudge in whichever direction the (tiny but nonzero) natural torque
      // already points, so it swings the short way toward theta=0 rather
      // than an arbitrary fixed direction that could send it the long way
      // around through the equilibrium it just left.
      const naturalAcceleration = dipoleAngularAcceleration(theta, 0);
      const nudgeSign = naturalAcceleration < 0 ? -1 : 1;
      angularVelocityRef.current = nudgeSign * SIMULATION_NUDGE_DEG_PER_SEC;
    }
    setSimulating(true);
  }

  function handleSliderChange(value: number) {
    setSimulating(false);
    angularVelocityRef.current = 0;
    setTheta(value);
  }

  // The raw `theta` state accumulates continuously while simulating (it can
  // go negative or past 180/360 mid-swing) so the dipole's SVG rotation and
  // the physics stay correct through a full crossing; `displayTheta` wraps
  // that back to the conventional 0-180 "angle between two vectors" used by
  // every label, equation, and the slider.
  const displayTheta = wrapToAngleBetweenRange(theta);
  const torque = torqueMagnitudeNormalized(displayTheta);
  const potentialEnergy = potentialEnergyNormalized(displayTheta);
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
    x: (displayTheta / 180) * 100,
    y: 22 - (potentialEnergy / 1) * 18,
  };

  const showTorqueArrow = showTorqueVector && displayTheta > 0.5 && displayTheta < 179.5;

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
    displayTheta < 0.5
      ? "stable equilibrium (aligned with E)"
      : displayTheta > 179.5
        ? "unstable equilibrium (anti-aligned with E)"
        : null;

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-4">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Electric dipole at theta = ${displayTheta.toFixed(0)} degrees from the external field E${equilibriumLabel ? `, at its ${equilibriumLabel}` : ""}${simulating ? ", currently simulating its motion" : ""}`}
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
          theta = {displayTheta.toFixed(0)}°{" "}
          {equilibriumLabel && (
            <span className="font-normal text-muted-foreground">({equilibriumLabel})</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {simulating
            ? "Simulating: the torque tau = pE sin(theta) is driving this rotation, with a touch of damping (like friction in a real system) so it settles at theta = 0 instead of swinging forever."
            : displayTheta < 0.5
              ? "p is aligned with E: torque is zero and this is the stable equilibrium — any small rotation away from here creates a restoring torque back toward alignment."
              : displayTheta > 179.5
                ? "p is anti-aligned with E: torque is zero here too, but this is the unstable equilibrium — the slightest nudge creates a torque that swings p all the way around toward alignment. Try \"Simulate\" to see it happen."
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
          value={displayTheta}
          onChange={(event) => handleSliderChange(Number(event.target.value))}
          disabled={simulating}
          aria-valuetext={`theta = ${displayTheta.toFixed(0)} degrees, torque = ${torque.toFixed(2)} pE, potential energy = ${potentialEnergy.toFixed(2)} pE`}
          className="w-full disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Button variant="outline" size="sm" className="self-start" onClick={handleToggleSimulate}>
          {simulating ? "Pause" : "Simulate"}
        </Button>
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

const FAR_FIELD_UNIT_PX = 55; // pixels per unit distanceRatio, for observation-point placement
const FAR_FIELD_MAX_ARROW_PX = 70;

function FarFieldComparisonDiagram({ parameters }: { parameters: ElectricDipoleParams }) {
  const { initialDistanceRatio } = parameters;
  const [ratio, setRatio] = useState(initialDistanceRatio);
  const sliderId = useId();

  const axialMagnitude = axialFieldMagnitudeNormalized(ratio);
  const equatorialMagnitude = equatorialFieldMagnitudeNormalized(ratio);
  // Scale both arrows by the same factor so their 2:1 ratio stays visible
  // at any slider position, rather than one saturating the drawing area.
  const arrowScale = FAR_FIELD_MAX_ARROW_PX / axialFieldMagnitudeNormalized(1.5);

  const plusPoint = { x: CENTER + D_PX, y: CENTER };
  const minusPoint = { x: CENTER - D_PX, y: CENTER };

  const axialPoint = { x: CENTER + ratio * FAR_FIELD_UNIT_PX, y: CENTER };
  const equatorialPoint = { x: CENTER, y: CENTER - ratio * FAR_FIELD_UNIT_PX };

  const axialArrowLength = axialMagnitude * arrowScale;
  const equatorialArrowLength = equatorialMagnitude * arrowScale;

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-4">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Electric dipole far field at distance ratio ${ratio.toFixed(1)}: axial field ${axialMagnitude.toFixed(2)} (in units of kp), equatorial field ${equatorialMagnitude.toFixed(2)}, axial pointing along the dipole moment and equatorial pointing opposite to it`}
        className="w-full max-w-md self-center"
      >
        <defs>
          <marker id="axial-arrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--color-primary)" />
          </marker>
          <marker id="equatorial-arrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#f59e0b" />
          </marker>
          <marker id="ff-dipole-moment-arrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--color-foreground)" />
          </marker>
        </defs>

        <line
          x1={minusPoint.x}
          y1={minusPoint.y}
          x2={plusPoint.x - CHARGE_RADIUS - 2}
          y2={plusPoint.y}
          stroke="var(--color-foreground)"
          strokeWidth={2.5}
          markerEnd="url(#ff-dipole-moment-arrowhead)"
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

        {/* Dashed guide lines from the dipole to each observation point. */}
        <line
          x1={CENTER}
          y1={CENTER}
          x2={axialPoint.x}
          y2={axialPoint.y}
          stroke="var(--color-border)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <line
          x1={CENTER}
          y1={CENTER}
          x2={equatorialPoint.x}
          y2={equatorialPoint.y}
          stroke="var(--color-border)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />

        {/* Axial field vector: points along +p (same direction as the dipole moment). */}
        <line
          x1={axialPoint.x}
          y1={axialPoint.y}
          x2={axialPoint.x + axialArrowLength}
          y2={axialPoint.y}
          stroke="var(--color-primary)"
          strokeWidth={2.5}
          markerEnd="url(#axial-arrowhead)"
        />
        <circle cx={axialPoint.x} cy={axialPoint.y} r={4} fill="var(--color-primary)" />
        <text x={axialPoint.x} y={axialPoint.y + 18} fontSize={11} fill="var(--color-primary)" textAnchor="middle">
          Axial point
        </text>

        {/* Equatorial field vector: points opposite p, i.e. in -x. */}
        <line
          x1={equatorialPoint.x}
          y1={equatorialPoint.y}
          x2={equatorialPoint.x - equatorialArrowLength}
          y2={equatorialPoint.y}
          stroke="#f59e0b"
          strokeWidth={2.5}
          markerEnd="url(#equatorial-arrowhead)"
        />
        <circle cx={equatorialPoint.x} cy={equatorialPoint.y} r={4} fill="#f59e0b" />
        <text x={equatorialPoint.x + 60} y={equatorialPoint.y + 4} fontSize={11} fill="#f59e0b" textAnchor="middle">
          Equatorial point
        </text>
      </svg>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          Distance ratio r/d = {ratio.toFixed(1)}
        </p>
        <p className="text-xs text-muted-foreground">
          At the same far distance, the axial field is exactly twice the
          equatorial field&apos;s magnitude — and they point in opposite
          directions relative to p: axial points the same way as p,
          equatorial points opposite. Both fall off as 1/r³ at the same
          rate, so their 2:1 ratio holds at any distance (try the slider).
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={sliderId} className="text-xs font-medium">
          Observation distance ratio r/d
        </label>
        <input
          id={sliderId}
          type="range"
          min={1.5}
          max={5}
          step={0.1}
          value={ratio}
          onChange={(event) => setRatio(Number(event.target.value))}
          aria-valuetext={`r/d = ${ratio.toFixed(1)}, axial field ${axialMagnitude.toFixed(2)} kp over r cubed, equatorial field ${equatorialMagnitude.toFixed(2)} kp over r cubed`}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-md bg-muted px-3 py-2">
          <Equation latex={dipoleMomentEquationLatex} display />
        </div>
        <div className="rounded-md bg-muted px-3 py-2">
          <Equation latex={axialFieldEquationLatex} display />
        </div>
        <div className="rounded-md bg-muted px-3 py-2">
          <Equation latex={equatorialFieldEquationLatex} display />
        </div>
      </div>
    </div>
  );
}
