"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ParticleContainerParams } from "@/lib/schema/templates/particleContainer";

import {
  countBySide,
  initializeParticles,
  stepParticles,
} from "./particle-container-physics";

const WIDTH = 320;
const HEIGHT = 200;
const STEPS_PER_FRAME = 2;

export function ParticleContainer({
  parameters,
}: {
  parameters: ParticleContainerParams;
}) {
  const {
    membranePresent,
    membranePermeable,
    initialConcentrationLeft,
    initialConcentrationRight,
    particleCount,
    animate,
  } = parameters;

  const [particles, setParticles] = useState(() =>
    initializeParticles(
      particleCount,
      initialConcentrationLeft,
      initialConcentrationRight,
      membranePresent
    )
  );
  const [playing, setPlaying] = useState(animate);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;

    function tick() {
      setParticles((prev) => {
        let next = prev;
        for (let i = 0; i < STEPS_PER_FRAME; i++) {
          next = stepParticles(next, membranePresent, membranePermeable);
        }
        return next;
      });
      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [playing, membranePresent, membranePermeable]);

  const counts = countBySide(particles);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Particle diffusion</p>
        <Button size="sm" variant="outline" onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "Play"}
        </Button>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Container with ${particleCount} particles${membranePresent ? (membranePermeable ? ", divided by a permeable membrane" : ", divided by an impermeable membrane") : ""}`}
        className="w-full max-w-sm self-center"
      >
        <rect
          x={1}
          y={1}
          width={WIDTH - 2}
          height={HEIGHT - 2}
          fill="none"
          stroke="var(--color-foreground)"
          strokeWidth={2}
        />
        {membranePresent && (
          <line
            x1={WIDTH / 2}
            y1={0}
            x2={WIDTH / 2}
            y2={HEIGHT}
            stroke="var(--color-muted-foreground)"
            strokeWidth={2}
            strokeDasharray={membranePermeable ? "4 4" : undefined}
          />
        )}
        {particles.map((p, i) => (
          <circle
            key={i}
            cx={p.x * WIDTH}
            cy={p.y * HEIGHT}
            r={3}
            fill="var(--color-primary)"
          />
        ))}
      </svg>

      {membranePresent && (
        <p className="text-xs text-muted-foreground">
          Left: {counts.left} · Right: {counts.right}
        </p>
      )}
    </div>
  );
}
