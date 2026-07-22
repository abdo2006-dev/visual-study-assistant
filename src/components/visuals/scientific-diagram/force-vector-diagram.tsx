"use client";

import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAnimationFrame } from "@/hooks/useAnimationFrame";
import type { ForceVectorDiagramParams } from "@/lib/schema/templates/forceVectorDiagram";

import {
  componentsToPolar,
  resultantComponents,
  stepParticleMotion,
  vectorComponents,
} from "./force-vector-diagram-math";

const SIZE = 400;
const CENTER = SIZE / 2;
const PX_PER_UNIT = 150;
// Scales the resultant (typically magnitude ≤ ~1, since each vector's own
// magnitude is capped at 1) up to a visually legible acceleration — there's
// no mass parameter in the schema to divide by, so this is a stylistic
// pacing choice, not a physical constant.
const ACCELERATION_SCALE = 2;
const RESET_DISTANCE_UNITS = 1.8;

function screenToSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const transformed = point.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
}

export function ForceVectorDiagram({
  parameters,
}: {
  parameters: ForceVectorDiagramParams;
}) {
  const { vectors: initialVectors, showResultant, allowDragging } = parameters;
  const [coordinateSystem, setCoordinateSystem] = useState(parameters.coordinateSystem);
  const [vectors, setVectors] = useState(initialVectors);
  const [simulating, setSimulating] = useState(false);
  const [motion, setMotion] = useState({ position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } });
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingIdRef = useRef<string | null>(null);
  const markerId = useId();

  const resultant = showResultant ? resultantComponents(vectors) : null;
  const resultantPolar = resultant ? componentsToPolar(resultant) : null;

  useAnimationFrame(simulating && !!resultant, (dt) => {
    setMotion((current) => {
      const next = stepParticleMotion(
        current,
        { x: (resultant?.x ?? 0) * ACCELERATION_SCALE, y: (resultant?.y ?? 0) * ACCELERATION_SCALE },
        dt
      );
      const distance = Math.hypot(next.position.x, next.position.y);
      if (distance > RESET_DISTANCE_UNITS) {
        return { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
      }
      return next;
    });
  });

  function handleToggleSimulate() {
    if (!simulating) {
      setMotion({ position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } });
    }
    setSimulating((s) => !s);
  }

  function handlePointerDown(id: string) {
    if (!allowDragging || simulating) return;
    draggingIdRef.current = id;
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const draggingId = draggingIdRef.current;
    if (!draggingId || !svgRef.current) return;
    const point = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    const dx = point.x - CENTER;
    const dy = point.y - CENTER;
    const magnitude = Math.max(
      0,
      Math.min(1, Math.sqrt(dx * dx + dy * dy) / PX_PER_UNIT)
    );
    const angleDegrees = (Math.atan2(-dy, dx) * 180) / Math.PI;
    const normalizedAngle = (angleDegrees + 360) % 360;

    setVectors((prev) =>
      prev.map((v) =>
        v.id === draggingId ? { ...v, magnitude, angleDegrees: normalizedAngle } : v
      )
    );
  }

  function handlePointerUp() {
    draggingIdRef.current = null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Force diagram</p>
        <div className="flex items-center gap-2">
          {showResultant && resultant && (
            <Button size="sm" variant="outline" onClick={handleToggleSimulate}>
              {simulating ? "Pause" : "Simulate"}
            </Button>
          )}
          <div className="flex overflow-hidden rounded-md border border-border text-xs">
            {(["cartesian", "polar"] as const).map((system) => (
              <button
                key={system}
                type="button"
                onClick={() => setCoordinateSystem(system)}
                className={`px-2 py-1 capitalize ${
                  coordinateSystem === system
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground"
                }`}
              >
                {system}
              </button>
            ))}
          </div>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Force vector diagram with ${vectors.length} vectors${showResultant ? " and their resultant" : ""}`}
        className="w-full max-w-md self-center touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
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
            <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
          </marker>
        </defs>

        {coordinateSystem === "cartesian" ? (
          <g stroke="var(--color-border)" strokeWidth={1}>
            <line x1={0} y1={CENTER} x2={SIZE} y2={CENTER} />
            <line x1={CENTER} y1={0} x2={CENTER} y2={SIZE} />
          </g>
        ) : (
          <g stroke="var(--color-border)" strokeWidth={1} fill="none">
            {[0.25, 0.5, 0.75, 1].map((r) => (
              <circle key={r} cx={CENTER} cy={CENTER} r={r * PX_PER_UNIT} />
            ))}
            {Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI).map((angle) => (
              <line
                key={angle}
                x1={CENTER - Math.cos(angle) * PX_PER_UNIT}
                y1={CENTER - Math.sin(angle) * PX_PER_UNIT}
                x2={CENTER + Math.cos(angle) * PX_PER_UNIT}
                y2={CENTER + Math.sin(angle) * PX_PER_UNIT}
              />
            ))}
          </g>
        )}

        {vectors.map((v) => {
          const { x, y } = vectorComponents(v);
          const tipX = CENTER + x * PX_PER_UNIT;
          const tipY = CENTER + y * PX_PER_UNIT;
          const color = v.color ?? "var(--color-primary)";
          return (
            <g key={v.id} style={{ color }}>
              <line
                x1={CENTER}
                y1={CENTER}
                x2={tipX}
                y2={tipY}
                stroke="currentColor"
                strokeWidth={3}
                markerEnd={`url(#${markerId}-arrow)`}
              />
              <text
                x={tipX + (x >= 0 ? 8 : -8)}
                y={tipY}
                fontSize={13}
                fill="currentColor"
                textAnchor={x >= 0 ? "start" : "end"}
              >
                {v.label}
              </text>
              {allowDragging && (
                <circle
                  cx={tipX}
                  cy={tipY}
                  r={10}
                  fill="transparent"
                  className="cursor-grab active:cursor-grabbing"
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    handlePointerDown(v.id);
                  }}
                />
              )}
            </g>
          );
        })}

        {resultant && (
          <line
            x1={CENTER}
            y1={CENTER}
            x2={CENTER + resultant.x * PX_PER_UNIT}
            y2={CENTER + resultant.y * PX_PER_UNIT}
            stroke="var(--color-foreground)"
            strokeWidth={3}
            strokeDasharray="6 4"
            markerEnd={`url(#${markerId}-arrow)`}
            style={{ color: "var(--color-foreground)" }}
          />
        )}

        {simulating && (
          <circle
            cx={CENTER + motion.position.x * PX_PER_UNIT}
            cy={CENTER + motion.position.y * PX_PER_UNIT}
            r={7}
            fill="var(--color-primary)"
          />
        )}
      </svg>

      {allowDragging && !simulating && (
        <p className="text-xs text-muted-foreground">
          Drag a vector&apos;s tip to change its magnitude and direction.
        </p>
      )}

      {simulating && (
        <p className="text-xs text-muted-foreground">
          Simulating: an object released at the center accelerates in the
          resultant&apos;s direction, by Newton&apos;s second law (F = ma) —
          it resets once it leaves the frame.
        </p>
      )}

      {resultantPolar && (
        <p className="text-sm">
          Resultant: magnitude {resultantPolar.magnitude.toFixed(2)}, direction{" "}
          {resultantPolar.angleDegrees.toFixed(0)}°
        </p>
      )}
    </div>
  );
}
