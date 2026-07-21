"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ProcessFlowDiagramParams } from "@/lib/schema/templates/processFlowDiagram";

import { computePrimaryPath, computeProcessFlowLayout } from "./process-flow-layout";

const WIDTH = 480;
const HEIGHT = 260;
const NODE_WIDTH = 110;
const NODE_HEIGHT = 44;
const STEP_INTERVAL_MS = 1200;

export function ProcessFlowDiagram({
  parameters,
}: {
  parameters: ProcessFlowDiagramParams;
}) {
  const { stages, animateProgression } = parameters;
  const { nodes, edges } = computeProcessFlowLayout(stages);
  const primaryPath = computePrimaryPath(stages);
  const markerId = useId();

  const [playing, setPlaying] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) return;
    timerRef.current = setInterval(() => {
      setStepIndex((i) => {
        if (i + 1 >= primaryPath.length) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, STEP_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, primaryPath.length]);

  const activeId = primaryPath[stepIndex];
  const activeIndexInPath = stepIndex;

  function toPixel(node: { x: number; y: number }) {
    return {
      x: node.x * (WIDTH - NODE_WIDTH) + NODE_WIDTH / 2,
      y: node.y * (HEIGHT - NODE_HEIGHT) + NODE_HEIGHT / 2,
    };
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Process flow</p>
        {animateProgression && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (stepIndex + 1 >= primaryPath.length) setStepIndex(0);
                setPlaying((p) => !p);
              }}
            >
              {playing ? "Pause" : "Play"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPlaying(false);
                setStepIndex((i) => (i + 1) % Math.max(primaryPath.length, 1));
              }}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Process flow diagram with ${stages.length} stages`}
        className="w-full max-w-lg self-center"
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
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-muted-foreground)" />
          </marker>
        </defs>

        {edges.map((edge) => {
          const from = nodeById.get(edge.from);
          const to = nodeById.get(edge.to);
          if (!from || !to) return null;
          const fromPx = toPixel(from);
          const toPx = toPixel(to);
          const isActiveEdge =
            animateProgression &&
            primaryPath[activeIndexInPath - 1] === edge.from &&
            primaryPath[activeIndexInPath] === edge.to;
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={fromPx.x}
              y1={fromPx.y + NODE_HEIGHT / 2}
              x2={toPx.x}
              y2={toPx.y - NODE_HEIGHT / 2}
              stroke={isActiveEdge ? "var(--color-primary)" : "var(--color-muted-foreground)"}
              strokeWidth={isActiveEdge ? 2.5 : 1.5}
              markerEnd={`url(#${markerId}-arrow)`}
            />
          );
        })}

        {nodes.map((node) => {
          const { x, y } = toPixel(node);
          const isActive = animateProgression && node.id === activeId;
          return (
            <g key={node.id}>
              <rect
                x={x - NODE_WIDTH / 2}
                y={y - NODE_HEIGHT / 2}
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                fill={isActive ? "var(--color-primary)" : "var(--color-muted)"}
                stroke="var(--color-border)"
              />
              <text
                x={x}
                y={y}
                fontSize={13}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isActive ? "var(--color-primary-foreground)" : "var(--color-foreground)"}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
