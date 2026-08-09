"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

type TubesApp = {
  dispose?: () => void;
  tubes?: {
    setColors: (c: string[]) => void;
    setLightsColors: (c: string[]) => void;
  };
};

export function TubesCursorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<TubesApp | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    // Deferred init works around the known "Computed radius is NaN" race in
    // threejs-components: the canvas must be laid out before the tubes are built.
    const timer = window.setTimeout(() => {
      import("threejs-components/build/cursors/tubes1.min.js")
        .then((mod) => {
          if (cancelled || !canvas) return;
          const factory = (mod as { default?: unknown }).default as (
            el: HTMLCanvasElement,
            opts: Record<string, unknown>
          ) => TubesApp;
          appRef.current = factory(canvas, {
            tubes: {
              colors: ["#101723", "#636974", "#d7dfe5"],
              lights: { intensity: 120, colors: ["#11cdef", "#b721ff", "#f4d03f"] },
            },
          });
        })
        .catch((err) => console.error("TubesCursor failed to load:", err));
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      appRef.current?.dispose?.();
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
