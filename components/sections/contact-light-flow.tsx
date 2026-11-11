/**
 * Flowing light current for the contact form (run-10 RUN10-CONTACT —
 * replaces the run-9 ECG heartbeat trace): the form's living signature
 * moment is a wave of light that drifts across the form's head in real
 * time — a smooth sum of sines scrolling left, drawn with a soft glow
 * so it reads as light, not a monitor trace. Reduced motion: one static
 * settled wave, no loop (native hook — motion's useReducedMotion() is
 * unreliable in this app, run-9 iter 1).
 */
"use client";

import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Milliseconds per wave cycle (a calm 2s drift). */
export const LIGHTFLOW_CYCLE_MS = 2000;
/** Horizontal scroll speed of the wave, CSS px per second. */
export const LIGHTFLOW_PX_PER_SEC = 90;

/**
 * One light wave as a sum of sines over phase [0, 1): a slow swell,
 * a second harmonic for shape, and a faint third for shimmer. Bounded
 * by 1 in magnitude, smooth everywhere. Pure — unit-tested in
 * contact-light-flow.test.ts.
 */
export function lightFlowValue(phase: number): number {
  const p = ((phase % 1) + 1) % 1;
  const a = 2 * Math.PI * p;
  return (
    0.55 * Math.sin(a) + // the swell
    0.3 * Math.sin(2 * a) + // shape
    0.15 * Math.sin(3 * a) // shimmer
  );
}

export function ContactLightFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const accent =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--portfolio-accent")
        .trim() || "#7dd3fc";

    let raf = 0;
    let width = 0;
    let height = 0;

    const draw = (nowMs: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (w !== width || h !== height) {
        width = w;
        height = h;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const midY = height / 2;
      const amp = height * 0.36;
      // The wave: for each x, the phase at that moment in the
      // scrolling window (now at the right edge, older to the left).
      const path = () => {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 2) {
          const t = nowMs - ((width - x) / LIGHTFLOW_PX_PER_SEC) * 1000;
          const y = midY - lightFlowValue(t / LIGHTFLOW_CYCLE_MS) * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      };
      // Soft under-glow first, then the bright core — the trace reads
      // as light spilling across the head, not a hairline on a sheet.
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 5;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12;
      path();
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8;
      path();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    };

    if (reduceMotion) {
      // Static settled wave: a fixed moment at a gentle slope
      // (phase 0.25 at now = 500ms).
      draw(LIGHTFLOW_CYCLE_MS * 0.25);
      return;
    }
    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      data-contact-lightflow
      className="journey-contact-lightflow"
      aria-hidden="true"
    />
  );
}
