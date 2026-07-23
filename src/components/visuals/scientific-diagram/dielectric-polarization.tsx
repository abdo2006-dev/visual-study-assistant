"use client";

import { useId, useMemo, useState } from "react";

import { Equation } from "@/components/equations/equation";
import type { DielectricPolarizationParams } from "@/lib/schema/templates/dielectricPolarization";

const WIDTH = 460;
const HEIGHT = 320;
const SLAB_X = 88;
const SLAB_Y = 54;
const SLAB_W = 284;
const SLAB_H = 174;
const MOLECULE_COLS = 4;
const MOLECULE_ROWS = 3;

const EXTERNAL_COLOR = "#2563eb";
const OPPOSING_COLOR = "#f59e0b";
const PLUS_COLOR = "#ef4444";
const MINUS_COLOR = "#3b82f6";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function DielectricPolarization({
  parameters,
}: {
  parameters: DielectricPolarizationParams;
}) {
  const sliderId = useId();
  const [alignment, setAlignment] = useState(parameters.initialAlignment);
  const normalizedAlignment = clamp01(alignment);
  const boundChargeOpacity = parameters.showBoundSurfaceCharge
    ? lerp(0.22, 0.95, normalizedAlignment)
    : 0;
  const opposingFieldOpacity = parameters.showOpposingField
    ? lerp(0.22, 0.95, normalizedAlignment)
    : 0;

  const molecules = useMemo(() => {
    const items: Array<{ x: number; y: number; baseAngle: number }> = [];
    for (let row = 0; row < MOLECULE_ROWS; row++) {
      for (let col = 0; col < MOLECULE_COLS; col++) {
        items.push({
          x: SLAB_X + 54 + col * 58,
          y: SLAB_Y + 42 + row * 48,
          baseAngle: [-48, 32, -24, 55, 18, -62, 43, -36, 58, -14, 25, -52][
            row * MOLECULE_COLS + col
          ],
        });
      }
    }
    return items;
  }, []);

  const showInduced =
    parameters.materialKind === "induced" || parameters.materialKind === "mixed";
  const showPermanent =
    parameters.materialKind === "permanent" || parameters.materialKind === "mixed";
  const caption =
    parameters.materialKind === "induced"
      ? "External E slightly separates charge inside each molecule, creating induced dipoles."
      : parameters.materialKind === "permanent"
        ? "Permanent molecular dipoles rotate toward the external field but thermal motion keeps them imperfectly aligned."
        : "Some molecules develop induced dipoles while permanent dipoles reorient; both make bound charge on the surfaces.";

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-4">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Dielectric polarization diagram with molecular dipoles ${Math.round(normalizedAlignment * 100)} percent aligned with the external field, producing a weaker opposing internal field`}
        className="w-full max-w-md self-center"
      >
        <defs>
          <marker
            id="dielectric-external-arrow"
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L7,3.5 L0,7 Z" fill={EXTERNAL_COLOR} />
          </marker>
          <marker
            id="dielectric-opposing-arrow"
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L7,3.5 L0,7 Z" fill={OPPOSING_COLOR} />
          </marker>
        </defs>

        {parameters.showExternalField && (
          <g>
            {[84, 142, 200].map((y) => (
              <line
                key={y}
                x1={20}
                y1={y}
                x2={432}
                y2={y}
                stroke={EXTERNAL_COLOR}
                strokeWidth={2}
                strokeOpacity={0.38}
                markerEnd="url(#dielectric-external-arrow)"
              />
            ))}
            <text x={28} y={34} fontSize={13} fill={EXTERNAL_COLOR}>
              external E from free charge
            </text>
          </g>
        )}

        <rect
          x={SLAB_X}
          y={SLAB_Y}
          width={SLAB_W}
          height={SLAB_H}
          rx={8}
          fill="var(--color-primary)"
          fillOpacity={0.07}
          stroke="var(--color-foreground)"
          strokeWidth={2}
        />
        <text
          x={SLAB_X + SLAB_W / 2}
          y={SLAB_Y - 12}
          textAnchor="middle"
          fontSize={13}
          fill="var(--color-foreground)"
        >
          dielectric material
        </text>

        {parameters.showBoundSurfaceCharge && (
          <g opacity={boundChargeOpacity}>
            {Array.from({ length: 7 }, (_, i) => {
              const y = SLAB_Y + 18 + i * 23;
              return (
                <g key={y}>
                  <circle cx={SLAB_X + 12} cy={y} r={7} fill={MINUS_COLOR} />
                  <text
                    x={SLAB_X + 12}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={10}
                    fill="white"
                  >
                    -
                  </text>
                  <circle cx={SLAB_X + SLAB_W - 12} cy={y} r={7} fill={PLUS_COLOR} />
                  <text
                    x={SLAB_X + SLAB_W - 12}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={10}
                    fill="white"
                  >
                    +
                  </text>
                </g>
              );
            })}
            <text
              x={SLAB_X - 6}
              y={SLAB_Y + SLAB_H + 20}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-muted-foreground)"
            >
              bound -
            </text>
            <text
              x={SLAB_X + SLAB_W + 8}
              y={SLAB_Y + SLAB_H + 20}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-muted-foreground)"
            >
              bound +
            </text>
          </g>
        )}

        {molecules.map((molecule, index) => {
          const angle = showPermanent
            ? lerp(molecule.baseAngle, 0, normalizedAlignment)
            : 0;
          const separation = showInduced ? lerp(5, 16, normalizedAlignment) : 15;
          const label = showPermanent ? "p" : "induced p";
          return (
            <g
              key={`${molecule.x}-${molecule.y}`}
              transform={`translate(${molecule.x} ${molecule.y}) rotate(${angle})`}
            >
              <ellipse
                cx={0}
                cy={0}
                rx={24}
                ry={12}
                fill="var(--color-background)"
                stroke="var(--color-border)"
                strokeWidth={1.5}
              />
              <circle cx={-separation / 2} cy={0} r={6} fill={MINUS_COLOR} />
              <circle cx={separation / 2} cy={0} r={6} fill={PLUS_COLOR} />
              <line
                x1={-separation / 2 + 6}
                y1={0}
                x2={separation / 2 - 8}
                y2={0}
                stroke="var(--color-foreground)"
                strokeWidth={1.5}
                markerEnd="url(#dielectric-external-arrow)"
              />
              {index === 1 && (
                <text
                  x={0}
                  y={-17}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--color-muted-foreground)"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}

        {parameters.showOpposingField && (
          <g opacity={opposingFieldOpacity}>
            {[112, 172].map((y) => (
              <line
                key={y}
                x1={SLAB_X + SLAB_W - 38}
                y1={y}
                x2={SLAB_X + 44}
                y2={y}
                stroke={OPPOSING_COLOR}
                strokeWidth={3}
                markerEnd="url(#dielectric-opposing-arrow)"
              />
            ))}
            <text
              x={SLAB_X + SLAB_W / 2}
              y={SLAB_Y + SLAB_H - 12}
              textAnchor="middle"
              fontSize={12}
              fill={OPPOSING_COLOR}
            >
              polarization field opposes E
            </text>
          </g>
        )}

        <text x={68} y={282} fontSize={12} fill="var(--color-muted-foreground)">
          E_total = E_free - E_polarization
        </text>
      </svg>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{caption}</p>
        <p className="text-xs text-muted-foreground">
          The separated bound charge makes an internal field pointing opposite the original
          field, so the net field inside the dielectric is reduced, not reversed.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <label htmlFor={sliderId} className="text-xs font-medium text-muted-foreground">
          Polarization strength: {Math.round(normalizedAlignment * 100)}%
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={normalizedAlignment}
          onChange={(event) => setAlignment(Number(event.target.value))}
          className="w-full sm:w-44"
        />
      </div>

      <div className="rounded-md bg-muted/40 p-3">
        <Equation
          latex="\\vec E_{\\text{net}} = \\vec E_{\\text{free}} + \\vec E_{\\text{bound}},\\quad \\vec E_{\\text{bound}} \\text{ points opposite } \\vec E_{\\text{free}}"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Polarization reduces the field from the fixed free charge.
        </p>
      </div>
    </div>
  );
}
