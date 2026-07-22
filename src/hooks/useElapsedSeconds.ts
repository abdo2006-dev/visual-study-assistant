"use client";

import { useEffect, useState } from "react";

/** Seconds elapsed since `active` became true; 0 whenever it's false. */
export function useElapsedSeconds(active: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  return active ? elapsed : 0;
}
