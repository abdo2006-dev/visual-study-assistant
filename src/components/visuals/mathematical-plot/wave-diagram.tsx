"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { WaveDiagramParams } from "@/lib/schema/templates/waveDiagram";

import { nextPhase, sampleWave } from "./wave-diagram-math";

const SIZE_W = 420;
const SIZE_H = 200;
const PADDING = 20;
const X_MIN = 0;
const X_MAX = 4;

export function WaveDiagram({ parameters }: { parameters: WaveDiagramParams }) {
  const { amplitude, wavelength, initialPhase, propagationDirection, waveSpeed, animate } =
    parameters;

  const [phase, setPhase] = useState(initialPhase);
  const [playing, setPlaying] = useState(animate);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const sliderId = useId();

  useEffect(() => {
    if (!playing) {
      lastTimeRef.current = null;
      return;
    }

    function tick(time: number) {
      if (lastTimeRef.current !== null) {
        const dt = (time - lastTimeRef.current) / 1000;
        setPhase((p) => nextPhase(p, propagationDirection, waveSpeed, dt));
      }
      lastTimeRef.current = time;
      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [playing, propagationDirection, waveSpeed]);

  const plotWidth = SIZE_W - 2 * PADDING;
  const plotHeight = SIZE_H - 2 * PADDING;
  const midY = SIZE_H / 2;

  function toPx(x: number, y: number) {
    return {
      x: PADDING + ((x - X_MIN) / (X_MAX - X_MIN)) * plotWidth,
      y: midY - y * (plotHeight / 2),
    };
  }

  const samples = sampleWave(amplitude, wavelength, phase, X_MIN, X_MAX);
  const path = samples
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toPx(p.x, p.y).x},${toPx(p.x, p.y).y}`)
    .join(" ");

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Wave propagating {propagationDirection}
        </p>
        <Button size="sm" variant="outline" onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "Play"}
        </Button>
      </div>

      <svg
        viewBox={`0 0 ${SIZE_W} ${SIZE_H}`}
        role="img"
        aria-label={`Transverse wave with amplitude ${amplitude}, wavelength ${wavelength}, propagating ${propagationDirection}`}
        className="w-full max-w-lg self-center"
      >
        <line
          x1={PADDING}
          y1={midY}
          x2={SIZE_W - PADDING}
          y2={midY}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      </svg>

      {!playing && (
        <div className="flex flex-col gap-1">
          <label htmlFor={sliderId} className="text-xs font-medium">
            Phase
          </label>
          <input
            id={sliderId}
            type="range"
            min={0}
            max={2 * Math.PI}
            step={0.01}
            value={((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)}
            onChange={(event) => setPhase(Number(event.target.value))}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
