"use client";

import { useEffect, useRef } from "react";

const DEFAULT_MAX_DT_SECONDS = 0.05;

/**
 * Calls `onFrame(dtSeconds)` on every animation frame while `active` is
 * true — the shared rAF-loop pattern several visual templates each used to
 * reimplement inline. `onFrame` is read from a ref so callers don't need to
 * memoize it themselves; only `active` (and an optional `maxDtSeconds` cap,
 * to avoid one huge catch-up jump after a backgrounded tab regains focus)
 * restart the loop.
 */
export function useAnimationFrame(
  active: boolean,
  onFrame: (dtSeconds: number) => void,
  maxDtSeconds: number = DEFAULT_MAX_DT_SECONDS
): void {
  const onFrameRef = useRef(onFrame);
  useEffect(() => {
    onFrameRef.current = onFrame;
  });

  useEffect(() => {
    if (!active) return;
    let frameId: number;
    let lastTimestamp: number | null = null;

    function step(timestamp: number) {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const dt = Math.min((timestamp - lastTimestamp) / 1000, maxDtSeconds);
      lastTimestamp = timestamp;
      onFrameRef.current(dt);
      frameId = requestAnimationFrame(step);
    }

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [active, maxDtSeconds]);
}
